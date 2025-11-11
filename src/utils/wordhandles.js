import { ethers } from 'ethers';

let cachedWordlistPromise = null;

export function normalizeEthAddress(addr) {
  if (typeof addr !== 'string') {
    throw new Error('Address must be a string');
  }
  let normalized = addr.toLowerCase();
  if (!normalized.startsWith('0x')) {
    normalized = `0x${normalized}`;
  }
  if (normalized.length !== 42 || !/^0x[0-9a-f]{40}$/i.test(normalized)) {
    throw new Error('Invalid Ethereum address');
  }
  return normalized;
}

export async function loadWordlist() {
  if (!cachedWordlistPromise) {
    cachedWordlistPromise = fetch('/wordlists/bip39-english.txt')
      .then(async (resp) => {
        if (!resp.ok) {
          throw new Error('Failed to load wordlist');
        }
        const text = await resp.text();
        return text
          .split('\n')
          .map((w) => w.trim())
          .filter(Boolean);
      })
      .catch((error) => {
        cachedWordlistPromise = null;
        throw error;
      });
  }
  return cachedWordlistPromise;
}

function uint8ArrayForCounter(counter) {
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  view.setBigUint64(0, BigInt(counter));
  return new Uint8Array(buf);
}

function* prngBlocks(seedBytes) {
  let counter = 0;
  while (true) {
    const bytes = ethers.getBytes(
      ethers.sha256(ethers.concat([seedBytes, uint8ArrayForCounter(counter)]))
    );
    yield bytes;
    counter += 1;
  }
}

function* intsFromStream(seedBytes, mod) {
  if (mod <= 0) {
    throw new Error('mod must be positive');
  }
  for (const block of prngBlocks(seedBytes)) {
    for (let i = 0; i < block.length; i += 2) {
      const chunk = (block[i] << 8) | block[i + 1];
      yield chunk % mod;
    }
  }
}

export function encodeHandle(indices) {
  if (!indices || indices.length === 0 || indices.length > 255) {
    throw new Error('Handle length must be in 1..255');
  }
  const out = new Uint8Array(1 + indices.length * 2);
  out[0] = indices.length;
  let offset = 1;
  indices.forEach((idx) => {
    if (idx < 0 || idx > 0xffff) {
      throw new Error('Index out of range');
    }
    out[offset] = (idx >> 8) & 0xff;
    out[offset + 1] = idx & 0xff;
    offset += 2;
  });
  return out;
}

export function decodeHandle(encoded) {
  if (!encoded || encoded.length === 0) {
    return [];
  }
  const bytes = typeof encoded === 'string' ? ethers.getBytes(encoded) : ethers.getBytes(encoded);
  const L = bytes[0];
  if (bytes.length !== 1 + L * 2) {
    throw new Error('Invalid handle encoding');
  }
  const result = [];
  let offset = 1;
  for (let i = 0; i < L; i += 1) {
    result.push((bytes[offset] << 8) | bytes[offset + 1]);
    offset += 2;
  }
  return result;
}

export function formatHandle(indices, vocab, sep = '-') {
  return indices.map((idx) => vocab[idx]).join(sep);
}

export async function suggestHandleIndices({
  address,
  vocabSize,
  minLength = 1,
  maxLength = 4,
  isClaimed,
  seedSalt = 0
}) {
  const normalized = normalizeEthAddress(address);
  if (minLength < 1 || maxLength < minLength) {
    throw new Error('Invalid min/max length');
  }

  for (let length = minLength; length <= maxLength; length += 1) {
    const seedBytes = ethers.toUtf8Bytes(normalized);
    const saltBytes = ethers.toBeArray(BigInt(seedSalt), { length: 4 });
    const seed = ethers.concat([seedBytes, Uint8Array.from([length]), saltBytes]);
    const intsIterator = intsFromStream(seed, vocabSize);
    let attempt = 0;
    const cap = 200000;
    while (attempt < cap) {
      const indices = [];
      for (let i = 0; i < length; i += 1) {
        const next = intsIterator.next();
        if (next.done) {
          throw new Error('PRNG stream exhausted unexpectedly');
        }
        indices.push(next.value);
      }
      attempt += 1;
      const encoded = encodeHandle(indices);
      const taken = isClaimed ? await isClaimed(encoded) : false;
      if (!taken) {
        return indices;
      }
    }
  }
  throw new Error('No free handle found');
}

export async function suggestHandlePhrase({ address, minLength = 2, maxLength = 4, isClaimed }) {
  const vocab = await loadWordlist();
  const indices = await suggestHandleIndices({
    address,
    vocabSize: vocab.length,
    minLength,
    maxLength,
    isClaimed
  });
  return {
    indices,
    words: indices.map((idx) => vocab[idx]),
    phrase: formatHandle(indices, vocab),
    encoded: encodeHandle(indices)
  };
}

/**
 * Encryption utilities for private metadata
 * Uses the Web Crypto API for encryption/decryption
 */

/**
 * Generate a key pair for encryption
 * @returns {Promise<CryptoKeyPair>} Public/Private key pair
 */
export async function generateKeyPair() {
  return await window.crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Export public key to base64
 * @param {CryptoKey} publicKey - Public key to export
 * @returns {Promise<string>} Base64 encoded public key
 */
export async function exportPublicKey(publicKey) {
  const exported = await window.crypto.subtle.exportKey('spki', publicKey);
  return arrayBufferToBase64(exported);
}

/**
 * Import public key from base64
 * @param {string} base64Key - Base64 encoded public key
 * @returns {Promise<CryptoKey>} Imported public key
 */
export async function importPublicKey(base64Key) {
  const keyData = base64ToArrayBuffer(base64Key);
  return await window.crypto.subtle.importKey(
    'spki',
    keyData,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256',
    },
    true,
    ['encrypt']
  );
}

/**
 * Encrypt data with public key
 * @param {string} data - Data to encrypt
 * @param {CryptoKey} publicKey - Public key for encryption
 * @returns {Promise<string>} Encrypted data as base64
 */
export async function encryptData(data, publicKey) {
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(data);
  
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: 'RSA-OAEP'
    },
    publicKey,
    encodedData
  );
  
  return arrayBufferToBase64(encrypted);
}

/**
 * Decrypt data with private key
 * @param {string} encryptedData - Base64 encrypted data
 * @param {CryptoKey} privateKey - Private key for decryption
 * @returns {Promise<string>} Decrypted data
 */
export async function decryptData(encryptedData, privateKey) {
  const encrypted = base64ToArrayBuffer(encryptedData);
  
  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: 'RSA-OAEP'
    },
    privateKey,
    encrypted
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Convert ArrayBuffer to Base64
 * @param {ArrayBuffer} buffer - Buffer to convert
 * @returns {string} Base64 string
 */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chars = [];
  for (let i = 0; i < bytes.byteLength; i++) {
    chars.push(String.fromCharCode(bytes[i]));
  }
  return window.btoa(chars.join(''));
}

/**
 * Convert Base64 to ArrayBuffer
 * @param {string} base64 - Base64 string
 * @returns {ArrayBuffer} Array buffer
 */
function base64ToArrayBuffer(base64) {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

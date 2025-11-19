export const bip39VocabularyABI = [
  "function WORD_COUNT() view returns (uint16)",
  "function word(uint16 index) view returns (string)",
  "function words(uint16 offset, uint16 limit) view returns (string[] memory)",
  "function wordBytes(uint16 index) view returns (bytes32)"
];

export const bip39VocabularyBytecode = (import.meta.env.VITE_BIP39_VOCABULARY_BYTECODE || '').trim();

export function hasBip39VocabularyArtifact() {
  return typeof bip39VocabularyBytecode === 'string'
    && bip39VocabularyBytecode.startsWith('0x')
    && bip39VocabularyBytecode.length > 2;
}

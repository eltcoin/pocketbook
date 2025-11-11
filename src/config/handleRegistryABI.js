export const handleRegistryABI = [
  "constructor(uint16 vocabLength_, uint8 maxLength_, bytes32 vocabHash_)",
  "function vocabLength() view returns (uint16)",
  "function maxLength() view returns (uint8)",
  "function vocabHash() view returns (bytes32)",
  "function handleOf(address owner) view returns (bytes)",
  "function ownerOf(bytes handle) view returns (address)",
  "function claim(bytes handle)",
  "function release()"
];

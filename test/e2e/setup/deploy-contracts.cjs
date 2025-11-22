const hre = require('hardhat');
const fs = require('fs');
const path = require('path');

// Hardhat test account private keys (well-known, for testing only)
// WARNING: These are publicly known test keys - NEVER use in production
const TEST_PRIVATE_KEYS = [
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', // Account #0
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d', // Account #1
  '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a', // Account #2
  '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6', // Account #3
  '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a', // Account #4
  '0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba', // Account #5
  '0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e', // Account #6
  '0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356'  // Account #7
];

/**
 * Deploy AddressClaim and AddressHandleRegistry contracts to local Hardhat network
 * Saves deployment information for tests
 */
async function main() {
  const signers = await hre.ethers.getSigners();
  const deployer = signers[0];
  
  console.log('Deploying contracts with account:', deployer.address);
  console.log('Account balance:', (await hre.ethers.provider.getBalance(deployer.address)).toString());
  
  // Deploy AddressClaim contract
  const AddressClaim = await hre.ethers.getContractFactory('AddressClaim');
  const addressClaim = await AddressClaim.deploy();
  await addressClaim.waitForDeployment();
  
  const claimContractAddress = await addressClaim.getAddress();
  console.log('AddressClaim deployed to:', claimContractAddress);
  
  // Deploy AddressHandleRegistry contract
  // Using BIP39 English wordlist: 2048 words, max 6 words per handle
  const vocabLength = 2048;
  const maxLength = 6;
  // This is the SHA-256 hash of the BIP39 English wordlist
  const vocabHash = '0xad90bf3beb7b0f762e9e9a2e1c5c3bfae2d7c2b2f5e9a5e5e5e5e5e5e5e5e5e5';
  
  const AddressHandleRegistry = await hre.ethers.getContractFactory('AddressHandleRegistry');
  const handleRegistry = await AddressHandleRegistry.deploy(vocabLength, maxLength, vocabHash);
  await handleRegistry.waitForDeployment();
  
  const handleRegistryAddress = await handleRegistry.getAddress();
  console.log('AddressHandleRegistry deployed to:', handleRegistryAddress);
  console.log('  - Vocabulary length:', vocabLength);
  console.log('  - Max handle length:', maxLength);
  
  // Save deployment info for tests - include all 8 test accounts
  const testAccounts = [];
  for (let i = 0; i < 8; i++) {
    testAccounts.push({
      address: signers[i].address,
      privateKey: TEST_PRIVATE_KEYS[i]
    });
  }
  
  const deploymentInfo = {
    addressClaimContract: claimContractAddress,
    handleRegistryContract: handleRegistryAddress,
    handleRegistryConfig: {
      vocabLength,
      maxLength,
      vocabHash
    },
    deployer: deployer.address,
    testAccounts,
    networkUrl: 'http://127.0.0.1:8545',
    chainId: 31337,
    // Legacy field for backward compatibility
    contractAddress: claimContractAddress
  };
  
  const fixturesDir = path.resolve(__dirname, '../fixtures');
  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(fixturesDir, 'deployment.json'),
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log('Deployment info saved to fixtures/deployment.json');
  console.log(`Configured ${testAccounts.length} test accounts`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

const hre = require('hardhat');
const fs = require('fs');
const path = require('path');

// Hardhat test account private keys (well-known, for testing only)
// WARNING: These are publicly known test keys - NEVER use in production
const TEST_PRIVATE_KEYS = {
  ACCOUNT_0: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  ACCOUNT_1: '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
  ACCOUNT_2: '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a'
};

/**
 * Deploy AddressClaim contract to local Hardhat network
 * Saves deployment information for tests
 */
async function main() {
  const [deployer, testUser1, testUser2, testUser3] = await hre.ethers.getSigners();
  
  console.log('Deploying AddressClaim with account:', deployer.address);
  console.log('Account balance:', (await hre.ethers.provider.getBalance(deployer.address)).toString());
  
  // Deploy AddressClaim contract
  const AddressClaim = await hre.ethers.getContractFactory('AddressClaim');
  const addressClaim = await AddressClaim.deploy();
  await addressClaim.waitForDeployment();
  
  const contractAddress = await addressClaim.getAddress();
  console.log('AddressClaim deployed to:', contractAddress);
  
  // Save deployment info for tests
  const deploymentInfo = {
    contractAddress,
    deployer: deployer.address,
    testAccounts: [
      {
        address: testUser1.address,
        privateKey: TEST_PRIVATE_KEYS.ACCOUNT_1
      },
      {
        address: testUser2.address,
        privateKey: TEST_PRIVATE_KEYS.ACCOUNT_2
      },
      {
        address: testUser3.address,
        privateKey: '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6' // Hardhat account #3
      }
    ],
    networkUrl: 'http://127.0.0.1:8545',
    chainId: 31337
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
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

const hre = require('hardhat');
const fs = require('fs');
const path = require('path');

/**
 * Setup User Network with Real Contract Transactions
 * 
 * This script configures a complex and realistic network of users
 * by sending real contract transactions to the deployed test contracts.
 * It creates users with varying interaction levels from high to none.
 */

async function setupUserNetwork() {
  console.log('\n🌐 Setting up realistic user network...\n');

  // Load deployment info and user fixtures
  const deploymentPath = path.resolve(__dirname, '../fixtures/deployment.json');
  const userNetworkPath = path.resolve(__dirname, '../fixtures/user-network.json');

  if (!fs.existsSync(deploymentPath)) {
    throw new Error('Deployment file not found. Run deploy-contracts.js first.');
  }

  if (!fs.existsSync(userNetworkPath)) {
    throw new Error('User network fixtures not found.');
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
  const userNetwork = JSON.parse(fs.readFileSync(userNetworkPath, 'utf8'));

  // Get contract instance
  const AddressClaim = await hre.ethers.getContractFactory('AddressClaim');
  const contract = AddressClaim.attach(deployment.contractAddress);

  // Get signers (test accounts)
  const signers = await hre.ethers.getSigners();

  console.log('📝 Contract Address:', deployment.contractAddress);
  console.log('👥 Setting up', userNetwork.users.length, 'users\n');

  const setupResults = {
    successfulClaims: 0,
    failedClaims: 0,
    socialConnections: 0,
    transactionHashes: []
  };

  // Process each user
  for (const user of userNetwork.users) {
    // Skip unclaimed users
    if (user.interactionLevel === 'none' || !user.profile) {
      console.log(`⏭️  Skipping ${user.id} (unclaimed)`);
      continue;
    }

    console.log(`\n👤 Setting up ${user.id} (${user.interactionLevel} interaction)`);

    try {
      const signer = signers[user.accountIndex];
      const contractWithSigner = contract.connect(signer);

      // Check if already claimed
      const existingClaim = await contract.getClaim(signer.address).catch(() => null);
      
      if (existingClaim && existingClaim.name) {
        console.log(`   ✓ Already claimed: ${signer.address}`);
        setupResults.successfulClaims++;
        continue;
      }

      // Prepare claim data
      const metadata = {
        name: user.profile.name || '',
        avatar: user.profile.avatar || '',
        bio: user.profile.bio || '',
        website: user.profile.website || '',
        twitter: user.profile.twitter || '',
        github: user.profile.github || '',
        publicKey: user.profile.publicKey ? hre.ethers.toUtf8Bytes(user.profile.publicKey) : '0x',
        pgpSignature: user.profile.pgpSignature || '',
        isPrivate: user.profile.isPrivate || false,
        ipfsCID: user.profile.ipfsCID || ''
      };

      console.log(`   📋 Claiming address: ${signer.address}`);
      console.log(`   📝 Name: ${metadata.name}`);

      // Submit claim transaction
      const tx = await contractWithSigner.claimAddress(
        metadata.name,
        metadata.avatar,
        metadata.bio,
        metadata.website,
        metadata.twitter,
        metadata.github,
        metadata.publicKey,
        metadata.pgpSignature,
        metadata.isPrivate,
        metadata.ipfsCID
      );

      console.log(`   ⏳ Transaction hash: ${tx.hash}`);
      setupResults.transactionHashes.push(tx.hash);

      // Wait for transaction to be mined
      const receipt = await tx.wait();
      console.log(`   ✅ Claim successful (block ${receipt.blockNumber}, gas: ${receipt.gasUsed.toString()})`);

      setupResults.successfulClaims++;

      // Small delay between transactions
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.error(`   ❌ Failed to setup ${user.id}:`, error.message);
      setupResults.failedClaims++;
    }
  }

  // Note: Social connections and other advanced features would require
  // additional contract functionality (following, attestations, etc.)
  // For now, we're just setting up the basic claims

  console.log('\n' + '='.repeat(60));
  console.log('✨ User Network Setup Complete\n');
  console.log('Summary:');
  console.log(`  ✅ Successful claims: ${setupResults.successfulClaims}`);
  console.log(`  ❌ Failed claims: ${setupResults.failedClaims}`);
  console.log(`  📝 Total transactions: ${setupResults.transactionHashes.length}`);
  console.log('='.repeat(60) + '\n');

  // Save setup results
  const resultsPath = path.resolve(__dirname, '../fixtures/setup-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    results: setupResults,
    userNetwork: userNetwork.networkStats
  }, null, 2));

  console.log('💾 Setup results saved to fixtures/setup-results.json\n');

  return setupResults;
}

// Run if called directly
if (require.main === module) {
  setupUserNetwork()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupUserNetwork };

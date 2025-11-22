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

  // Get contract instances
  const AddressClaim = await hre.ethers.getContractFactory('AddressClaim');
  const contract = AddressClaim.attach(deployment.addressClaimContract || deployment.contractAddress);
  
  // Get handle registry contract if deployed
  let handleRegistry = null;
  if (deployment.handleRegistryContract) {
    const AddressHandleRegistry = await hre.ethers.getContractFactory('AddressHandleRegistry');
    handleRegistry = AddressHandleRegistry.attach(deployment.handleRegistryContract);
    console.log('🏷️  Word Handle Registry:', deployment.handleRegistryContract);
  }

  // Get signers (test accounts)
  const signers = await hre.ethers.getSigners();

  console.log('📝 AddressClaim Contract:', deployment.addressClaimContract || deployment.contractAddress);
  console.log('👥 Setting up', userNetwork.users.length, 'users\n');

  const setupResults = {
    successfulClaims: 0,
    failedClaims: 0,
    successfulHandleClaims: 0,
    failedHandleClaims: 0,
    socialConnections: 0,
    transactionHashes: [],
    wordHandles: []
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

      // Create a dummy signature (for testing purposes)
      // In production, this would be a real signature
      const dummySignature = '0x' + '0'.repeat(130);

      // Submit claim transaction with address and signature as first parameters
      const tx = await contractWithSigner.claimAddress(
        signer.address,
        dummySignature,
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

      // Claim word handle if registry is available and user has high/medium interaction
      if (handleRegistry && (user.interactionLevel === 'high' || user.interactionLevel === 'medium')) {
        try {
          console.log(`   🏷️  Claiming word handle...`);
          
          // Generate a simple word handle from user's address
          // Format: length byte + word indices as 2-byte big-endian values
          // Using first bytes of address to generate deterministic word indices
          const addressBytes = hre.ethers.getBytes(signer.address);
          const numWords = user.interactionLevel === 'high' ? 3 : 2;
          
          // Create handle bytes: [length, idx1_hi, idx1_lo, idx2_hi, idx2_lo, ...]
          const handleBytes = new Uint8Array(1 + numWords * 2);
          handleBytes[0] = numWords;
          
          for (let i = 0; i < numWords; i++) {
            // Use address bytes to create word indices (0-2047 range for BIP39)
            const wordIndex = ((addressBytes[i * 2] << 8) | addressBytes[i * 2 + 1]) % 2048;
            handleBytes[1 + i * 2] = (wordIndex >> 8) & 0xff;
            handleBytes[1 + i * 2 + 1] = wordIndex & 0xff;
          }
          
          const handleRegistryWithSigner = handleRegistry.connect(signer);
          const handleTx = await handleRegistryWithSigner.claim(handleBytes);
          
          console.log(`   ⏳ Handle claim tx: ${handleTx.hash}`);
          setupResults.transactionHashes.push(handleTx.hash);
          
          const handleReceipt = await handleTx.wait();
          console.log(`   ✅ Word handle claimed (block ${handleReceipt.blockNumber})`);
          
          setupResults.successfulHandleClaims++;
          setupResults.wordHandles.push({
            user: user.id,
            address: signer.address,
            handle: '0x' + Buffer.from(handleBytes).toString('hex'),
            numWords
          });
        } catch (error) {
          console.error(`   ⚠️  Failed to claim word handle:`, error.message);
          setupResults.failedHandleClaims++;
        }
      }

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
  console.log(`  ✅ Successful address claims: ${setupResults.successfulClaims}`);
  console.log(`  ❌ Failed address claims: ${setupResults.failedClaims}`);
  console.log(`  ✅ Successful word handle claims: ${setupResults.successfulHandleClaims}`);
  console.log(`  ❌ Failed word handle claims: ${setupResults.failedHandleClaims}`);
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

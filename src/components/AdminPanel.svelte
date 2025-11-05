<script>
  import { createEventDispatcher } from 'svelte';
  import { multiChainStore, availableChains } from '../stores/multichain';
  import { themeStore } from '../stores/theme';
  import { toastStore } from '../stores/toast';
  import { ethers } from 'ethers';

  const dispatch = createEventDispatcher();

  let darkMode = false;
  let connected = false;
  let address = null;
  let deploying = false;
  let selectedChain = null;
  let deployedContracts = [];
  let availableChainsList = [];

  // Contract bytecode and ABI (simplified - would come from compilation)
  const contractBytecode = ""; // Would be filled with actual bytecode
  const contractABI = [
    "function claimAddress(address _address, bytes memory _signature, string memory _name, string memory _avatar, string memory _bio, string memory _website, string memory _twitter, string memory _github, bytes memory _publicKey, bool _isPrivate) public",
    "function updateMetadata(string memory _name, string memory _avatar, string memory _bio, string memory _website, string memory _twitter, string memory _github, bytes memory _publicKey, bool _isPrivate) public",
    "function getClaim(address _address) public view returns (address claimant, string memory name, string memory avatar, string memory bio, string memory website, string memory twitter, string memory github, uint256 claimTime, bool isActive, bool isPrivate)",
    "function isClaimed(address) public view returns (bool)",
    "function addViewer(address _viewer) public",
    "function removeViewer(address _viewer) public",
    "function revokeClaim() public",
    "event AddressClaimed(address indexed claimedAddress, address indexed claimant, uint256 timestamp)",
    "event MetadataUpdated(address indexed claimedAddress, uint256 timestamp)"
  ];

  themeStore.subscribe(value => {
    darkMode = value.darkMode;
  });

  multiChainStore.subscribe(value => {
    connected = value.connected;
    address = value.primaryAddress;
  });

  availableChains.subscribe(value => {
    availableChainsList = value;
  });

  async function deployContract() {
    if (!connected) {
      toastStore.show('Please connect your wallet first', 'error');
      return;
    }

    if (!selectedChain) {
      toastStore.show('Please select a network', 'error');
      return;
    }

    deploying = true;

    try {
      // Get signer for the current chain
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // In a real implementation, this would deploy the actual contract
      // For now, we'll simulate the deployment
      toastStore.show(`Deploying contract to ${selectedChain.name}...`, 'info', 0);

      // Simulate deployment delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simulate deployed contract address
      const mockAddress = `0x${Math.random().toString(16).substring(2, 42)}`;

      deployedContracts = [...deployedContracts, {
        chainId: selectedChain.chainId,
        network: selectedChain.name,
        address: mockAddress,
        deployedAt: new Date().toISOString(),
        deployer: address
      }];

      toastStore.clear();
      toastStore.show(`Contract deployed successfully to ${selectedChain.name}!`, 'success');
      
      selectedChain = null;
    } catch (error) {
      console.error('Deployment error:', error);
      toastStore.clear();
      toastStore.show(`Deployment failed: ${error.message}`, 'error');
    } finally {
      deploying = false;
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    toastStore.show('Copied to clipboard', 'success', 2000);
  }

  function exportConfig() {
    const config = deployedContracts.map(contract => ({
      network: contract.network,
      envVar: `VITE_CONTRACT_ADDRESS_${contract.network.toUpperCase().replace(/ /g, '_')}`,
      address: contract.address
    }));

    const envText = config.map(c => `${c.envVar}=${c.address}`).join('\n');
    
    const blob = new Blob([envText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'contract-addresses.env';
    a.click();
    URL.revokeObjectURL(url);

    toastStore.show('Configuration exported', 'success');
  }

  function goBack() {
    dispatch('viewChange', { view: 'explorer' });
  }
</script>

<div class="admin-panel" class:dark={darkMode}>
  <div class="admin-header">
    <button class="btn-back" on:click={goBack}>← Back to Explorer</button>
    <h2>🛠️ Admin Panel - Contract Deployment</h2>
    <p>Deploy the AddressClaim contract to multiple blockchain networks</p>
  </div>

  {#if !connected}
    <div class="warning-box">
      <div class="warning-icon">⚠️</div>
      <div>
        <h3>Wallet Not Connected</h3>
        <p>Please connect your wallet to deploy contracts</p>
      </div>
    </div>
  {:else}
    <div class="deployment-section">
      <div class="deploy-card">
        <h3>Deploy New Contract</h3>
        
        <div class="form-group">
          <label for="chain-select">Select Network:</label>
          <select 
            id="chain-select" 
            bind:value={selectedChain}
            disabled={deploying}
            class:dark={darkMode}
          >
            <option value={null}>-- Select a network --</option>
            {#each availableChainsList as chain}
              <option value={chain}>
                {chain.name} (Chain ID: {chain.chainId})
              </option>
            {/each}
          </select>
        </div>

        <button 
          class="btn-deploy" 
          on:click={deployContract}
          disabled={!selectedChain || deploying}
        >
          {deploying ? '⏳ Deploying...' : '🚀 Deploy Contract'}
        </button>

        <div class="info-box">
          <strong>Note:</strong> This is a demo implementation. In production, you would:
          <ul>
            <li>Compile the Solidity contract using Hardhat or Foundry</li>
            <li>Deploy using the actual bytecode and constructor parameters</li>
            <li>Verify the contract on the block explorer</li>
            <li>Update environment variables with deployed addresses</li>
          </ul>
        </div>
      </div>

      {#if deployedContracts.length > 0}
        <div class="deployed-contracts">
          <div class="contracts-header">
            <h3>Deployed Contracts ({deployedContracts.length})</h3>
            <button class="btn-export" on:click={exportConfig}>
              📥 Export Config
            </button>
          </div>

          <div class="contracts-grid">
            {#each deployedContracts as contract}
              <div class="contract-card" class:dark={darkMode}>
                <div class="contract-network">
                  <span class="network-badge">{contract.network}</span>
                  <span class="chain-id">Chain ID: {contract.chainId}</span>
                </div>
                
                <div class="contract-address">
                  <label>Contract Address:</label>
                  <div class="address-row">
                    <code>{contract.address}</code>
                    <button 
                      class="btn-copy" 
                      on:click={() => copyToClipboard(contract.address)}
                      title="Copy address"
                    >
                      📋
                    </button>
                  </div>
                </div>

                <div class="contract-info">
                  <div class="info-row">
                    <span class="label">Deployed by:</span>
                    <span class="value">{contract.deployer.substring(0, 10)}...{contract.deployer.substring(38)}</span>
                  </div>
                  <div class="info-row">
                    <span class="label">Deployed at:</span>
                    <span class="value">{new Date(contract.deployedAt).toLocaleString()}</span>
                  </div>
                </div>

                <div class="env-var">
                  <label>Environment Variable:</label>
                  <div class="env-row">
                    <code>VITE_CONTRACT_ADDRESS_{contract.network.toUpperCase().replace(/ /g, '_')}={contract.address}</code>
                    <button 
                      class="btn-copy" 
                      on:click={() => copyToClipboard(`VITE_CONTRACT_ADDRESS_${contract.network.toUpperCase().replace(/ /g, '_')}=${contract.address}`)}
                      title="Copy env variable"
                    >
                      📋
                    </button>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .admin-panel {
    max-width: 1000px;
    margin: 0 auto;
  }

  .admin-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .admin-header h2 {
    margin: 1rem 0 0.5rem 0;
    font-size: 2rem;
    color: white;
  }

  .admin-header p {
    color: rgba(255, 255, 255, 0.9);
    margin: 0;
  }

  .btn-back {
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-bottom: 1rem;
  }

  .btn-back:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  .warning-box {
    background: rgba(255, 193, 7, 0.1);
    border: 2px solid rgba(255, 193, 7, 0.5);
    border-radius: 12px;
    padding: 2rem;
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }

  .warning-icon {
    font-size: 3rem;
  }

  .warning-box h3 {
    margin: 0 0 0.5rem 0;
    color: #ffc107;
  }

  .warning-box p {
    margin: 0;
    color: rgba(255, 255, 255, 0.9);
  }

  .deployment-section {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .deploy-card {
    background: white;
    border-radius: 16px;
    padding: 2rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  }

  .admin-panel.dark .deploy-card {
    background: rgba(26, 26, 46, 0.95);
  }

  .deploy-card h3 {
    margin: 0 0 1.5rem 0;
    color: #667eea;
  }

  .admin-panel.dark .deploy-card h3 {
    color: #a78bfa;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
    color: #333;
  }

  .admin-panel.dark .form-group label {
    color: #e0e0e0;
  }

  select {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid #ddd;
    border-radius: 8px;
    font-size: 1rem;
    background: white;
    color: #333;
  }

  select.dark {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(167, 139, 250, 0.3);
    color: #e0e0e0;
  }

  .btn-deploy {
    width: 100%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 1rem;
    border-radius: 12px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-deploy:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
  }

  .btn-deploy:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .info-box {
    margin-top: 1.5rem;
    padding: 1rem;
    background: rgba(33, 150, 243, 0.1);
    border-left: 4px solid #2196f3;
    border-radius: 8px;
    font-size: 0.9rem;
    color: #333;
  }

  .admin-panel.dark .info-box {
    background: rgba(33, 150, 243, 0.2);
    color: #e0e0e0;
  }

  .info-box ul {
    margin: 0.5rem 0 0 0;
    padding-left: 1.5rem;
  }

  .deployed-contracts {
    background: white;
    border-radius: 16px;
    padding: 2rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  }

  .admin-panel.dark .deployed-contracts {
    background: rgba(26, 26, 46, 0.95);
  }

  .contracts-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .contracts-header h3 {
    margin: 0;
    color: #667eea;
  }

  .admin-panel.dark .contracts-header h3 {
    color: #a78bfa;
  }

  .btn-export {
    background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-export:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(76, 175, 80, 0.4);
  }

  .contracts-grid {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .contract-card {
    background: rgba(102, 126, 234, 0.05);
    border: 1px solid rgba(102, 126, 234, 0.2);
    border-radius: 12px;
    padding: 1.5rem;
  }

  .contract-card.dark {
    background: rgba(167, 139, 250, 0.05);
    border-color: rgba(167, 139, 250, 0.2);
  }

  .contract-network {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .network-badge {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-weight: 600;
  }

  .chain-id {
    color: #666;
    font-size: 0.9rem;
  }

  .admin-panel.dark .chain-id {
    color: #999;
  }

  .contract-address,
  .env-var {
    margin-bottom: 1rem;
  }

  .contract-address label,
  .env-var label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
    font-size: 0.9rem;
    color: #666;
  }

  .admin-panel.dark .contract-address label,
  .admin-panel.dark .env-var label {
    color: #999;
  }

  .address-row,
  .env-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  code {
    flex: 1;
    background: rgba(0, 0, 0, 0.05);
    padding: 0.5rem;
    border-radius: 6px;
    font-family: 'Courier New', monospace;
    font-size: 0.85rem;
    color: #333;
    word-break: break-all;
  }

  .admin-panel.dark code {
    background: rgba(255, 255, 255, 0.05);
    color: #e0e0e0;
  }

  .btn-copy {
    background: rgba(102, 126, 234, 0.1);
    border: 1px solid rgba(102, 126, 234, 0.3);
    padding: 0.5rem;
    border-radius: 6px;
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.2s ease;
  }

  .btn-copy:hover {
    background: rgba(102, 126, 234, 0.2);
  }

  .contract-info {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.9rem;
  }

  .info-row .label {
    color: #666;
  }

  .admin-panel.dark .info-row .label {
    color: #999;
  }

  .info-row .value {
    color: #333;
    font-family: 'Courier New', monospace;
  }

  .admin-panel.dark .info-row .value {
    color: #e0e0e0;
  }

  @media (max-width: 768px) {
    .admin-panel {
      padding: 1rem;
    }

    .contracts-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }

    .btn-export {
      width: 100%;
    }
  }
</style>

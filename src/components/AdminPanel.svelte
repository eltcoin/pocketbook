<script>
  import { createEventDispatcher } from 'svelte';
  import { multiChainStore } from '../stores/multichain';
  import { themeStore } from '../stores/theme';
  import { toastStore } from '../stores/toast';
  import { ethers } from 'ethers';
  import Icon from './Icon.svelte';
  import { addressClaimABI, addressClaimBytecode, hasDeployableArtifact as hasAddressClaimArtifact } from '../config/addressClaimArtifact';
  import { handleRegistryABI, handleRegistryBytecode, hasHandleRegistryArtifact } from '../config/handleRegistryArtifact';
  import { bip39VocabularyABI, bip39VocabularyBytecode, hasBip39VocabularyArtifact } from '../config/bip39VocabularyArtifact';
  import { getSupportedNetworks } from '../config/networks';

  const dispatch = createEventDispatcher();

  const CONTRACT_IDS = {
    ADDRESS: 'address-claim',
    HANDLE: 'handle-registry',
    BIP39: 'bip39-vocabulary'
  };

  const contractOptions = [
    {
      id: CONTRACT_IDS.ADDRESS,
      label: 'Address Claim Registry',
      description: 'Primary identity contract that stores verified profiles and social data.',
      abi: addressClaimABI,
      bytecode: addressClaimBytecode,
      hasArtifact: hasAddressClaimArtifact,
      docsCommand: 'npm run compile:contract'
    },
    {
      id: CONTRACT_IDS.HANDLE,
      label: 'Word Handle Registry',
      description: 'Deterministic BIP39 handle registry for human-readable phrases.',
      abi: handleRegistryABI,
      bytecode: handleRegistryBytecode,
      hasArtifact: hasHandleRegistryArtifact,
      docsCommand: 'npm run compile:handle-registry'
    },
    {
      id: CONTRACT_IDS.BIP39,
      label: 'Bip39 Vocabulary Library',
      description: 'On-chain SHA-256 verified wordlist powering deterministic handles.',
      abi: bip39VocabularyABI,
      bytecode: bip39VocabularyBytecode,
      hasArtifact: hasBip39VocabularyArtifact,
      docsCommand: 'npm run compile:handle-registry'
    }
  ];

  function getContractDisplayName(contractType) {
    return contractOptions.find(option => option.id === contractType)?.label || 'Pocketbook Contract';
  }

  let darkMode = false;
  let connected = false;
  let address = null;
  let deploying = false;
  let selectedChainId = '';
  let selectedChain = null;
  let selectedContractType = CONTRACT_IDS.ADDRESS;
  let handleRegistryParams = {
    vocabLength: 2048,
    maxLength: 4,
    vocabHash: ''
  };
  let computingVocabHash = false;
  let vocabHashError = null;
  let deployedContracts = [];
  let availableChainsList = getSupportedNetworks();

  themeStore.subscribe(value => {
    darkMode = value.darkMode;
  });

  multiChainStore.subscribe(value => {
    connected = value.connected;
    address = value.primaryAddress;
  });

  $: selectedChain = availableChainsList.find(chain => String(chain.chainId) === selectedChainId) || null;


  function sanitizeNetworkKey(value = '') {
    return value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '_')
      .replace(/_+/g, '_');
  }

  function getEnvVarKey(contractType, networkName) {
    const networkKey = sanitizeNetworkKey(networkName || 'NETWORK');
    let prefix = 'VITE_CONTRACT_ADDRESS';
    if (contractType === CONTRACT_IDS.HANDLE) {
      prefix = 'VITE_HANDLE_REGISTRY_ADDRESS';
    } else if (contractType === CONTRACT_IDS.BIP39) {
      prefix = 'VITE_BIP39_VOCABULARY_ADDRESS';
    }
    return `${prefix}_${networkKey}`;
  }

  function getSelectedContractDefinition() {
    return contractOptions.find(option => option.id === selectedContractType);
  }

  function validateHandleRegistryParams() {
    const { vocabLength, maxLength, vocabHash } = handleRegistryParams;
    if (!vocabLength || Number.isNaN(Number(vocabLength)) || Number(vocabLength) <= 0 || Number(vocabLength) > 65535) {
      throw new Error('Vocabulary length must be between 1 and 65535.');
    }
    if (!maxLength || Number.isNaN(Number(maxLength)) || Number(maxLength) <= 0 || Number(maxLength) > 255) {
      throw new Error('Max handle length must be between 1 and 255.');
    }
    if (!/^0x[0-9a-fA-F]{64}$/.test((vocabHash || '').trim())) {
      throw new Error('Vocabulary hash must be a 32-byte hex string (0x + 64 hex chars).');
    }
  }

  function getConstructorArgs(contractType) {
    if (contractType === CONTRACT_IDS.HANDLE) {
      validateHandleRegistryParams();
      return [
        Number(handleRegistryParams.vocabLength),
        Number(handleRegistryParams.maxLength),
        (handleRegistryParams.vocabHash || '').trim()
      ];
    }
    return [];
  }

  async function computeBip39VocabularyHash() {
    computingVocabHash = true;
    vocabHashError = null;
    try {
      const response = await fetch('/wordlists/bip39-english.txt');
      if (!response.ok) {
        throw new Error('Unable to load bip39 wordlist from /wordlists/bip39-english.txt');
      }
      const text = await response.text();
      const normalized = text.replace(/\r\n/g, '\n');
      const words = normalized.split('\n').filter(Boolean);
      const encoder = new TextEncoder();
      const data = encoder.encode(normalized);
      if (typeof crypto === 'undefined' || !crypto.subtle) {
        throw new Error('Web Crypto API is not available in this environment.');
      }
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hex = hashArray.map((byte) => byte.toString(16).padStart(2, '0')).join('');
      handleRegistryParams = {
        ...handleRegistryParams,
        vocabLength: words.length,
        vocabHash: `0x${hex}`
      };
      toastStore.show('Loaded BIP39 vocabulary metadata', 'success', 2500);
      toastStore.show('Deploy Bip39Vocabulary.json alongside the registry to guarantee integrity.', 'info', 3500);
    } catch (error) {
      vocabHashError = error?.message || 'Unable to compute vocabulary hash';
      toastStore.show(vocabHashError, 'error');
    } finally {
      computingVocabHash = false;
    }
  }

  async function deployContract() {
    if (!connected) {
      toastStore.show('Please connect your wallet first', 'error');
      return;
    }

    if (!selectedChain) {
      toastStore.show('Please select a network', 'error');
      return;
    }

    const contractDefinition = getSelectedContractDefinition();

    if (!contractDefinition) {
      toastStore.show('Unknown contract type selected', 'error');
      return;
    }

    if (!window.ethereum) {
      toastStore.show('No Ethereum provider found. Please install MetaMask.', 'error');
      return;
    }

    if (!contractDefinition.hasArtifact()) {
      toastStore.show('Contract bytecode not configured. Run the appropriate compile script first.', 'error');
      return;
    }

    deploying = true;

    try {
      // Get signer for the current chain
      const provider = new ethers.BrowserProvider(window.ethereum);
      const chainIdHex = selectedChain.chainIdHex || ethers.toBeHex(selectedChain.chainId);

      try {
        const network = await provider.getNetwork();
        if (Number(network.chainId) !== Number(selectedChain.chainId)) {
          await provider.send('wallet_switchEthereumChain', [{ chainId: chainIdHex }]);
        }
      } catch (switchError) {
        if (switchError.code === 4902 && selectedChain.rpcUrl) {
          try {
            await provider.send('wallet_addEthereumChain', [{
              chainId: chainIdHex,
              chainName: selectedChain.name,
              rpcUrls: [selectedChain.rpcUrl],
              nativeCurrency: selectedChain.nativeCurrency,
              blockExplorerUrls: selectedChain.blockExplorer ? [selectedChain.blockExplorer] : undefined
            }]);
          } catch (addError) {
            throw new Error(`Please add ${selectedChain.name} network in MetaMask.`);
          }
        } else {
          throw new Error(`Please switch your wallet to ${selectedChain.name}.`);
        }
      }

      const signer = await provider.getSigner();
      toastStore.clear();
      toastStore.show(`Review deployment transaction in MetaMask for ${selectedChain.name}...`, 'info', 0);

      const constructorArgs = getConstructorArgs(contractDefinition.id);
      const factory = new ethers.ContractFactory(contractDefinition.abi, contractDefinition.bytecode, signer);
      const contract = await factory.deploy(...constructorArgs);

      const deploymentTx = contract.deploymentTransaction();
      toastStore.clear();

      if (!deploymentTx) {
        throw new Error('Deployment transaction not created.');
      }

      toastStore.show('Waiting for deployment confirmation...', 'info', 0);

      const txHash = deploymentTx.hash;
      const receipt = await deploymentTx.wait();
      await contract.waitForDeployment();
      const deployedAddress = await contract.getAddress();

      const envVar = getEnvVarKey(contractDefinition.id, selectedChain.name);

      deployedContracts = [...deployedContracts, {
        chainId: selectedChain.chainId,
        network: selectedChain.name,
        address: deployedAddress,
        deployedAt: new Date().toISOString(),
        deployer: address,
        transactionHash: txHash,
        blockExplorer: selectedChain.blockExplorer,
        contractType: contractDefinition.id,
        envVar,
        constructorArgs
      }];

      toastStore.clear();
      toastStore.show(`Contract deployed successfully to ${selectedChain.name}!`, 'success');
      
      selectedChainId = '';
    } catch (error) {
      console.error('Deployment error:', error);
      toastStore.clear();
      const errorMessage = error?.info?.error?.message || error?.shortMessage || error?.message || 'Unknown deployment error';
      toastStore.show(`Deployment failed: ${errorMessage}`, 'error');
    } finally {
      deploying = false;
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    toastStore.show('Copied to clipboard', 'success', 2000);
  }

  function exportConfig() {
    if (deployedContracts.length === 0) {
      toastStore.show('Deploy a contract before exporting configuration.', 'error');
      return;
    }

    const config = deployedContracts.map(contract => ({
      network: contract.network,
      envVar: contract.envVar || getEnvVarKey(contract.contractType, contract.network),
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

  function selectContractType(id) {
    selectedContractType = id;
  }

  function updateHandleParam(field, value) {
    handleRegistryParams = {
      ...handleRegistryParams,
      [field]: value
    };
  }
</script>

<div class="admin-panel" class:dark={darkMode}>
  <div class="admin-header">
    <button class="btn-back" on:click={goBack}>← Back to Explorer</button>
    <h2>
      <Icon name="tools" size="1.75rem" />
      <span>Admin Panel - Contract Deployment</span>
    </h2>
    <p>Deploy Pocketbook contracts (identity, handles, vocabulary) across networks</p>
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
        
        <div class="contract-toggle">
          {#each contractOptions as option}
            <button
              type="button"
              class="contract-type"
              class:active={selectedContractType === option.id}
              on:click={() => selectContractType(option.id)}
            >
              <div class="contract-type-header">
                <span class="contract-type-label">{option.label}</span>
                {#if option.id === CONTRACT_IDS.HANDLE}
                  <span class="beta-pill">Handles</span>
                {:else if option.id === CONTRACT_IDS.BIP39}
                  <span class="beta-pill">Dependency</span>
                {/if}
              </div>
              <p>{option.description}</p>
              {#if !option.hasArtifact()}
                <span class="artifact-warning">Requires {option.docsCommand}</span>
              {/if}
            </button>
          {/each}
        </div>

        <div class="form-group">
          <label for="chain-select">Select Network:</label>
          <select 
            id="chain-select" 
            bind:value={selectedChainId}
            disabled={deploying}
            class:dark={darkMode}
          >
            <option value="">-- Select a network --</option>
            {#each availableChainsList as chain}
              <option value={String(chain.chainId)}>
                {chain.name} (Chain ID: {chain.chainId})
              </option>
            {/each}
          </select>
        </div>

        {#if selectedContractType === CONTRACT_IDS.HANDLE}
          <div class="handle-params">
            <div class="param-grid">
              <div class="form-group">
                <label for="vocab-length">Vocabulary Length</label>
                <input
                  id="vocab-length"
                  type="number"
                  min="1"
                  max="65535"
                  value={handleRegistryParams.vocabLength}
                  on:input={(event) => updateHandleParam('vocabLength', Number(event.target.value))}
                  placeholder="2048"
                />
              </div>
              <div class="form-group">
                <label for="max-length">Max Words per Handle</label>
                <input
                  id="max-length"
                  type="number"
                  min="1"
                  max="255"
                  value={handleRegistryParams.maxLength}
                  on:input={(event) => updateHandleParam('maxLength', Number(event.target.value))}
                  placeholder="4"
                />
              </div>
            </div>
            <div class="form-group">
              <label for="vocab-hash">Vocabulary SHA-256 Hash (bytes32)</label>
              <div class="hash-row">
                <input
                  id="vocab-hash"
                  type="text"
                  value={handleRegistryParams.vocabHash}
                  on:input={(event) => updateHandleParam('vocabHash', event.target.value)}
                  placeholder="0x..."
                />
                <button
                  type="button"
                  class="btn-secondary"
                  on:click={computeBip39VocabularyHash}
                  disabled={computingVocabHash}
                >
                  {computingVocabHash ? 'Computing...' : 'Load BIP39 hash'}
                </button>
              </div>
              {#if vocabHashError}
                <div class="helper-text error">{vocabHashError}</div>
              {:else}
                <div class="helper-text">Hash must match the deployed Bip39Vocabulary bytecode.</div>
              {/if}
            </div>
            <div class="info-box subtle">
              <strong>Reminder:</strong> Deploy <code>Bip39Vocabulary</code> first and store its address as <code>VITE_BIP39_VOCABULARY_ADDRESS_*</code>. Every handle registry using this vocabulary should reference the same hash.
            </div>
          </div>
        {/if}

        {#if selectedContractType === CONTRACT_IDS.BIP39}
          <div class="info-box subtle">
            <strong>Usage:</strong> Deploy this library once per network, record its address under <code>VITE_BIP39_VOCABULARY_ADDRESS_*</code>, and reuse it for all registries bound to the same wordlist.
          </div>
        {/if}

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
            <li>Deploy using the generated bytecode and constructor parameters</li>
            <li>Verify the contract on the block explorer</li>
            <li>Update environment variables with deployed addresses (including Bip39Vocabulary)</li>
            <li>Keep <code>Bip39Vocabulary</code> and <code>AddressHandleRegistry</code> in sync by reusing the same vocabulary hash</li>
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
                
                <div class="contract-label-chip">
                  {getContractDisplayName(contract.contractType)}
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

                {#if contract.transactionHash}
                  <div class="contract-tx">
                    <label>Transaction Hash:</label>
                    <div class="tx-row">
                      <code>
                        {#if contract.blockExplorer}
                          <a 
                            href={`${contract.blockExplorer}/tx/${contract.transactionHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {contract.transactionHash.substring(0, 10)}...{contract.transactionHash.slice(-8)}
                          </a>
                        {:else}
                          {contract.transactionHash.substring(0, 10)}...{contract.transactionHash.slice(-8)}
                        {/if}
                      </code>
                      <button 
                        class="btn-copy" 
                        on:click={() => copyToClipboard(contract.transactionHash)}
                        title="Copy transaction hash"
                      >
                        📋
                      </button>
                    </div>
                  </div>
                {/if}

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
                    <code>{contract.envVar || getEnvVarKey(contract.contractType, contract.network)}={contract.address}</code>
                    <button 
                      class="btn-copy" 
                      on:click={() => copyToClipboard(`${contract.envVar || getEnvVarKey(contract.contractType, contract.network)}=${contract.address}`)}
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
    font-weight: 700;
    color: #0f172a;
  }

  .admin-panel.dark .admin-header h2 {
    color: #f1f5f9;
  }

  .admin-header p {
    color: #64748b;
    margin: 0;
  }

  .admin-panel.dark .admin-header p {
    color: #94a3b8;
  }

  .btn-back {
    background: #f1f5f9;
    color: #0f172a;
    border: 1px solid #e2e8f0;
    padding: 0.75rem 1.5rem;
    border-radius: 10px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-bottom: 1rem;
  }

  .admin-panel.dark .btn-back {
    background: #334155;
    color: #f1f5f9;
    border-color: #334155;
  }

  .btn-back:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
  }

  .warning-box {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 2rem;
    display: flex;
    align-items: center;
    gap: 1.5rem;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
  }

  .admin-panel.dark .warning-box {
    background: #1e293b;
    border-color: #334155;
  }

  .warning-icon {
    font-size: 3rem;
  }

  .warning-box h3 {
    margin: 0 0 0.5rem 0;
    color: #ff9800;
    font-weight: 600;
  }

  .warning-box p {
    margin: 0;
    color: #64748b;
  }

  .admin-panel.dark .warning-box p {
    color: #94a3b8;
  }

  .deployment-section {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .deploy-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 2rem;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
  }

  .admin-panel.dark .deploy-card {
    background: #1e293b;
    border-color: #334155;
  }

  .deploy-card h3 {
    margin: 0 0 1.5rem 0;
    color: #0f172a;
    font-weight: 600;
  }

  .admin-panel.dark .deploy-card h3 {
    color: #f1f5f9;
  }

.form-group {
    margin-bottom: 1.5rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #0f172a;
  }

  .admin-panel.dark .form-group label {
    color: #f1f5f9;
  }

  select,
  input[type="number"],
  input[type="text"] {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 1rem;
    background: #ffffff;
    color: #0f172a;
  }

  .admin-panel.dark select,
  .admin-panel.dark input[type="number"],
  .admin-panel.dark input[type="text"] {
    background: #1e293b;
    border-color: #334155;
    color: #f1f5f9;
  }

  .contract-toggle {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .contract-type {
    border: 1px solid #e2e8f0;
    background: #ffffff;
    border-radius: 12px;
    padding: 1rem 1.25rem;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .contract-type.active {
    border-color: var(--accent-primary);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
  }

  .admin-panel.dark .contract-type {
    background: #0f172a;
    border-color: #334155;
  }

  .contract-type-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.35rem;
  }

  .contract-type-label {
    font-weight: 600;
    color: #0f172a;
  }

  .admin-panel.dark .contract-type-label {
    color: #f1f5f9;
  }

  .contract-type p {
    margin: 0;
    color: #64748b;
    font-size: 0.9rem;
  }

  .admin-panel.dark .contract-type p {
    color: #94a3b8;
  }

  .artifact-warning {
    display: inline-block;
    margin-top: 0.5rem;
    font-size: 0.8rem;
    color: #b45309;
  }

  .beta-pill {
    background: rgba(14, 165, 233, 0.15);
    color: #0ea5e9;
    padding: 0.1rem 0.55rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 700;
  }

  .handle-params {
    margin-bottom: 1.5rem;
    border: 1px dashed rgba(15, 23, 42, 0.15);
    border-radius: 12px;
    padding: 1.25rem;
  }

  .admin-panel.dark .handle-params {
    border-color: rgba(148, 163, 184, 0.3);
  }

  .param-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 1rem;
  }

  .hash-row {
    display: flex;
    gap: 0.75rem;
  }

  .hash-row input {
    flex: 1;
  }

  .btn-secondary {
    border-radius: 8px;
    border: 1px solid #cbd5f5;
    background: #eef2ff;
    color: #1e3a8a;
    font-weight: 600;
    padding: 0.75rem 1rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-secondary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .admin-panel.dark .btn-secondary {
    background: rgba(99, 102, 241, 0.15);
    border-color: rgba(99, 102, 241, 0.35);
    color: #c7d2fe;
  }

  .helper-text {
    font-size: 0.85rem;
    color: #64748b;
    margin-top: 0.35rem;
  }

  .helper-text.error {
    color: #dc2626;
  }

  .contract-label-chip {
    display: inline-flex;
    padding: 0.25rem 0.75rem;
    border-radius: 999px;
    background: rgba(59, 130, 246, 0.12);
    color: #1d4ed8;
    font-size: 0.85rem;
    font-weight: 600;
    margin-bottom: 1rem;
  }

  .admin-panel.dark .contract-label-chip {
    background: rgba(59, 130, 246, 0.2);
    color: #bfdbfe;
  }

  .btn-deploy {
    width: 100%;
    background: #0f172a;
    color: #f1f5f9;
    border: none;
    padding: 1rem;
    border-radius: 10px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .admin-panel.dark .btn-deploy {
    background: #f1f5f9;
    color: #0f172a;
  }

  .btn-deploy:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
  }

  .btn-deploy:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .info-box {
    margin-top: 1.5rem;
    padding: 1rem;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-left: 4px solid #0f172a;
    border-radius: 8px;
    font-size: 0.9rem;
    color: #64748b;
  }

  .info-box.subtle {
    margin-top: 1rem;
    border-left-color: var(--accent-primary, #3b82f6);
  }

  .admin-panel.dark .info-box {
    background: #334155;
    border-color: #334155;
    border-left-color: #f1f5f9;
    color: #94a3b8;
  }

  .admin-panel.dark .info-box.subtle {
    border-left-color: #60a5fa;
  }

  .info-box ul {
    margin: 0.5rem 0 0 0;
    padding-left: 1.5rem;
  }

  .deployed-contracts {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 2rem;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
  }

  .admin-panel.dark .deployed-contracts {
    background: #1e293b;
    border-color: #334155;
  }

  .contracts-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .contracts-header h3 {
    margin: 0;
    color: #0f172a;
    font-weight: 600;
  }

  .admin-panel.dark .contracts-header h3 {
    color: #f1f5f9;
  }

  .btn-export {
    background: #4caf50;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 10px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-export:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
  }

  .contracts-grid {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .contract-card {
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 1.5rem;
  }

  .contract-card.dark {
    background: #334155;
    border-color: #334155;
  }

  .contract-network {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .network-badge {
    background: #0f172a;
    color: #f1f5f9;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-weight: 600;
  }

  .contract-card.dark .network-badge {
    background: #f1f5f9;
    color: #0f172a;
  }

  .chain-id {
    color: #64748b;
    font-size: 0.9rem;
    font-weight: 500;
  }

  .admin-panel.dark .chain-id {
    color: #94a3b8;
  }

  .contract-address,
  .contract-tx,
  .env-var {
    margin-bottom: 1rem;
  }

  .contract-address label,
  .contract-tx label,
  .env-var label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    font-size: 0.9rem;
    color: #64748b;
  }

  .admin-panel.dark .contract-address label,
  .admin-panel.dark .contract-tx label,
  .admin-panel.dark .env-var label {
    color: #94a3b8;
  }

  .address-row,
  .tx-row,
  .env-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  code {
    flex: 1;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    padding: 0.5rem;
    border-radius: 6px;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Courier New', monospace;
    font-size: 0.85rem;
    color: #0f172a;
    word-break: break-all;
  }

  .admin-panel.dark code {
    background: #1e293b;
    border-color: #334155;
    color: #f1f5f9;
  }

  .btn-copy {
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    padding: 0.5rem;
    border-radius: 6px;
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.2s ease;
  }

  .admin-panel.dark .btn-copy {
    background: #334155;
    border-color: #334155;
  }

  .btn-copy:hover {
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.1);
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
    color: #64748b;
    font-weight: 500;
  }

  .admin-panel.dark .info-row .label {
    color: #94a3b8;
  }

  .info-row .value {
    color: #0f172a;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Courier New', monospace;
  }

  .admin-panel.dark .info-row .value {
    color: #f1f5f9;
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

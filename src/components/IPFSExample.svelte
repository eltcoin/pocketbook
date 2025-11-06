<!--
  Example component showing IPFS integration
  This demonstrates how to use IPFS storage in Pocketbook components
-->
<script>
  import { onMount } from 'svelte';
  import { ipfsStore, ipfsStatus } from '../stores/ipfs';
  import { ethersStore } from '../stores/ethers';
  
  let extendedMetadata = {
    interests: [],
    skills: [],
    projects: [],
    customFields: {}
  };
  
  let ipfsCID = '';
  let isUploading = false;
  let isLoading = false;
  let uploadError = '';
  let retrievedData = null;
  
  // Initialize IPFS on component mount
  onMount(async () => {
    await ipfsStore.initialize();
  });
  
  // Upload extended metadata to IPFS
  async function uploadToIPFS() {
    if (!$ipfsStatus.ready) {
      uploadError = 'IPFS not initialized';
      return;
    }
    
    isUploading = true;
    uploadError = '';
    
    try {
      // Option 1: Upload with address-based DID
      const address = $ethersStore.address;
      if (address) {
        const didResult = ipfsStore.createDID(address);
        if (didResult.success) {
          const result = await ipfsStore.storeWithDID(
            didResult.did,
            extendedMetadata
          );
          
          if (result.success) {
            ipfsCID = result.cid;
            console.log(`Uploaded to IPFS: ${ipfsCID}`);
            console.log(`Associated with DID: ${didResult.did}`);
          } else {
            uploadError = result.error;
          }
        }
      } else {
        // Option 2: Upload without DID association
        const result = await ipfsStore.uploadMetadata(extendedMetadata);
        
        if (result.success) {
          ipfsCID = result.cid;
          console.log(`Uploaded to IPFS: ${ipfsCID}`);
        } else {
          uploadError = result.error;
        }
      }
    } catch (error) {
      uploadError = error.message;
      console.error('Upload failed:', error);
    } finally {
      isUploading = false;
    }
  }
  
  // Retrieve metadata from IPFS
  async function retrieveFromIPFS() {
    if (!ipfsCID) {
      return;
    }
    
    isLoading = true;
    
    try {
      const result = await ipfsStore.retrieveMetadata(ipfsCID);
      
      if (result.success) {
        retrievedData = result.metadata;
        console.log('Retrieved from IPFS:', retrievedData);
      } else {
        console.error('Retrieval failed:', result.error);
      }
    } catch (error) {
      console.error('Retrieval error:', error);
    } finally {
      isLoading = false;
    }
  }
  
  // Retrieve by DID
  async function retrieveByDID() {
    const address = $ethersStore.address;
    if (!address) return;
    
    isLoading = true;
    
    try {
      const didResult = ipfsStore.createDID(address);
      if (didResult.success) {
        const result = await ipfsStore.retrieveByDID(didResult.did);
        
        if (result.success) {
          retrievedData = result.metadata;
          ipfsCID = result.cid;
          console.log('Retrieved by DID:', retrievedData);
        } else {
          console.error('DID retrieval failed:', result.error);
        }
      }
    } catch (error) {
      console.error('DID retrieval error:', error);
    } finally {
      isLoading = false;
    }
  }
  
  // Retrieve from smart contract
  async function retrieveFromContract() {
    const address = $ethersStore.address;
    if (!address || !$ethersStore.contract) return;
    
    isLoading = true;
    
    try {
      // Get IPFS CID from contract
      const contractCID = await $ethersStore.contract.getIPFSCID(address);
      
      if (contractCID) {
        ipfsCID = contractCID;
        
        // Retrieve metadata from IPFS
        const result = await ipfsStore.retrieveMetadata(contractCID);
        
        if (result.success) {
          retrievedData = result.metadata;
          console.log('Retrieved from contract + IPFS:', retrievedData);
        }
      }
    } catch (error) {
      console.error('Contract retrieval error:', error);
    } finally {
      isLoading = false;
    }
  }
  
  // Pin content
  async function pinContent() {
    if (!ipfsCID) return;
    
    try {
      const result = await ipfsStore.pin(ipfsCID);
      if (result.success) {
        console.log('Content pinned:', ipfsCID);
      }
    } catch (error) {
      console.error('Pin error:', error);
    }
  }
</script>

<div class="ipfs-example">
  <h2>IPFS Storage Example</h2>
  
  <!-- IPFS Status -->
  <div class="status">
    <strong>IPFS Status:</strong>
    {#if $ipfsStatus.initializing}
      <span class="status-initializing">Initializing...</span>
    {:else if $ipfsStatus.ready}
      <span class="status-ready">✓ Ready</span>
    {:else if $ipfsStatus.error}
      <span class="status-error">✗ Error: {$ipfsStatus.error}</span>
    {:else}
      <span class="status-disconnected">Disconnected</span>
    {/if}
  </div>
  
  <!-- Extended Metadata Form -->
  <div class="form-section">
    <h3>Extended Metadata</h3>
    
    <label>
      Interests (comma separated):
      <input 
        type="text" 
        bind:value={extendedMetadata.interests}
        placeholder="DeFi, NFTs, DAOs"
      />
    </label>
    
    <label>
      Skills (comma separated):
      <input 
        type="text" 
        bind:value={extendedMetadata.skills}
        placeholder="Solidity, JavaScript, Rust"
      />
    </label>
    
    <button 
      on:click={uploadToIPFS} 
      disabled={isUploading || !$ipfsStatus.ready}
    >
      {isUploading ? 'Uploading...' : 'Upload to IPFS'}
    </button>
    
    {#if uploadError}
      <div class="error">{uploadError}</div>
    {/if}
  </div>
  
  <!-- IPFS CID Display -->
  {#if ipfsCID}
    <div class="cid-section">
      <h3>IPFS Content Identifier (CID)</h3>
      <code>{ipfsCID}</code>
      
      <div class="actions">
        <button on:click={retrieveFromIPFS} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Retrieve from IPFS'}
        </button>
        
        <button on:click={pinContent}>
          Pin Content
        </button>
      </div>
    </div>
  {/if}
  
  <!-- DID Actions -->
  {#if $ethersStore.address}
    <div class="did-section">
      <h3>DID-Based Retrieval</h3>
      <p>Your DID: <code>did:ethr:{$ethersStore.address}</code></p>
      
      <div class="actions">
        <button on:click={retrieveByDID} disabled={isLoading}>
          Retrieve by DID
        </button>
        
        <button on:click={retrieveFromContract} disabled={isLoading}>
          Retrieve from Contract
        </button>
      </div>
    </div>
  {/if}
  
  <!-- Retrieved Data Display -->
  {#if retrievedData}
    <div class="data-section">
      <h3>Retrieved Data</h3>
      <pre>{JSON.stringify(retrievedData, null, 2)}</pre>
    </div>
  {/if}
  
  <!-- Usage Instructions -->
  <div class="instructions">
    <h3>How to Use IPFS Storage</h3>
    <ol>
      <li>Wait for IPFS to initialize (status shows "Ready")</li>
      <li>Enter extended metadata (interests, skills, etc.)</li>
      <li>Click "Upload to IPFS" to store data</li>
      <li>Copy the CID for on-chain storage</li>
      <li>Use "Retrieve" buttons to fetch data back</li>
      <li>Pin content to ensure persistence</li>
    </ol>
    
    <h4>Integration with Claims</h4>
    <p>
      When claiming an address, pass the IPFS CID to the smart contract:
    </p>
    <pre><code>await contract.claimAddress(
  address, signature, name, avatar, bio,
  website, twitter, github, publicKey, isPrivate,
  ipfsCID  // ← Pass CID here
);</code></pre>
  </div>
</div>

<style>
  .ipfs-example {
    max-width: 800px;
    margin: 20px auto;
    padding: 20px;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
  }

  .status {
    padding: 10px;
    margin-bottom: 20px;
    border-radius: 8px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
  }

  .status-ready {
    color: #4caf50;
    font-weight: 600;
  }

  .status-error {
    color: #f44336;
    font-weight: 600;
  }

  .status-initializing {
    color: #ff9800;
    font-weight: 600;
  }

  .status-disconnected {
    color: #64748b;
    font-weight: 600;
  }

  .form-section, .cid-section, .did-section, .data-section, .instructions {
    margin: 20px 0;
    padding: 15px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    background: #f8fafc;
  }

  label {
    display: block;
    margin: 10px 0;
    font-weight: 500;
    color: #0f172a;
  }

  input {
    width: 100%;
    padding: 8px;
    margin-top: 5px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #ffffff;
    color: #0f172a;
  }

  input:focus {
    outline: none;
    border-color: #0f172a;
  }

  button {
    padding: 10px 20px;
    margin: 10px 10px 0 0;
    border: none;
    border-radius: 10px;
    background: #0f172a;
    color: #f1f5f9;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    transition: all 0.2s ease;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
  }

  code {
    display: inline-block;
    padding: 5px 10px;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Courier New', monospace;
    word-break: break-all;
    color: #0f172a;
  }

  pre {
    padding: 10px;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow-x: auto;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Courier New', monospace;
  }

  .error {
    color: #f44336;
    margin-top: 10px;
    font-weight: 500;
  }

  .actions {
    margin-top: 10px;
  }

  .instructions ol {
    padding-left: 20px;
    color: #64748b;
  }

  .instructions li {
    margin: 5px 0;
  }

  .instructions h3,
  .instructions h4 {
    color: #0f172a;
    font-weight: 600;
    margin-top: 1.5rem;
  }

  .instructions p {
    color: #64748b;
  }
</style>

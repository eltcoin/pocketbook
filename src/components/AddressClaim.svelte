<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { multiChainStore } from '../stores/multichain';
  import { themeStore } from '../stores/theme';
  import { lookupENSName } from '../utils/ens';

  const dispatch = createEventDispatcher();

  let darkMode = false;
  let connected = false;
  let address = null;
  let loading = false;
  let success = false;
  let error = null;
  let ensName = null;
  let provider = null;

  // Form data
  let formData = {
    name: '',
    avatar: '',
    bio: '',
    website: '',
    twitter: '',
    github: '',
    isPrivate: false
  };

  themeStore.subscribe(value => {
    darkMode = value.darkMode;
  });

  let unsubscribeMultiChain;
  let currentLookupId = 0; // Track the latest lookup request
  
  onMount(() => {
    // Subscribe to multichain store
    unsubscribeMultiChain = multiChainStore.subscribe(async value => {
      connected = value.connected;
      const newAddress = value.primaryAddress;
      const newProvider = value.chains?.[value.primaryChainId]?.provider || null;
      
      // If address or provider changed, update and lookup ENS name
      if (newAddress !== address || newProvider !== provider) {
        address = newAddress;
        provider = newProvider;
        
        // Lookup ENS name if we have both address and provider
        if (address && provider) {
          // Increment lookup ID to track this specific request
          const lookupId = ++currentLookupId;
          
          try {
            const resolvedName = await lookupENSName(address, provider);
            
            // Only update if this is still the most recent lookup
            if (lookupId === currentLookupId) {
              ensName = resolvedName;
            }
          } catch (err) {
            console.error('Error looking up ENS name:', err);
            // Only clear ensName if this is still the most recent lookup
            if (lookupId === currentLookupId) {
              ensName = null;
            }
          }
        } else {
          ensName = null;
        }
      }
    });

    // Cleanup subscription on unmount
    return () => {
      if (unsubscribeMultiChain) {
        unsubscribeMultiChain();
      }
    };
  });

  async function handleClaim() {
    if (!connected) {
      error = 'Please connect your wallet first';
      return;
    }

    if (!formData.name) {
      error = 'Name is required';
      return;
    }

    loading = true;
    error = null;

    try {
      // Create message to sign
      const message = `Claiming address ${address} with name: ${formData.name}`;
      const signature = await multiChainStore.signMessage(message);

      // In a real implementation, this would call the smart contract
      console.log('Claiming address with signature:', signature);

      // Simulate success
      setTimeout(() => {
        success = true;
        loading = false;
        setTimeout(() => {
          dispatch('viewChange', { view: 'address', address });
        }, 2000);
      }, 1500);

    } catch (err) {
      loading = false;
      error = err.message || 'Failed to claim address';
      console.error('Claim error:', err);
    }
  }

  function goBack() {
    dispatch('viewChange', { view: 'explorer' });
  }
</script>

<div class="claim-container" class:dark={darkMode}>
  <div class="claim-header">
    <button class="btn-back" on:click={goBack}>← Back to Explorer</button>
    <h2>🎯 Claim Your Address</h2>
    <p>Register your identity on the blockchain</p>
  </div>

  {#if !connected}
    <div class="warning-box">
      <div class="warning-icon">⚠️</div>
      <div>
        <h3>Wallet Not Connected</h3>
        <p>Please connect your wallet to claim an address</p>
      </div>
    </div>
  {:else}
    <div class="claim-form">
      <div class="current-address">
        <label>Your Address:</label>
        <div class="address-display">{address}</div>
        {#if ensName}
          <div class="ens-info">
            <span class="ens-icon">🏷️</span>
            <span class="ens-text">ENS Name: <strong>{ensName}</strong></span>
          </div>
        {/if}
      </div>

      <div class="form-group">
        <label for="name">Display Name *</label>
        <input
          id="name"
          type="text"
          bind:value={formData.name}
          placeholder="Your Name or ENS"
          required
        />
      </div>

      <div class="form-group">
        <label for="avatar">Avatar (Emoji or URL)</label>
        <input
          id="avatar"
          type="text"
          bind:value={formData.avatar}
          placeholder="😊 or https://..."
        />
      </div>

      <div class="form-group">
        <label for="bio">Biography</label>
        <textarea
          id="bio"
          bind:value={formData.bio}
          placeholder="Tell us about yourself..."
          rows="4"
        ></textarea>
      </div>

      <div class="form-group">
        <label for="website">Website</label>
        <input
          id="website"
          type="url"
          bind:value={formData.website}
          placeholder="https://yourwebsite.com"
        />
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="twitter">Twitter</label>
          <input
            id="twitter"
            type="text"
            bind:value={formData.twitter}
            placeholder="@username"
          />
        </div>

        <div class="form-group">
          <label for="github">GitHub</label>
          <input
            id="github"
            type="text"
            bind:value={formData.github}
            placeholder="username"
          />
        </div>
      </div>

      <div class="form-group checkbox-group">
        <label>
          <input type="checkbox" bind:checked={formData.isPrivate} />
          <span>Make metadata private (visible only to whitelisted addresses)</span>
        </label>
      </div>

      {#if error}
        <div class="error-box">
          {error}
        </div>
      {/if}

      {#if success}
        <div class="success-box">
          ✓ Address claimed successfully! Redirecting...
        </div>
      {/if}

      <div class="form-actions">
        <button class="btn-claim" on:click={handleClaim} disabled={loading || success}>
          {#if loading}
            Claiming...
          {:else if success}
            Claimed ✓
          {:else}
            Claim Address
          {/if}
        </button>
      </div>

      <div class="info-box">
        <strong>ℹ️ How it works:</strong>
        <ul>
          <li>You'll sign a message to prove ownership of your address</li>
          <li>Your metadata will be stored on the blockchain</li>
          <li>All data is cryptographically verified</li>
          <li>You maintain full control and can update or revoke anytime</li>
        </ul>
      </div>
    </div>
  {/if}
</div>

<style>
  .claim-container {
    max-width: 700px;
    margin: 0 auto;
  }

  .claim-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .btn-back {
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 12px;
    cursor: pointer;
    margin-bottom: 1rem;
    font-weight: 600;
    transition: all 0.2s ease;
  }

  .btn-back:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: translateX(-5px);
  }

  .claim-header h2 {
    color: white;
    font-size: 2.5rem;
    margin-bottom: 0.5rem;
  }

  .claim-header p {
    color: rgba(255, 255, 255, 0.9);
    font-size: 1.2rem;
  }

  .warning-box {
    background: white;
    padding: 2rem;
    border-radius: 16px;
    display: flex;
    align-items: center;
    gap: 1.5rem;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  }

  .claim-container.dark .warning-box {
    background: rgba(26, 26, 46, 0.9);
  }

  .warning-icon {
    font-size: 3rem;
  }

  .warning-box h3 {
    color: #ff9800;
    margin-bottom: 0.5rem;
  }

  .warning-box p {
    color: #666;
  }

  .claim-container.dark .warning-box p {
    color: #aaa;
  }

  .claim-form {
    background: white;
    padding: 2rem;
    border-radius: 16px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  }

  .claim-container.dark .claim-form {
    background: rgba(26, 26, 46, 0.9);
  }

  .current-address {
    margin-bottom: 2rem;
    padding: 1rem;
    background: rgba(102, 126, 234, 0.1);
    border-radius: 12px;
  }

  .current-address label {
    display: block;
    color: #666;
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
  }

  .claim-container.dark .current-address label {
    color: #aaa;
  }

  .address-display {
    font-family: 'Courier New', monospace;
    font-weight: 600;
    color: #667eea;
    font-size: 1.1rem;
    word-break: break-all;
  }

  .claim-container.dark .address-display {
    color: #a78bfa;
  }

  .ens-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.75rem;
    padding: 0.75rem;
    background: rgba(139, 92, 246, 0.1);
    border-radius: 8px;
    color: #8b5cf6;
    font-size: 0.95rem;
  }

  .claim-container.dark .ens-info {
    background: rgba(139, 92, 246, 0.2);
    color: #a78bfa;
  }

  .ens-icon {
    font-size: 1.1rem;
  }

  .ens-text {
    flex: 1;
  }

  .ens-text strong {
    font-family: 'Courier New', monospace;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
    color: #333;
  }

  .claim-container.dark label {
    color: #e0e0e0;
  }

  input[type="text"],
  input[type="url"],
  textarea {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-size: 1rem;
    transition: all 0.2s ease;
    background: white;
    color: #333;
  }

  .claim-container.dark input[type="text"],
  .claim-container.dark input[type="url"],
  .claim-container.dark textarea {
    background: rgba(0, 0, 0, 0.3);
    border-color: rgba(255, 255, 255, 0.1);
    color: #e0e0e0;
  }

  input:focus,
  textarea:focus {
    outline: none;
    border-color: #667eea;
  }

  textarea {
    resize: vertical;
    font-family: inherit;
  }

  .checkbox-group label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }

  .checkbox-group input[type="checkbox"] {
    width: auto;
    cursor: pointer;
  }

  .error-box {
    background: #fee;
    color: #c33;
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1rem;
    border: 1px solid #fcc;
  }

  .success-box {
    background: #efe;
    color: #3c3;
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1rem;
    border: 1px solid #cfc;
    font-weight: 600;
  }

  .form-actions {
    margin-top: 2rem;
  }

  .btn-claim {
    width: 100%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 1rem 2rem;
    border-radius: 12px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
  }

  .btn-claim:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
  }

  .btn-claim:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .info-box {
    margin-top: 2rem;
    padding: 1.5rem;
    background: rgba(102, 126, 234, 0.05);
    border-radius: 12px;
    border-left: 4px solid #667eea;
  }

  .claim-container.dark .info-box {
    background: rgba(167, 139, 250, 0.05);
    border-left-color: #a78bfa;
  }

  .info-box strong {
    color: #667eea;
    display: block;
    margin-bottom: 0.5rem;
  }

  .claim-container.dark .info-box strong {
    color: #a78bfa;
  }

  .info-box ul {
    margin: 0;
    padding-left: 1.5rem;
    color: #666;
  }

  .claim-container.dark .info-box ul {
    color: #aaa;
  }

  .info-box li {
    margin-bottom: 0.5rem;
  }

  @media (max-width: 768px) {
    .claim-header h2 {
      font-size: 1.8rem;
    }

    .form-row {
      grid-template-columns: 1fr;
    }

    .claim-form {
      padding: 1.5rem;
    }
  }
</style>

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
    pgpSignature: '',
    isPrivate: false
  };

  themeStore.subscribe(value => {
    darkMode = value.darkMode;
  });

  let unsubscribeMultiChain;
  let currentLookupId = 0; // Track the latest lookup request
  let isMounted = true; // Track component mount state
  
  onMount(() => {
    isMounted = true;
    
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
            
            // Only update if this is still the most recent lookup and component is still mounted
            if (lookupId === currentLookupId && isMounted) {
              ensName = resolvedName;
            }
          } catch (err) {
            console.error('Error looking up ENS name:', err);
            // Only clear ensName if this is still the most recent lookup and component is still mounted
            if (lookupId === currentLookupId && isMounted) {
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
      isMounted = false;
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

      <div class="form-group">
        <label for="pgpSignature">PGP Signature (Optional)</label>
        <textarea
          id="pgpSignature"
          bind:value={formData.pgpSignature}
          placeholder="-----BEGIN PGP SIGNATURE-----&#10;...&#10;-----END PGP SIGNATURE-----"
          rows="6"
        ></textarea>
        <small class="form-hint">Add your PGP signature for additional verification</small>
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
    background: #f1f5f9;
    color: #0f172a;
    border: 1px solid #e2e8f0;
    padding: 0.75rem 1.5rem;
    border-radius: 10px;
    cursor: pointer;
    margin-bottom: 1rem;
    font-weight: 600;
    transition: all 0.2s ease;
  }

  .claim-container.dark .btn-back {
    background: #334155;
    color: #f1f5f9;
    border-color: #334155;
  }

  .btn-back:hover {
    transform: translateX(-5px);
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
  }

  .claim-header h2 {
    color: #0f172a;
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
  }

  .claim-container.dark .claim-header h2 {
    color: #f1f5f9;
  }

  .claim-header p {
    color: #64748b;
    font-size: 1.2rem;
  }

  .claim-container.dark .claim-header p {
    color: #94a3b8;
  }

  .warning-box {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    padding: 2rem;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 1.5rem;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
  }

  .claim-container.dark .warning-box {
    background: #1e293b;
    border-color: #334155;
  }

  .warning-icon {
    font-size: 3rem;
  }

  .warning-box h3 {
    color: #ff9800;
    margin-bottom: 0.5rem;
    font-weight: 600;
  }

  .warning-box p {
    color: #64748b;
  }

  .claim-container.dark .warning-box p {
    color: #94a3b8;
  }

  .claim-form {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
  }

  .claim-container.dark .claim-form {
    background: #1e293b;
    border-color: #334155;
  }

  .current-address {
    margin-bottom: 2rem;
    padding: 1rem;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
  }

  .claim-container.dark .current-address {
    background: #334155;
    border-color: #334155;
  }

  .current-address label {
    display: block;
    color: #64748b;
    font-size: 0.9rem;
    font-weight: 500;
    margin-bottom: 0.5rem;
  }

  .claim-container.dark .current-address label {
    color: #94a3b8;
  }

  .address-display {
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Courier New', monospace;
    font-weight: 600;
    color: #0f172a;
    font-size: 1.1rem;
    word-break: break-all;
  }

  .claim-container.dark .address-display {
    color: #f1f5f9;
  }

  .ens-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.75rem;
    padding: 0.75rem;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    color: #0f172a;
    font-size: 0.95rem;
  }

  .claim-container.dark .ens-info {
    background: #334155;
    border-color: #334155;
    color: #f1f5f9;
  }

  .ens-icon {
    font-size: 1.1rem;
  }

  .ens-text {
    flex: 1;
  }

  .ens-text strong {
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Courier New', monospace;
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
    font-weight: 500;
    color: #0f172a;
  }

  .claim-container.dark label {
    color: #f1f5f9;
  }

  input[type="text"],
  input[type="url"],
  textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 1rem;
    transition: all 0.2s ease;
    background: #ffffff;
    color: #0f172a;
  }

  .claim-container.dark input[type="text"],
  .claim-container.dark input[type="url"],
  .claim-container.dark textarea {
    background: #1e293b;
    border-color: #334155;
    color: #f1f5f9;
  }

  input:focus,
  textarea:focus {
    outline: none;
    border-color: #0f172a;
  }

  .claim-container.dark input:focus,
  .claim-container.dark textarea:focus {
    border-color: #f1f5f9;
  }

  textarea {
    resize: vertical;
    font-family: inherit;
  }

  .form-hint {
    display: block;
    margin-top: 0.25rem;
    font-size: 0.875rem;
    color: #64748b;
  }

  .claim-container.dark .form-hint {
    color: #94a3b8;
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
    background: #0f172a;
    color: #f1f5f9;
    border: none;
    padding: 1rem 2rem;
    border-radius: 10px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
  }

  .claim-container.dark .btn-claim {
    background: #f1f5f9;
    color: #0f172a;
  }

  .btn-claim:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
  }

  .btn-claim:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .info-box {
    margin-top: 2rem;
    padding: 1.5rem;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    border-left: 4px solid #0f172a;
  }

  .claim-container.dark .info-box {
    background: #334155;
    border-color: #334155;
    border-left-color: #f1f5f9;
  }

  .info-box strong {
    color: #0f172a;
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
  }

  .claim-container.dark .info-box strong {
    color: #f1f5f9;
  }

  .info-box ul {
    margin: 0;
    padding-left: 1.5rem;
    color: #64748b;
  }

  .claim-container.dark .info-box ul {
    color: #94a3b8;
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

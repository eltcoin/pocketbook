<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { multiChainStore } from '../stores/multichain';
  import { themeStore } from '../stores/theme';
  import MultiChainView from './MultiChainView.svelte';

  export let address;

  const dispatch = createEventDispatcher();

  let darkMode = false;
  let loading = true;
  let isClaimed = false;
  let claimData = null;
  let isOwner = false;
  let userAddress = null;

  themeStore.subscribe(value => {
    darkMode = value.darkMode;
  });

  multiChainStore.subscribe(value => {
    userAddress = value.primaryAddress;
  });

  onMount(async () => {
    // Simulate fetching claim data
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock claimed data
    if (address === '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1') {
      isClaimed = true;
      claimData = {
        name: 'Alice.eth',
        avatar: '👤',
        bio: 'Blockchain enthusiast and developer. Building the decentralized future.',
        website: 'https://alice.eth.link',
        twitter: '@alice_eth',
        github: 'alice-eth',
        claimTime: Date.now() - 86400000,
        isPrivate: false
      };
      isOwner = userAddress === address;
    } else {
      isClaimed = false;
    }
    
    loading = false;
  });

  function goBack() {
    dispatch('viewChange', { view: 'explorer' });
  }

  function claimAddress() {
    dispatch('viewChange', { view: 'claim' });
  }

  function shortenAddress(addr) {
    return `${addr.substring(0, 10)}...${addr.substring(addr.length - 8)}`;
  }

  function formatDate(timestamp) {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
</script>

<div class="address-view" class:dark={darkMode}>
  <div class="address-header">
    <button class="btn-back" on:click={goBack}>← Back to Explorer</button>
  </div>

  {#if loading}
    <div class="loading">
      <div class="spinner"></div>
      <p>Loading address information...</p>
    </div>
  {:else if isClaimed}
    <div class="claimed-profile">
      <div class="profile-card">
        <div class="profile-avatar">
          {#if claimData.avatar.startsWith('http')}
            <img src={claimData.avatar} alt={claimData.name} />
          {:else}
            <div class="avatar-emoji">{claimData.avatar}</div>
          {/if}
        </div>
        
        <div class="profile-header">
          <h1>{claimData.name}</h1>
          <div class="address-badge">
            <span class="verified-icon">✓</span>
            <span class="address-text">{shortenAddress(address)}</span>
          </div>
          {#if isOwner}
            <div class="owner-badge">You own this address</div>
          {/if}
        </div>

        {#if claimData.bio}
          <div class="profile-section">
            <h3>📝 Biography</h3>
            <p>{claimData.bio}</p>
          </div>
        {/if}

        <div class="profile-section">
          <h3>🔗 Links</h3>
          <div class="links-grid">
            {#if claimData.website}
              <a href={claimData.website} target="_blank" rel="noopener" class="link-item">
                <span class="link-icon">🌐</span>
                <span>Website</span>
              </a>
            {/if}
            {#if claimData.twitter}
              <a href={`https://twitter.com/${claimData.twitter.replace('@', '')}`} target="_blank" rel="noopener" class="link-item">
                <span class="link-icon">🐦</span>
                <span>Twitter</span>
              </a>
            {/if}
            {#if claimData.github}
              <a href={`https://github.com/${claimData.github}`} target="_blank" rel="noopener" class="link-item">
                <span class="link-icon">💻</span>
                <span>GitHub</span>
              </a>
            {/if}
          </div>
        </div>

        <div class="profile-section">
          <h3>ℹ️ Claim Information</h3>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Claimed On:</div>
              <div class="info-value">{formatDate(claimData.claimTime)}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Status:</div>
              <div class="info-value status-active">Active</div>
            </div>
            <div class="info-item">
              <div class="info-label">Privacy:</div>
              <div class="info-value">{claimData.isPrivate ? 'Private' : 'Public'}</div>
            </div>
          </div>
        </div>

        {#if isOwner}
          <div class="owner-actions">
            <button class="btn-action btn-edit">Edit Profile</button>
            <button class="btn-action btn-manage">Manage Privacy</button>
          </div>
        {/if}
      </div>

      <MultiChainView {address} />

      <div class="verification-box">
        <h3>🔐 Cryptographic Verification</h3>
        <p>This claim is secured by a cryptographic signature proving ownership of the address.</p>
        <div class="verification-details">
          <div class="verification-item">
            <span class="verification-label">Signature:</span>
            <span class="verification-value">0x8f7a...</span>
          </div>
          <div class="verification-item">
            <span class="verification-label">Verified:</span>
            <span class="verification-value verified">✓ Yes</span>
          </div>
        </div>
      </div>
    </div>
  {:else}
    <div class="unclaimed-view">
      <div class="unclaimed-card">
        <div class="unclaimed-icon">🔓</div>
        <h2>Unclaimed Address</h2>
        <div class="address-display">{address}</div>
        <p>This address has not been claimed yet. The owner can claim it to add verified metadata.</p>
        
        {#if userAddress === address}
          <button class="btn-claim-now" on:click={claimAddress}>
            Claim This Address
          </button>
        {:else}
          <div class="info-message">
            Only the owner of this address can claim it.
          </div>
        {/if}
      </div>

      <MultiChainView {address} />

      <div class="what-is-claiming">
        <h3>What is Address Claiming?</h3>
        <div class="feature-list">
          <div class="feature-item">
            <span class="feature-icon">🎯</span>
            <div>
              <strong>Own Your Identity</strong>
              <p>Attach verifiable metadata to your Ethereum address</p>
            </div>
          </div>
          <div class="feature-item">
            <span class="feature-icon">🔐</span>
            <div>
              <strong>Cryptographically Secured</strong>
              <p>All claims are signed and verified on-chain</p>
            </div>
          </div>
          <div class="feature-item">
            <span class="feature-icon">🌐</span>
            <div>
              <strong>Decentralized Network</strong>
              <p>Build your web of trust without central authorities</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .address-view {
    max-width: 800px;
    margin: 0 auto;
  }

  .address-header {
    margin-bottom: 2rem;
  }

  .btn-back {
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 12px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s ease;
  }

  .btn-back:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: translateX(-5px);
  }

  .loading {
    text-align: center;
    padding: 4rem 2rem;
    background: white;
    border-radius: 16px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  }

  .address-view.dark .loading {
    background: rgba(26, 26, 46, 0.9);
  }

  .spinner {
    width: 60px;
    height: 60px;
    margin: 0 auto 1rem;
    border: 4px solid rgba(102, 126, 234, 0.2);
    border-top-color: #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .loading p {
    color: #666;
  }

  .address-view.dark .loading p {
    color: #aaa;
  }

  .claimed-profile {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .profile-card {
    background: white;
    padding: 2.5rem;
    border-radius: 16px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  }

  .address-view.dark .profile-card {
    background: rgba(26, 26, 46, 0.9);
  }

  .profile-avatar {
    width: 120px;
    height: 120px;
    margin: 0 auto 1.5rem;
    border-radius: 20px;
    overflow: hidden;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .profile-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .avatar-emoji {
    font-size: 5rem;
  }

  .profile-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .profile-header h1 {
    color: #333;
    margin-bottom: 0.75rem;
    font-size: 2rem;
  }

  .address-view.dark .profile-header h1 {
    color: #e0e0e0;
  }

  .address-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    background: rgba(102, 126, 234, 0.1);
    padding: 0.5rem 1rem;
    border-radius: 12px;
    font-family: 'Courier New', monospace;
    color: #667eea;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }

  .address-view.dark .address-badge {
    background: rgba(167, 139, 250, 0.1);
    color: #a78bfa;
  }

  .verified-icon {
    color: #4caf50;
  }

  .owner-badge {
    display: inline-block;
    background: rgba(76, 175, 80, 0.1);
    color: #4caf50;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 600;
    margin-top: 0.5rem;
  }

  .profile-section {
    margin-bottom: 2rem;
  }

  .profile-section h3 {
    color: #667eea;
    margin-bottom: 1rem;
    font-size: 1.2rem;
  }

  .address-view.dark .profile-section h3 {
    color: #a78bfa;
  }

  .profile-section p {
    color: #666;
    line-height: 1.6;
  }

  .address-view.dark .profile-section p {
    color: #aaa;
  }

  .links-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1rem;
  }

  .link-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background: rgba(102, 126, 234, 0.05);
    border-radius: 12px;
    text-decoration: none;
    color: #667eea;
    font-weight: 600;
    transition: all 0.2s ease;
  }

  .address-view.dark .link-item {
    background: rgba(167, 139, 250, 0.05);
    color: #a78bfa;
  }

  .link-item:hover {
    background: rgba(102, 126, 234, 0.1);
    transform: translateY(-2px);
  }

  .link-icon {
    font-size: 1.5rem;
  }

  .info-grid {
    display: grid;
    gap: 1rem;
  }

  .info-item {
    display: flex;
    justify-content: space-between;
    padding: 0.75rem;
    background: rgba(0, 0, 0, 0.02);
    border-radius: 8px;
  }

  .address-view.dark .info-item {
    background: rgba(255, 255, 255, 0.02);
  }

  .info-label {
    color: #666;
    font-weight: 600;
  }

  .address-view.dark .info-label {
    color: #aaa;
  }

  .info-value {
    color: #333;
  }

  .address-view.dark .info-value {
    color: #e0e0e0;
  }

  .status-active {
    color: #4caf50 !important;
    font-weight: 600;
  }

  .owner-actions {
    display: flex;
    gap: 1rem;
    margin-top: 2rem;
  }

  .btn-action {
    flex: 1;
    padding: 1rem;
    border: none;
    border-radius: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-edit {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .btn-edit:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
  }

  .btn-manage {
    background: rgba(102, 126, 234, 0.1);
    color: #667eea;
  }

  .address-view.dark .btn-manage {
    background: rgba(167, 139, 250, 0.1);
    color: #a78bfa;
  }

  .btn-manage:hover {
    background: rgba(102, 126, 234, 0.2);
  }

  .verification-box {
    background: white;
    padding: 2rem;
    border-radius: 16px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  }

  .address-view.dark .verification-box {
    background: rgba(26, 26, 46, 0.9);
  }

  .verification-box h3 {
    color: #667eea;
    margin-bottom: 1rem;
  }

  .address-view.dark .verification-box h3 {
    color: #a78bfa;
  }

  .verification-box p {
    color: #666;
    margin-bottom: 1.5rem;
  }

  .address-view.dark .verification-box p {
    color: #aaa;
  }

  .verification-details {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .verification-item {
    display: flex;
    justify-content: space-between;
    padding: 0.75rem;
    background: rgba(102, 126, 234, 0.05);
    border-radius: 8px;
  }

  .address-view.dark .verification-item {
    background: rgba(167, 139, 250, 0.05);
  }

  .verification-label {
    color: #666;
    font-weight: 600;
  }

  .address-view.dark .verification-label {
    color: #aaa;
  }

  .verification-value {
    font-family: 'Courier New', monospace;
    color: #333;
  }

  .address-view.dark .verification-value {
    color: #e0e0e0;
  }

  .verified {
    color: #4caf50 !important;
    font-weight: 600;
  }

  .unclaimed-view {
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .unclaimed-card {
    background: white;
    padding: 3rem 2rem;
    border-radius: 16px;
    text-align: center;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  }

  .address-view.dark .unclaimed-card {
    background: rgba(26, 26, 46, 0.9);
  }

  .unclaimed-icon {
    font-size: 5rem;
    margin-bottom: 1rem;
  }

  .unclaimed-card h2 {
    color: #333;
    margin-bottom: 1rem;
  }

  .address-view.dark .unclaimed-card h2 {
    color: #e0e0e0;
  }

  .address-display {
    font-family: 'Courier New', monospace;
    background: rgba(102, 126, 234, 0.1);
    padding: 1rem;
    border-radius: 12px;
    color: #667eea;
    font-weight: 600;
    word-break: break-all;
    margin: 1.5rem 0;
  }

  .address-view.dark .address-display {
    background: rgba(167, 139, 250, 0.1);
    color: #a78bfa;
  }

  .unclaimed-card p {
    color: #666;
    margin-bottom: 2rem;
  }

  .address-view.dark .unclaimed-card p {
    color: #aaa;
  }

  .btn-claim-now {
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

  .btn-claim-now:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
  }

  .info-message {
    color: #666;
    font-style: italic;
  }

  .address-view.dark .info-message {
    color: #aaa;
  }

  .what-is-claiming {
    background: white;
    padding: 2rem;
    border-radius: 16px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  }

  .address-view.dark .what-is-claiming {
    background: rgba(26, 26, 46, 0.9);
  }

  .what-is-claiming h3 {
    color: #667eea;
    margin-bottom: 1.5rem;
  }

  .address-view.dark .what-is-claiming h3 {
    color: #a78bfa;
  }

  .feature-list {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .feature-item {
    display: flex;
    gap: 1rem;
    align-items: flex-start;
  }

  .feature-icon {
    font-size: 2rem;
  }

  .feature-item strong {
    display: block;
    color: #333;
    margin-bottom: 0.25rem;
  }

  .address-view.dark .feature-item strong {
    color: #e0e0e0;
  }

  .feature-item p {
    color: #666;
    margin: 0;
  }

  .address-view.dark .feature-item p {
    color: #aaa;
  }

  @media (max-width: 768px) {
    .profile-card,
    .verification-box,
    .unclaimed-card,
    .what-is-claiming {
      padding: 1.5rem;
    }

    .profile-header h1 {
      font-size: 1.5rem;
    }

    .owner-actions {
      flex-direction: column;
    }

    .links-grid {
      grid-template-columns: 1fr;
    }
  }
</style>

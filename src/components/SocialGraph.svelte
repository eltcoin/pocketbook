<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { multiChainStore } from '../stores/multichain';
  import { themeStore } from '../stores/theme';
  import { toastStore } from '../stores/toast';
  import Icon from './Icon.svelte';

  export let address;
  export let isOwner = false;

  const dispatch = createEventDispatcher();

  let darkMode = false;
  let loading = true;
  const EMPTY_SOCIAL_GRAPH = {
    following: [],
    followers: [],
    friends: []
  };
  const EMPTY_PENDING_REQUESTS = {
    sent: [],
    received: []
  };
  let socialGraph = { ...EMPTY_SOCIAL_GRAPH };
  let userAddress = null;
  let contract = null;
  let activeTab = 'followers'; // followers, following, friends
  let primaryChainId = null;
  let primaryNetworkName = null;
  let pendingFriendRequests = { ...EMPTY_PENDING_REQUESTS };
  let globalPendingRequests = { ...EMPTY_PENDING_REQUESTS };
  let pendingLoading = false;
  let lastLoadedAddress = null;
  let lastLoadedChainId = null;
  let loadSequence = 0;
  let hasClaimOnPrimaryChain = false;
  let canCheckClaimStatus = false;
  let claimStatusLoading = true;
  
  // Relationship status with this user
  let isFollowingUser = false;
  let userIsFollowing = false;
  let areFriendsWithUser = false;
  let hasPendingRequest = false;
  let hasReceivedRequest = false;

  themeStore.subscribe(value => {
    darkMode = value.darkMode;
  });

  multiChainStore.subscribe(value => {
    userAddress = value.primaryAddress;
    primaryChainId = value.primaryChainId;
    const chainEntry = value.chains?.[value.primaryChainId];
    contract = chainEntry?.contract || null;
    primaryNetworkName = chainEntry?.networkConfig?.name || null;
    globalPendingRequests = value.pendingFriendRequests || { ...EMPTY_PENDING_REQUESTS };
  });

  onMount(async () => {
    await initializeData();
  });

  $: if (address && (address !== lastLoadedAddress || primaryChainId !== lastLoadedChainId)) {
    initializeData();
  }

  async function initializeData() {
    if (!address) {
      socialGraph = { ...EMPTY_SOCIAL_GRAPH };
      pendingFriendRequests = { ...EMPTY_PENDING_REQUESTS };
      claimStatusLoading = false;
      return;
    }

    const targetAddress = address;
    const targetChainId = primaryChainId;
    const currentContract = contract;
    const sequence = ++loadSequence;

    if (currentContract && targetChainId) {
      canCheckClaimStatus = true;
      claimStatusLoading = true;
      let claimResult = false;

      try {
        const response = await multiChainStore.checkClaimOnChain(targetChainId, targetAddress);
        claimResult = Boolean(response?.success && response?.isClaimed);
      } catch (error) {
        console.error('Error checking claim status:', error);
      }

      if (sequence !== loadSequence) {
        return;
      }

      hasClaimOnPrimaryChain = claimResult;
      claimStatusLoading = false;
    } else {
      canCheckClaimStatus = false;
      hasClaimOnPrimaryChain = false;
      claimStatusLoading = false;
    }

    if (!currentContract || !hasClaimOnPrimaryChain) {
      socialGraph = { ...EMPTY_SOCIAL_GRAPH };
      if (!isOwner) {
        pendingFriendRequests = { ...EMPTY_PENDING_REQUESTS };
      }
      loading = false;
      pendingLoading = false;
      lastLoadedAddress = targetAddress;
      lastLoadedChainId = targetChainId;
      return;
    }

    await loadSocialGraph();
    await loadPendingRequests();
    if (userAddress && userAddress !== targetAddress) {
      await checkRelationshipStatus();
    }
    lastLoadedAddress = targetAddress;
    lastLoadedChainId = targetChainId;
  }

  $: if (isOwner) {
    pendingFriendRequests = hasClaimOnPrimaryChain
      ? (globalPendingRequests || { ...EMPTY_PENDING_REQUESTS })
      : { ...EMPTY_PENDING_REQUESTS };
  }

  async function loadSocialGraph() {
    if (!contract || !hasClaimOnPrimaryChain) {
      socialGraph = { ...EMPTY_SOCIAL_GRAPH };
      loading = false;
      return;
    }

    loading = true;
    try {
      const result = await contract.getSocialGraph(address);
      socialGraph = {
        following: result[0] || [],
        followers: result[1] || [],
        friends: result[2] || []
      };
    } catch (error) {
      console.error('Error loading social graph:', error);
      toastStore.show('Failed to load social graph', 'error');
    } finally {
      loading = false;
    }
  }

  async function loadPendingRequests(force = false) {
    if (!hasClaimOnPrimaryChain || !address || !primaryChainId) {
      if (!isOwner) {
        pendingFriendRequests = { ...EMPTY_PENDING_REQUESTS };
      }
      pendingLoading = false;
      return;
    }

    if (isOwner && !force) {
      pendingFriendRequests = globalPendingRequests || { ...EMPTY_PENDING_REQUESTS };
      pendingLoading = false;
      return;
    }

    pendingLoading = true;
    try {
      const pending = await multiChainStore.refreshPendingFriendRequests({
        address,
        chainId: primaryChainId
      });
      pendingFriendRequests = pending;
    } catch (error) {
      console.error('Error loading pending friend requests:', error);
    } finally {
      pendingLoading = false;
    }
  }

  async function checkRelationshipStatus() {
    try {
      if (contract && userAddress && hasClaimOnPrimaryChain) {
        isFollowingUser = await contract.isFollowing(userAddress, address);
        userIsFollowing = await contract.isFollowing(address, userAddress);
        areFriendsWithUser = await contract.areFriends(userAddress, address);
        hasPendingRequest = await contract.hasPendingFriendRequest(userAddress, address);
        hasReceivedRequest = await contract.hasPendingFriendRequest(address, userAddress);
      }
    } catch (error) {
      console.error('Error checking relationship status:', error);
    }
  }

  function ensureTargetClaimReady() {
    if (claimStatusLoading) {
      toastStore.show('Checking claim status, please try again in a moment.', 'info');
      return false;
    }

    if (!contract) {
      toastStore.show('Connect your wallet to interact with the social graph.', 'error');
      return false;
    }

    if (!hasClaimOnPrimaryChain) {
      const suffix = primaryNetworkName ? `on ${primaryNetworkName}` : 'on this network';
      toastStore.show(`This address has not been claimed ${suffix} yet.`, 'error');
      return false;
    }

    return true;
  }

  async function handleFollow() {
    if (!ensureTargetClaimReady()) return;
    try {
      const tx = await contract.followUser(address);
      await tx.wait();
      toastStore.show('Successfully followed user', 'success');
      await loadSocialGraph();
      await checkRelationshipStatus();
    } catch (error) {
      console.error('Error following user:', error);
      toastStore.show('Failed to follow user', 'error');
    }
  }

  async function handleUnfollow() {
    if (!ensureTargetClaimReady()) return;
    try {
      const tx = await contract.unfollowUser(address);
      await tx.wait();
      toastStore.show('Successfully unfollowed user', 'success');
      await loadSocialGraph();
      await checkRelationshipStatus();
    } catch (error) {
      console.error('Error unfollowing user:', error);
      toastStore.show('Failed to unfollow user', 'error');
    }
  }

  async function handleSendFriendRequest() {
    if (!ensureTargetClaimReady()) return;
    try {
      const tx = await contract.sendFriendRequest(address);
      await tx.wait();
      toastStore.show('Friend request sent', 'success');
      await checkRelationshipStatus();
      await loadPendingRequests(true);
      await multiChainStore.refreshPendingFriendRequests();
    } catch (error) {
      console.error('Error sending friend request:', error);
      toastStore.show('Failed to send friend request', 'error');
    }
  }

  async function handleAcceptFriendRequest(targetAddress = address) {
    if (!ensureTargetClaimReady()) return;
    try {
      const tx = await contract.acceptFriendRequest(targetAddress);
      await tx.wait();
      toastStore.show('Friend request accepted', 'success');
      await loadSocialGraph();
      await checkRelationshipStatus();
      await loadPendingRequests(true);
      await multiChainStore.refreshPendingFriendRequests();
    } catch (error) {
      console.error('Error accepting friend request:', error);
      toastStore.show('Failed to accept friend request', 'error');
    }
  }

  async function handleDeclineFriendRequest(targetAddress = address) {
    if (!ensureTargetClaimReady()) return;
    try {
      const tx = await contract.declineFriendRequest(targetAddress);
      await tx.wait();
      toastStore.show('Friend request declined', 'success');
      await loadSocialGraph();
      await checkRelationshipStatus();
      await loadPendingRequests(true);
      await multiChainStore.refreshPendingFriendRequests();
    } catch (error) {
      console.error('Error declining friend request:', error);
      toastStore.show('Failed to decline friend request', 'error');
    }
  }

  async function handleCancelFriendRequest(targetAddress = address) {
    if (!ensureTargetClaimReady()) return;
    try {
      const tx = await contract.cancelFriendRequest(targetAddress);
      await tx.wait();
      toastStore.show('Friend request cancelled', 'success');
      await checkRelationshipStatus();
      await loadPendingRequests(true);
      await multiChainStore.refreshPendingFriendRequests();
    } catch (error) {
      console.error('Error cancelling friend request:', error);
      toastStore.show('Failed to cancel friend request', 'error');
    }
  }

  async function handleRemoveFriend() {
    if (!ensureTargetClaimReady()) return;
    try {
      const tx = await contract.removeFriend(address);
      await tx.wait();
      toastStore.show('Friend removed', 'success');
      await loadSocialGraph();
      await checkRelationshipStatus();
      await loadPendingRequests(true);
      await multiChainStore.refreshPendingFriendRequests();
    } catch (error) {
      console.error('Error removing friend:', error);
      toastStore.show('Failed to remove friend', 'error');
    }
  }

  function shortenAddress(addr) {
    return `${addr.substring(0, 10)}...${addr.substring(addr.length - 8)}`;
  }

  function viewAddress(addr) {
    dispatch('viewAddress', { view: 'address', address: addr });
  }
</script>

<div class="social-graph" class:dark={darkMode}>
  <div class="social-header">
    <h2>
      <Icon name="network-wired" size="1.75rem" />
      <span>Social Network</span>
    </h2>
    
    {#if !isOwner && userAddress && userAddress !== address && contract && hasClaimOnPrimaryChain}
      <div class="action-buttons">
        {#if areFriendsWithUser}
          <button class="btn-social btn-friends" on:click={handleRemoveFriend}>
            ✓ Friends
          </button>
        {:else if hasReceivedRequest}
          <div class="request-action-group">
            <button class="btn-social btn-accept" on:click={() => handleAcceptFriendRequest()}>
              Accept
            </button>
            <button class="btn-social btn-decline" on:click={() => handleDeclineFriendRequest(address)}>
              Decline
            </button>
          </div>
        {:else if hasPendingRequest}
          <button class="btn-social btn-cancel" on:click={() => handleCancelFriendRequest(address)}>
            Cancel Friend Request
          </button>
        {:else}
          <button class="btn-social btn-add-friend" on:click={handleSendFriendRequest}>
            Add Friend
          </button>
        {/if}
        
        {#if isFollowingUser}
          <button class="btn-social btn-unfollow" on:click={handleUnfollow}>
            Unfollow
          </button>
        {:else}
          <button class="btn-social btn-follow" on:click={handleFollow}>
            Follow
          </button>
        {/if}
      </div>
    {/if}
  </div>

  {#if isOwner && hasClaimOnPrimaryChain && canCheckClaimStatus}
    <div class="pending-requests-card">
      <div class="card-header">
        <h3>Pending Friend Requests</h3>
        {#if pendingLoading}
          <span class="pending-status">Checking...</span>
        {/if}
      </div>

      {#if pendingLoading}
        <p class="pending-message">Fetching your pending requests…</p>
      {:else if pendingFriendRequests.received.length === 0 && pendingFriendRequests.sent.length === 0}
        <p class="pending-message">No pending friend requests right now.</p>
      {:else}
        {#if pendingFriendRequests.received.length > 0}
          <div class="pending-section">
            <h4>Received</h4>
            {#each pendingFriendRequests.received as requester}
              <div class="pending-item">
                <span class="pending-address">{shortenAddress(requester)}</span>
                <div class="pending-actions">
                  <button class="btn-social btn-accept" on:click={() => handleAcceptFriendRequest(requester)}>Accept</button>
                  <button class="btn-social btn-decline" on:click={() => handleDeclineFriendRequest(requester)}>Decline</button>
                </div>
              </div>
            {/each}
          </div>
        {/if}

        {#if pendingFriendRequests.sent.length > 0}
          <div class="pending-section">
            <h4>Sent</h4>
            {#each pendingFriendRequests.sent as recipient}
              <div class="pending-item">
                <span class="pending-address">{shortenAddress(recipient)}</span>
                <div class="pending-actions">
                  <button class="btn-social btn-cancel" on:click={() => handleCancelFriendRequest(recipient)}>Cancel</button>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      {/if}
    </div>
  {/if}

  {#if !canCheckClaimStatus}
    <div class="claim-required">
      <Icon name="tools" size="1.5rem" />
      <p>Connect your wallet and switch to a supported network to view social activity.</p>
    </div>
  {:else if claimStatusLoading}
    <div class="loading">
      <div class="spinner"></div>
      <p>Checking claim status...</p>
    </div>
  {:else if !hasClaimOnPrimaryChain}
    <div class="claim-required">
      <Icon name="shield-alt" size="1.5rem" />
      <p>This address hasn't claimed its Pocketbook identity {primaryNetworkName ? `on ${primaryNetworkName}` : 'on this network'} yet, so social features are unavailable.</p>
    </div>
  {:else if loading}
    <div class="loading">
      <div class="spinner"></div>
      <p>Loading social graph...</p>
    </div>
  {:else}
    <div class="social-stats">
      <button type="button" class="stat-item" on:click={() => activeTab = 'followers'} class:active={activeTab === 'followers'}>
        <div class="stat-value">{socialGraph.followers.length}</div>
        <div class="stat-label">Followers</div>
      </button>
      <button type="button" class="stat-item" on:click={() => activeTab = 'following'} class:active={activeTab === 'following'}>
        <div class="stat-value">{socialGraph.following.length}</div>
        <div class="stat-label">Following</div>
      </button>
      <button type="button" class="stat-item" on:click={() => activeTab = 'friends'} class:active={activeTab === 'friends'}>
        <div class="stat-value">{socialGraph.friends.length}</div>
        <div class="stat-label">Friends</div>
      </button>
    </div>

    <div class="social-content">
      {#if activeTab === 'followers'}
        <div class="address-list">
          <h3>Followers</h3>
          {#if socialGraph.followers.length === 0}
            <p class="empty-message">No followers yet</p>
          {:else}
            {#each socialGraph.followers as follower}
              <button type="button" class="address-item" on:click={() => viewAddress(follower)}>
                <span class="address-icon">👤</span>
                <span class="address-text">{shortenAddress(follower)}</span>
                <span class="arrow">→</span>
              </button>
            {/each}
          {/if}
        </div>
      {:else if activeTab === 'following'}
        <div class="address-list">
          <h3>Following</h3>
          {#if socialGraph.following.length === 0}
            <p class="empty-message">Not following anyone yet</p>
          {:else}
            {#each socialGraph.following as following}
              <button type="button" class="address-item" on:click={() => viewAddress(following)}>
                <span class="address-icon">👤</span>
                <span class="address-text">{shortenAddress(following)}</span>
                <span class="arrow">→</span>
              </button>
            {/each}
          {/if}
        </div>
      {:else if activeTab === 'friends'}
        <div class="address-list">
          <h3>Friends</h3>
          {#if socialGraph.friends.length === 0}
            <p class="empty-message">No friends yet</p>
          {:else}
            {#each socialGraph.friends as friend}
              <button type="button" class="address-item" on:click={() => viewAddress(friend)}>
                <span class="address-icon">👥</span>
                <span class="address-text">{shortenAddress(friend)}</span>
                <span class="arrow">→</span>
              </button>
            {/each}
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .social-graph {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 2rem;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
    margin-top: 2rem;
  }

  .social-graph.dark {
    background: #1e293b;
    border-color: #334155;
    color: #f1f5f9;
  }

  .social-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .social-header h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
  }

  .action-buttons {
    display: flex;
    gap: 0.5rem;
  }

  .btn-social {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 10px;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-follow {
    background: #0f172a;
    color: #f1f5f9;
  }

  .social-graph.dark .btn-follow {
    background: #f1f5f9;
    color: #0f172a;
  }

  .btn-follow:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
  }

  .btn-unfollow {
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    color: #0f172a;
  }

  .social-graph.dark .btn-unfollow {
    background: #334155;
    border-color: #334155;
    color: #f1f5f9;
  }

  .btn-unfollow:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
  }

  .btn-add-friend {
    background: #48bb78;
    color: white;
  }

  .btn-add-friend:hover {
    background: #38a169;
  }

  .btn-pending {
    background: #cbd5e0;
    color: #4a5568;
    cursor: not-allowed;
  }

  .btn-accept {
    background: #48bb78;
    color: white;
  }

  .btn-accept:hover {
    background: #38a169;
  }

  .btn-decline {
    background: #f87171;
    color: white;
  }

  .btn-decline:hover {
    background: #ef4444;
  }

  .btn-cancel {
    background: #e2e8f0;
    color: #1e293b;
  }

  .btn-cancel:hover {
    background: #cbd5e1;
  }

  .btn-friends {
    background: #4299e1;
    color: white;
  }

  .btn-friends:hover {
    background: #3182ce;
  }

  .request-action-group {
    display: flex;
    gap: 0.5rem;
  }

  .pending-requests-card {
    margin-top: 1.5rem;
    padding: 1.5rem;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
  }

  .social-graph.dark .pending-requests-card {
    background: #0f172a;
    border-color: #334155;
  }

  .pending-requests-card h3 {
    margin: 0;
    font-size: 1.2rem;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .pending-status {
    font-size: 0.85rem;
    color: #64748b;
  }

  .social-graph.dark .pending-status {
    color: #94a3b8;
  }

  .pending-message {
    margin: 0;
    color: #64748b;
    font-style: italic;
  }

  .social-graph.dark .pending-message {
    color: #94a3b8;
  }

  .claim-required {
    margin-top: 1.5rem;
    padding: 1.5rem;
    border: 1px dashed #cbd5f5;
    border-radius: 12px;
    background: rgba(59, 130, 246, 0.08);
    color: #1e293b;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .social-graph.dark .claim-required {
    background: rgba(59, 130, 246, 0.15);
    border-color: rgba(59, 130, 246, 0.4);
    color: #f1f5f9;
  }

  .claim-required p {
    margin: 0;
    font-size: 0.95rem;
  }

  .pending-section {
    margin-top: 1rem;
  }

  .pending-section h4 {
    margin: 0 0 0.75rem;
    font-size: 1rem;
  }

  .pending-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    margin-bottom: 0.5rem;
  }

  .social-graph.dark .pending-item {
    background: #1e293b;
    border-color: #334155;
  }

  .pending-address {
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Courier New', monospace;
    font-size: 0.9rem;
  }

  .pending-actions {
    display: flex;
    gap: 0.5rem;
  }

  .loading {
    text-align: center;
    padding: 2rem;
  }

  .spinner {
    border: 3px solid #e2e8f0;
    border-radius: 50%;
    border-top: 3px solid #0f172a;
    width: 40px;
    height: 40px;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
  }

  .social-graph.dark .spinner {
    border-color: #334155;
    border-top-color: #f1f5f9;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .social-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .stat-item {
    text-align: center;
    padding: 1rem;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
    width: 100%;
    font-family: inherit;
    font-size: inherit;
  }

  .stat-item:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
  }

  .stat-item.active {
    border-color: #0f172a;
    background: #f1f5f9;
  }

  .dark .stat-item {
    background: #0f172a;
    border-color: #334155;
  }

  .dark .stat-item.active {
    background: #334155;
    border-color: #f1f5f9;
  }

  .stat-value {
    font-size: 2rem;
    font-weight: bold;
    color: #0f172a;
    margin-bottom: 0.25rem;
  }

  .dark .stat-value {
    color: #f1f5f9;
  }

  .stat-label {
    font-size: 0.9rem;
    color: #64748b;
  }

  .dark .stat-label {
    color: #94a3b8;
  }

  .social-content {
    margin-top: 1.5rem;
  }

  .address-list h3 {
    margin-bottom: 1rem;
    font-size: 1.2rem;
    font-weight: 600;
  }

  .address-item {
    display: flex;
    align-items: center;
    padding: 0.75rem 1rem;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    margin-bottom: 0.5rem;
    cursor: pointer;
    transition: all 0.2s ease;
    width: 100%;
    border: none;
    text-align: left;
    font-family: inherit;
    font-size: inherit;
  }

  .address-item:hover {
    transform: translateX(4px);
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.1);
  }

  .dark .address-item {
    background: #0f172a;
    border-color: #334155;
  }

  .dark .address-item:hover {
    background: #334155;
  }

  .address-icon {
    font-size: 1.5rem;
    margin-right: 1rem;
  }

  .address-text {
    flex: 1;
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 'Courier New', monospace;
    font-size: 0.9rem;
  }

  .arrow {
    color: #0f172a;
    font-weight: bold;
  }

  .dark .arrow {
    color: #f1f5f9;
  }

  .empty-message {
    text-align: center;
    padding: 2rem;
    color: #64748b;
  }

  .dark .empty-message {
    color: #94a3b8;
  }

  @media (max-width: 768px) {
    .social-graph {
      padding: 1rem;
    }

    .social-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 1rem;
    }

    .action-buttons {
      width: 100%;
      flex-direction: column;
    }

    .btn-social {
      width: 100%;
    }

    .social-stats {
      grid-template-columns: 1fr;
    }
  }
</style>

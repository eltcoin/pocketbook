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
  let socialGraph = {
    following: [],
    followers: [],
    friends: []
  };
  let userAddress = null;
  let contract = null;
  let activeTab = 'followers'; // followers, following, friends
  
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
    contract = value.chains?.[value.primaryChainId]?.contract || null;
  });

  onMount(async () => {
    await loadSocialGraph();
    if (userAddress && userAddress !== address) {
      await checkRelationshipStatus();
    }
  });

  async function loadSocialGraph() {
    loading = true;
    try {
      if (contract) {
        const result = await contract.getSocialGraph(address);
        socialGraph = {
          following: result[0] || [],
          followers: result[1] || [],
          friends: result[2] || []
        };
      }
    } catch (error) {
      console.error('Error loading social graph:', error);
      toastStore.show('Failed to load social graph', 'error');
    } finally {
      loading = false;
    }
  }

  async function checkRelationshipStatus() {
    try {
      if (contract && userAddress) {
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

  async function handleFollow() {
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
    try {
      const tx = await contract.sendFriendRequest(address);
      await tx.wait();
      toastStore.show('Friend request sent', 'success');
      await checkRelationshipStatus();
    } catch (error) {
      console.error('Error sending friend request:', error);
      toastStore.show('Failed to send friend request', 'error');
    }
  }

  async function handleAcceptFriendRequest() {
    try {
      const tx = await contract.acceptFriendRequest(address);
      await tx.wait();
      toastStore.show('Friend request accepted', 'success');
      await loadSocialGraph();
      await checkRelationshipStatus();
    } catch (error) {
      console.error('Error accepting friend request:', error);
      toastStore.show('Failed to accept friend request', 'error');
    }
  }

  async function handleRemoveFriend() {
    try {
      const tx = await contract.removeFriend(address);
      await tx.wait();
      toastStore.show('Friend removed', 'success');
      await loadSocialGraph();
      await checkRelationshipStatus();
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
    
    {#if !isOwner && userAddress && userAddress !== address}
      <div class="action-buttons">
        {#if areFriendsWithUser}
          <button class="btn-social btn-friends" on:click={handleRemoveFriend}>
            ✓ Friends
          </button>
        {:else if hasReceivedRequest}
          <button class="btn-social btn-accept" on:click={handleAcceptFriendRequest}>
            Accept Friend Request
          </button>
        {:else if hasPendingRequest}
          <button class="btn-social btn-pending" disabled>
            Friend Request Pending
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

  {#if loading}
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

  .btn-friends {
    background: #4299e1;
    color: white;
  }

  .btn-friends:hover {
    background: #3182ce;
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

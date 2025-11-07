<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { multiChainStore } from '../stores/multichain';
  import { themeStore } from '../stores/theme';
  import { toastStore } from '../stores/toast';
  import {
    calculateReputation,
    getReputationSummary,
    buildAttestationGraph
  } from '../utils/reputation';

  export let address;
  export let isOwner = false;

  const dispatch = createEventDispatcher();

  let darkMode = false;
  let loading = true;
  let userAddress = null;
  let contract = null;
  let primarySigner = null;
  let primaryChainId = null;
  
  // Reputation data
  let reputationScore = null;
  let reputationSummary = null;
  let directAttestations = [];
  let givenAttestations = [];
  let showAttestationForm = false;
  let activeTab = 'received'; // received, given, create
  
  // Attestation form
  let newAttestation = {
    trustLevel: 75,
    comment: '',
    signature: ''
  };
  let creatingAttestation = false;

  themeStore.subscribe(value => {
    darkMode = value.darkMode;
  });

  multiChainStore.subscribe(value => {
    userAddress = value.primaryAddress;
    primarySigner = value.primarySigner || null;
    primaryChainId = value.primaryChainId || null;
    contract = value.chains?.[value.primaryChainId]?.contract || null;
  });

  const toNumber = (value, fallback = 0) => {
    if (typeof value === 'bigint') {
      const num = Number(value);
      return Number.isFinite(num) ? num : fallback;
    }

    const num = Number(value ?? fallback);
    return Number.isFinite(num) ? num : fallback;
  };

  onMount(async () => {
    await loadReputationData();
  });

  async function loadReputationData() {
    loading = true;
    try {
      if (contract) {
        // Load direct attestations received
        const receiversList = await contract.getAttestationsReceived(address);
        directAttestations = await Promise.all(
          receiversList.map(async (attester) => {
            const att = await contract.getAttestation(attester, address);
            return {
              attester: att[0],
              subject: att[1],
              trustLevel: toNumber(att[2]),
              comment: att[3],
              timestamp: toNumber(att[4]),
              isActive: att[5]
            };
          })
        );
        
        // Load attestations given (if owner)
        if (isOwner) {
          const givenList = await contract.getAttestationsGiven(address);
          givenAttestations = await Promise.all(
            givenList.map(async (subject) => {
              const att = await contract.getAttestation(address, subject);
              return {
                attester: att[0],
                subject: att[1],
                trustLevel: toNumber(att[2]),
                comment: att[3],
                timestamp: toNumber(att[4]),
                isActive: att[5]
              };
            })
          );
        }
        
        // Calculate reputation
        await calculateReputationScore();
      }
    } catch (error) {
      console.error('Error loading reputation data:', error);
      toastStore.show('Failed to load reputation data', 'error');
    } finally {
      loading = false;
    }
  }

  async function calculateReputationScore() {
    try {
      // For now, calculate direct reputation only
      // In a full implementation, we'd fetch all attestations for transitive trust
      const reputation = calculateReputation(
        address,
        directAttestations.filter(att => att.isActive),
        {}, // Empty graph for now (direct only)
        null // No observer (global reputation)
      );
      
      reputationSummary = getReputationSummary(reputation);
      reputationScore = reputationSummary.score;
    } catch (error) {
      console.error('Error calculating reputation:', error);
    }
  }

  async function handleCreateAttestation() {
    if (!userAddress || userAddress === address) {
      toastStore.show('Cannot attest to yourself', 'error');
      return;
    }
    
    if (newAttestation.trustLevel < 0 || newAttestation.trustLevel > 100) {
      toastStore.show('Trust level must be between 0 and 100', 'error');
      return;
    }

    creatingAttestation = true;
    try {
      if (!contract) {
        throw new Error('Contract not available on this network');
      }

      if (!primarySigner) {
        throw new Error('Wallet not connected');
      }

      const signerContract = contract.runner ? contract : contract.connect(primarySigner);

      const message = `Attestation: ${address} at ${newAttestation.trustLevel}`;
      const signature = await primarySigner.signMessage(message);

      const tx = await signerContract.createAttestation(
        address,
        newAttestation.trustLevel,
        newAttestation.comment,
        signature
      );
      
      await tx.wait();
      toastStore.show('Attestation created successfully', 'success');
      
      // Reset form
      newAttestation = { trustLevel: 75, comment: '', signature: '' };
      showAttestationForm = false;
      
      // Reload data
      await loadReputationData();
    } catch (error) {
      console.error('Error creating attestation:', error);
      toastStore.show(error.message || 'Failed to create attestation', 'error');
    } finally {
      creatingAttestation = false;
    }
  }

  async function handleRevokeAttestation(subjectAddress) {
    if (!confirm('Are you sure you want to revoke this attestation?')) {
      return;
    }

    try {
      const tx = await contract.revokeAttestation(subjectAddress);
      await tx.wait();
      toastStore.show('Attestation revoked successfully', 'success');
      await loadReputationData();
    } catch (error) {
      console.error('Error revoking attestation:', error);
      toastStore.show('Failed to revoke attestation', 'error');
    }
  }

  function formatAddress(addr) {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }

  function formatDate(timestamp) {
    if (!timestamp) return '';
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleDateString();
  }

  function getCategoryColor(category) {
    switch (category) {
      case 'Highly Trusted': return '#22c55e';
      case 'Trusted': return '#84cc16';
      case 'Neutral': return '#eab308';
      case 'Low Trust': return '#f97316';
      case 'Untrusted': return '#ef4444';
      default: return '#6b7280';
    }
  }

  function getTrustLevelColor(level) {
    if (level >= 80) return '#22c55e';
    if (level >= 60) return '#84cc16';
    if (level >= 40) return '#eab308';
    if (level >= 20) return '#f97316';
    return '#ef4444';
  }

  function navigateToAddress(addr) {
    dispatch('navigate', { address: addr });
  }
</script>

<div class="reputation-container" class:dark={darkMode}>
  <div class="reputation-header">
    <h2>🏆 Reputation</h2>
    {#if !isOwner && userAddress && userAddress !== address}
      <button 
        class="btn-primary"
        on:click={() => showAttestationForm = !showAttestationForm}
      >
        {showAttestationForm ? 'Cancel' : 'Create Attestation'}
      </button>
    {/if}
  </div>

  {#if loading}
    <div class="loading">Loading reputation data...</div>
  {:else}
    <!-- Reputation Score Display -->
    {#if reputationSummary}
      <div class="reputation-score">
        <div class="score-circle" style="background: conic-gradient({getCategoryColor(reputationSummary.category)} {reputationSummary.score}%, #e5e7eb {reputationSummary.score}%)">
          <div class="score-inner">
            <div class="score-value">{reputationSummary.score}</div>
            <div class="score-label">Score</div>
          </div>
        </div>
        <div class="score-details">
          <div class="score-category" style="color: {getCategoryColor(reputationSummary.category)}">
            {reputationSummary.category}
          </div>
          <div class="score-stats">
            <div class="stat">
              <span class="stat-label">Confidence:</span>
              <span class="stat-value">{reputationSummary.confidence}%</span>
            </div>
            <div class="stat">
              <span class="stat-label">Evidence:</span>
              <span class="stat-value">{reputationSummary.totalEvidence} attestations</span>
            </div>
          </div>
          <div class="opinion-breakdown">
            <div class="opinion-bar">
              <div class="opinion-segment belief" style="width: {reputationSummary.belief}%">
                Belief: {reputationSummary.belief}%
              </div>
              <div class="opinion-segment disbelief" style="width: {reputationSummary.disbelief}%">
                Disbelief: {reputationSummary.disbelief}%
              </div>
              <div class="opinion-segment uncertainty" style="width: {reputationSummary.uncertainty}%">
                Uncertainty: {reputationSummary.uncertainty}%
              </div>
            </div>
          </div>
        </div>
      </div>
    {:else}
      <div class="no-reputation">
        <p>No reputation data available yet.</p>
        <p class="hint">Attestations from trusted addresses will build reputation.</p>
      </div>
    {/if}

    <!-- Attestation Form -->
    {#if showAttestationForm}
      <div class="attestation-form">
        <h3>Create Attestation</h3>
        <p class="form-description">
          Attest to the trustworthiness of this address. Your attestation will be publicly visible on-chain.
        </p>
        
        <div class="form-group">
          <label for="trustLevel">
            Trust Level: {newAttestation.trustLevel}
            <span class="trust-indicator" style="color: {getTrustLevelColor(newAttestation.trustLevel)}">
              {newAttestation.trustLevel >= 80 ? '(High)' : 
               newAttestation.trustLevel >= 60 ? '(Good)' :
               newAttestation.trustLevel >= 40 ? '(Moderate)' :
               newAttestation.trustLevel >= 20 ? '(Low)' : '(Very Low)'}
            </span>
          </label>
          <input
            type="range"
            id="trustLevel"
            min="0"
            max="100"
            bind:value={newAttestation.trustLevel}
            class="trust-slider"
          />
        </div>

        <div class="form-group">
          <label for="comment">Comment (Optional)</label>
          <textarea
            id="comment"
            bind:value={newAttestation.comment}
            placeholder="Why do you trust this address? (optional)"
            rows="3"
          ></textarea>
        </div>

        <div class="form-actions">
          <button 
            class="btn-primary"
            on:click={handleCreateAttestation}
            disabled={creatingAttestation}
          >
            {creatingAttestation ? 'Creating...' : 'Create Attestation'}
          </button>
          <button 
            class="btn-secondary"
            on:click={() => showAttestationForm = false}
            disabled={creatingAttestation}
          >
            Cancel
          </button>
        </div>
      </div>
    {/if}

    <!-- Attestations Tabs -->
    <div class="attestations-section">
      <div class="tabs">
        <button 
          class="tab"
          class:active={activeTab === 'received'}
          on:click={() => activeTab = 'received'}
        >
          Received ({directAttestations.length})
        </button>
        {#if isOwner}
          <button 
            class="tab"
            class:active={activeTab === 'given'}
            on:click={() => activeTab = 'given'}
          >
            Given ({givenAttestations.length})
          </button>
        {/if}
      </div>

      <div class="tab-content">
        {#if activeTab === 'received'}
          {#if directAttestations.length > 0}
            <div class="attestations-list">
              {#each directAttestations as attestation (attestation.attester)}
                <div class="attestation-card">
                  <div class="attestation-header">
                    <button 
                      class="address-link"
                      on:click={() => navigateToAddress(attestation.attester)}
                    >
                      {formatAddress(attestation.attester)}
                    </button>
                    <div 
                      class="trust-badge"
                      style="background-color: {getTrustLevelColor(attestation.trustLevel)}"
                    >
                      {attestation.trustLevel}
                    </div>
                  </div>
                  {#if attestation.comment}
                    <div class="attestation-comment">"{attestation.comment}"</div>
                  {/if}
                  <div class="attestation-footer">
                    <span class="attestation-date">{formatDate(attestation.timestamp)}</span>
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <div class="empty-state">
              <p>No attestations received yet.</p>
            </div>
          {/if}
        {:else if activeTab === 'given'}
          {#if givenAttestations.length > 0}
            <div class="attestations-list">
              {#each givenAttestations as attestation (attestation.subject)}
                <div class="attestation-card">
                  <div class="attestation-header">
                    <button 
                      class="address-link"
                      on:click={() => navigateToAddress(attestation.subject)}
                    >
                      {formatAddress(attestation.subject)}
                    </button>
                    <div 
                      class="trust-badge"
                      style="background-color: {getTrustLevelColor(attestation.trustLevel)}"
                    >
                      {attestation.trustLevel}
                    </div>
                  </div>
                  {#if attestation.comment}
                    <div class="attestation-comment">"{attestation.comment}"</div>
                  {/if}
                  <div class="attestation-footer">
                    <span class="attestation-date">{formatDate(attestation.timestamp)}</span>
                    <button 
                      class="btn-revoke"
                      on:click={() => handleRevokeAttestation(attestation.subject)}
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              {/each}
            </div>
          {:else}
            <div class="empty-state">
              <p>You haven't given any attestations yet.</p>
            </div>
          {/if}
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .reputation-container {
    padding: 1.5rem;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
    margin: 1rem 0;
  }

  .reputation-container.dark {
    background: #1e293b;
    border-color: #334155;
    color: #f1f5f9;
  }

  .reputation-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }

  .reputation-header h2 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
  }

  .loading {
    text-align: center;
    padding: 2rem;
    color: #6b7280;
  }

  .reputation-score {
    display: flex;
    gap: 2rem;
    padding: 2rem;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    margin-bottom: 2rem;
  }

  .dark .reputation-score {
    background: #0f172a;
    border-color: #334155;
  }

  .score-circle {
    width: 150px;
    height: 150px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .score-inner {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    background: #ffffff;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .dark .score-inner {
    background: #1e293b;
  }

  .score-value {
    font-size: 2.5rem;
    font-weight: bold;
  }

  .score-label {
    font-size: 0.875rem;
    color: #6b7280;
  }

  .score-details {
    flex: 1;
  }

  .score-category {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 1rem;
  }

  .score-stats {
    display: flex;
    gap: 2rem;
    margin-bottom: 1rem;
  }

  .stat {
    display: flex;
    gap: 0.5rem;
  }

  .stat-label {
    color: #6b7280;
  }

  .stat-value {
    font-weight: 600;
  }

  .opinion-breakdown {
    margin-top: 1rem;
  }

  .opinion-bar {
    display: flex;
    height: 30px;
    border-radius: 4px;
    overflow: hidden;
    font-size: 0.75rem;
  }

  .opinion-segment {
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 500;
  }

  .opinion-segment.belief {
    background: #22c55e;
  }

  .opinion-segment.disbelief {
    background: #ef4444;
  }

  .opinion-segment.uncertainty {
    background: #6b7280;
  }

  .no-reputation {
    text-align: center;
    padding: 3rem 2rem;
    color: #6b7280;
  }

  .no-reputation .hint {
    font-size: 0.875rem;
    margin-top: 0.5rem;
  }

  .attestation-form {
    padding: 1.5rem;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    margin-bottom: 2rem;
  }

  .dark .attestation-form {
    background: #0f172a;
    border-color: #334155;
  }

  .attestation-form h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.25rem;
    font-weight: 600;
  }

  .form-description {
    color: #64748b;
    font-size: 0.875rem;
    margin-bottom: 1.5rem;
  }

  .dark .form-description {
    color: #94a3b8;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-group label {
    display: block;
    font-weight: 500;
    margin-bottom: 0.5rem;
  }

  .trust-indicator {
    font-weight: 600;
    margin-left: 0.5rem;
  }

  .trust-slider {
    width: 100%;
    height: 8px;
    border-radius: 4px;
    background: #e5e7eb;
    outline: none;
    -webkit-appearance: none;
  }

  .trust-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #3b82f6;
    cursor: pointer;
  }

  .trust-slider::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #3b82f6;
    cursor: pointer;
    border: none;
  }

  textarea {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-family: inherit;
    resize: vertical;
  }

  .dark textarea {
    background: #374151;
    border-color: #4b5563;
    color: #f3f4f6;
  }

  .form-actions {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
  }

  .tabs {
    display: flex;
    border-bottom: 2px solid #e5e7eb;
    margin-bottom: 1rem;
  }

  .dark .tabs {
    border-bottom-color: #374151;
  }

  .tab {
    padding: 0.75rem 1.5rem;
    background: none;
    border: none;
    cursor: pointer;
    font-weight: 500;
    color: #6b7280;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    transition: all 0.2s;
  }

  .tab:hover {
    color: #3b82f6;
  }

  .tab.active {
    color: #3b82f6;
    border-bottom-color: #3b82f6;
  }

  .attestations-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .attestation-card {
    padding: 1rem;
    background: #f8fafc;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
  }

  .dark .attestation-card {
    background: #0f172a;
    border-color: #334155;
  }

  .attestation-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .address-link {
    background: none;
    border: none;
    color: #0f172a;
    cursor: pointer;
    font-weight: 500;
    text-decoration: underline;
  }

  .dark .address-link {
    color: #f1f5f9;
  }

  .trust-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    color: white;
    font-weight: 600;
    font-size: 0.875rem;
  }

  .attestation-comment {
    color: #4b5563;
    font-style: italic;
    margin: 0.5rem 0;
    padding: 0.5rem;
    background: white;
    border-radius: 4px;
  }

  .dark .attestation-comment {
    background: #1f2937;
    color: #9ca3af;
  }

  .attestation-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 0.5rem;
    font-size: 0.875rem;
    color: #6b7280;
  }

  .btn-revoke {
    padding: 0.25rem 0.75rem;
    background: #ef4444;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.875rem;
  }

  .btn-revoke:hover {
    background: #dc2626;
  }

  .btn-primary {
    padding: 0.75rem 1.5rem;
    background: #0f172a;
    color: #f1f5f9;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s ease;
  }

  .dark .btn-primary {
    background: #f1f5f9;
    color: #0f172a;
  }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
  }

  .btn-primary:disabled {
    background: #94a3b8;
    cursor: not-allowed;
    transform: none;
  }

  .btn-secondary {
    padding: 0.75rem 1.5rem;
    background: #f1f5f9;
    color: #0f172a;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s ease;
  }

  .dark .btn-secondary {
    background: #334155;
    color: #f1f5f9;
    border-color: #334155;
  }

  .btn-secondary:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
  }

  .empty-state {
    text-align: center;
    padding: 3rem 2rem;
    color: #6b7280;
  }
</style>

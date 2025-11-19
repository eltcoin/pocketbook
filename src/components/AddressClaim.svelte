<script>
  import { createEventDispatcher, onMount } from "svelte";
  import { ethers } from "ethers";
  import { multiChainStore } from "../stores/multichain";
  import { themeStore } from "../stores/theme";
  import { lookupENSName } from "../utils/ens";
  import {
    loadWordlist,
    encodeHandle,
    formatHandle,
    decodeHandle,
    suggestHandleIndices,
  } from "../utils/wordhandles";

  const dispatch = createEventDispatcher();

  let darkMode = false;
  let connected = false;
  let address = null;
  let loading = false;
  let success = false;
  let error = null;
  let ensName = null;
  let provider = null;
  let hasExistingClaim = false;
  let checkingClaimStatus = false;
  let claimStatusError = null;
  let primaryChainId = null;

  // Form data
  let formData = {
    name: "",
    avatar: "",
    bio: "",
    website: "",
    twitter: "",
    github: "",
    pgpSignature: "",
    isPrivate: false,
  };

  // Word handle state
  let handleRegistrySupported = false;
  let handleRegistryLoading = false;
  let handleRegistryError = null;
  let handleRegistryInfo = null;
  let existingHandle = null;
  let handleSuggestion = null;
  let handleSuggestionLoading = false;
  let handleSuggestionError = null;
  let handleClaiming = false;
  let handleClaimError = null;
  let handleClaimSuccess = false;
  let releaseHandleLoading = false;
  let releaseHandleError = null;

  let wordlist = [];
  let wordlistLoading = false;
  let wordlistError = null;
  let wordlistPromise = null;

  let handleStateRequestId = 0;
  let handleSuggestionRequestId = 0;

  themeStore.subscribe((value) => {
    darkMode = value.darkMode;
  });

  let unsubscribeMultiChain;
  let currentLookupId = 0; // Track the latest lookup request
  let isMounted = true; // Track component mount state
  let claimStatusRequestId = 0;
  let previousChainId = null; // Track chain changes

  function resetHandleState() {
    handleStateRequestId += 1;
    handleSuggestionRequestId += 1;
    handleRegistrySupported = false;
    handleRegistryLoading = false;
    handleRegistryError = null;
    handleRegistryInfo = null;
    existingHandle = null;
    handleSuggestion = null;
    handleSuggestionError = null;
    handleSuggestionLoading = false;
    handleClaiming = false;
    handleClaimError = null;
    handleClaimSuccess = false;
    releaseHandleLoading = false;
    releaseHandleError = null;
  }

  async function ensureWordlistLoaded() {
    if (wordlist.length) {
      return wordlist;
    }
    if (wordlistPromise) {
      return wordlistPromise;
    }
    wordlistLoading = true;
    wordlistError = null;
    wordlistPromise = loadWordlist()
      .then((list) => {
        wordlist = list;
        return list;
      })
      .catch((err) => {
        wordlistError = err?.message || "Failed to load wordlist";
        throw err;
      })
      .finally(() => {
        wordlistLoading = false;
        wordlistPromise = null;
      });
    return wordlistPromise;
  }

  function buildHandleSummary(encodedHandle) {
    try {
      const indices = decodeHandle(encodedHandle);
      const vocab = wordlist;
      const hasVocab =
        vocab.length > 0 && indices.every((idx) => idx < vocab.length);
      return {
        indices,
        words: hasVocab ? indices.map((idx) => vocab[idx]) : [],
        phrase: hasVocab ? formatHandle(indices, vocab) : indices.join("-"),
        hex: ethers.hexlify(encodedHandle),
      };
    } catch (err) {
      const hexValue = ethers.hexlify(encodedHandle);
      return {
        indices: [],
        words: [],
        phrase: hexValue,
        hex: hexValue,
      };
    }
  }

  async function syncHandleRegistryState(targetAddress, chainId) {
    if (!targetAddress || !chainId || !isMounted) {
      resetHandleState();
      return;
    }

    const requestId = ++handleStateRequestId;
    handleRegistryLoading = true;
    handleRegistryError = null;

    try {
      const infoResult = await multiChainStore.getHandleRegistryInfo(chainId);
      if (!isMounted || requestId !== handleStateRequestId) {
        return;
      }

      if (!infoResult?.success) {
        console.debug(
          "[wordhandles] registry info unavailable",
          infoResult?.error,
        );
        handleRegistrySupported = false;
        handleRegistryInfo = null;
        handleRegistryError =
          infoResult?.error || "Handle registry unavailable on this chain";
        existingHandle = null;
        return;
      }

      handleRegistrySupported = true;
      handleRegistryInfo = infoResult.info;
      handleRegistryError = null;

      try {
        await ensureWordlistLoaded();
      } catch (wordErr) {
        console.warn("Wordlist load failed:", wordErr);
      }

      const handleResult = await multiChainStore.getHandleForAddress(
        chainId,
        targetAddress,
      );
      if (!isMounted || requestId !== handleStateRequestId) {
        return;
      }

      if (handleResult?.success && handleResult.handle) {
        existingHandle = buildHandleSummary(handleResult.handle);
        handleSuggestion = null;
        handleClaimSuccess = false;
      } else {
        existingHandle = null;
      }

      if (
        !existingHandle &&
        handleRegistrySupported &&
        !handleSuggestion &&
        !handleSuggestionLoading
      ) {
        generateHandleSuggestion();
      }
    } catch (err) {
      if (!isMounted || requestId !== handleStateRequestId) {
        return;
      }
      console.error("[wordhandles] failed to sync handle registry state", err);
      handleRegistrySupported = false;
      handleRegistryInfo = null;
      handleRegistryError = err?.message || "Unable to load handle registry";
      existingHandle = null;
    } finally {
      if (requestId === handleStateRequestId) {
        handleRegistryLoading = false;
      }
    }
  }

  async function generateHandleSuggestion({ reset = false } = {}) {
    if (!handleRegistrySupported || !address || !primaryChainId) {
      return;
    }

    const requestId = ++handleSuggestionRequestId;
    handleSuggestionLoading = true;
    handleSuggestionError = null;
    handleClaimError = null;

    let seedSalt = 0;
    if (reset && handleSuggestion?.encoded && handleRegistryInfo?.vocabHash) {
      const saltSource = ethers.concat([
        ethers.getBytes(handleRegistryInfo.vocabHash),
        handleSuggestion.encoded,
      ]);
      const hash = ethers.keccak256(saltSource);
      const slice = ethers.dataSlice(hash, ethers.dataLength(hash) - 4);
      seedSalt = Number(BigInt(ethers.hexlify(slice)) & BigInt(0xffffffff));
      handleSuggestion = null;
    }

    try {
      const vocab = await ensureWordlistLoaded();
      const registryMax = handleRegistryInfo?.maxLength ?? 4;
      const maxTokens = Math.min(Math.max(1, registryMax), 6);
      const minTokens = 1;
      const indices = await suggestHandleIndices({
        address,
        vocabSize: vocab.length,
        minLength: minTokens,
        maxLength: maxTokens,
        isClaimed: async (encoded) => {
          const availability = await multiChainStore.isHandleTakenOnChain(
            primaryChainId,
            encoded,
          );
          if (!availability?.success) {
            throw new Error(
              availability?.error || "Unable to verify handle availability",
            );
          }
          return availability.isTaken;
        },
        seedSalt,
      });

      if (!isMounted || requestId !== handleSuggestionRequestId) {
        return;
      }

      const encoded = encodeHandle(indices);
      handleSuggestion = {
        indices,
        words: indices.map((idx) => vocab[idx]),
        phrase: formatHandle(indices, vocab),
        hex: ethers.hexlify(encoded),
        encoded,
        seedSalt,
      };
    } catch (err) {
      if (!isMounted || requestId !== handleSuggestionRequestId) {
        return;
      }
      handleSuggestion = null;
      handleSuggestionError =
        err?.message || "Failed to generate handle suggestion";
    } finally {
      if (requestId === handleSuggestionRequestId) {
        handleSuggestionLoading = false;
      }
    }
  }

  async function claimWordHandle() {
    if (!handleSuggestion?.encoded) {
      return;
    }

    handleClaiming = true;
    handleClaimError = null;
    handleClaimSuccess = false;
    releaseHandleError = null;

    try {
      await multiChainStore.claimHandleOnPrimaryChain(handleSuggestion.encoded);
      handleClaimSuccess = true;
      handleSuggestion = null;
      await syncHandleRegistryState(address, primaryChainId);
    } catch (err) {
      handleClaimError = err?.message || "Failed to claim handle";
      console.error("Handle claim error:", err);
    } finally {
      handleClaiming = false;
    }
  }

  async function releaseWordHandle() {
    if (!existingHandle) {
      return;
    }

    releaseHandleLoading = true;
    releaseHandleError = null;
    handleClaimError = null;
    handleClaimSuccess = false;

    try {
      await multiChainStore.releaseHandleOnPrimaryChain();
      await syncHandleRegistryState(address, primaryChainId);
    } catch (err) {
      releaseHandleError = err?.message || "Failed to release handle";
      console.error("Handle release error:", err);
    } finally {
      releaseHandleLoading = false;
    }
  }

  onMount(() => {
    isMounted = true;

    // Subscribe to multichain store
    unsubscribeMultiChain = multiChainStore.subscribe(async (value) => {
      connected = value.connected;
      const newAddress = value.primaryAddress;
      const newProvider =
        value.chains?.[value.primaryChainId]?.provider || null;
      const newChainId = value.primaryChainId;
      const chainChanged =
        newChainId !== null && newChainId !== previousChainId;
      previousChainId = newChainId;
      primaryChainId = newChainId;

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
            console.error("Error looking up ENS name:", err);
            // Only clear ensName if this is still the most recent lookup and component is still mounted
            if (lookupId === currentLookupId && isMounted) {
              ensName = null;
            }
          }
        } else {
          ensName = null;
        }
      }

      // Refresh data if we have an address and chainId, OR if the chain changed
      if (address && newChainId) {
        // Always refresh on chain change, or when address/chainId first become available
        if (chainChanged || newAddress !== address) {
          refreshClaimStatus(address, newChainId);
          syncHandleRegistryState(address, newChainId);
        }
      } else {
        hasExistingClaim = false;
        claimStatusError = null;
        resetHandleState();
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
      error = "Please connect your wallet first";
      return;
    }

    if (!formData.name) {
      error = "Name is required";
      return;
    }

    loading = true;
    error = null;

    try {
      const message = `Claiming address ${address} with name: ${formData.name}`;
      const signature = await multiChainStore.signMessage(message);

      const result = await multiChainStore.claimAddressOnPrimaryChain({
        signature,
        name: formData.name,
        avatar: formData.avatar,
        bio: formData.bio,
        website: formData.website,
        twitter: formData.twitter,
        github: formData.github,
        publicKey: null,
        pgpSignature: formData.pgpSignature,
        isPrivate: formData.isPrivate,
        ipfsCID: "",
      });

      success = true;
      loading = false;
      console.log("Address claimed on-chain:", result.transactionHash);
      hasExistingClaim = true;
      claimStatusError = null;

      setTimeout(() => {
        dispatch("viewChange", { view: "address", address });
      }, 1800);
    } catch (err) {
      loading = false;
      error = err?.message || "Failed to claim address";
      console.error("Claim error:", err);
    }
  }

  async function refreshClaimStatus(targetAddress, chainId) {
    if (!targetAddress || !chainId) {
      hasExistingClaim = false;
      claimStatusError = null;
      return;
    }

    const requestId = ++claimStatusRequestId;
    checkingClaimStatus = true;
    claimStatusError = null;

    try {
      const result = await multiChainStore.checkClaimOnChain(
        chainId,
        targetAddress,
      );
      if (!isMounted || requestId !== claimStatusRequestId) {
        return;
      }
      if (result?.success) {
        hasExistingClaim = Boolean(result.isClaimed);
        claimStatusError = null;
      } else {
        hasExistingClaim = false;
        claimStatusError = result?.error || null;
      }
    } catch (err) {
      if (!isMounted || requestId !== claimStatusRequestId) {
        return;
      }
      hasExistingClaim = false;
      claimStatusError = err?.message || "Unable to check claim status";
      console.error("Claim status check error:", err);
    } finally {
      if (requestId === claimStatusRequestId) {
        checkingClaimStatus = false;
      }
    }
  }

  function goBack() {
    dispatch("viewChange", { view: "explorer" });
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

      {#if checkingClaimStatus}
        <div class="status-box">Checking existing claim status...</div>
      {:else if claimStatusError}
        <div class="error-box">
          Unable to verify existing claim status: {claimStatusError}
        </div>
      {:else if hasExistingClaim}
        <div class="warning-box already-claimed">
          <div class="warning-icon">ℹ️</div>
          <div>
            <h3>Address already claimed</h3>
            <p>
              This wallet has an active claim on the current network. You can
              update or revoke it from the explorer.
            </p>
          </div>
        </div>
      {/if}

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
        <small class="form-hint"
          >Add your PGP signature for additional verification</small
        >
      </div>

      <div class="form-group checkbox-group">
        <label>
          <input type="checkbox" bind:checked={formData.isPrivate} />
          <span
            >Make metadata private (visible only to whitelisted addresses)</span
          >
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
        <button
          class="btn-claim"
          on:click={handleClaim}
          disabled={loading ||
            success ||
            hasExistingClaim ||
            checkingClaimStatus}
        >
          {#if loading}
            Claiming...
          {:else if success}
            Claimed ✓
          {:else}
            Claim Address
          {/if}
        </button>
      </div>

      <div class="handle-section">
        <div class="handle-header">
          <div>
            <h3>Word Handles</h3>
            <p>Deterministic BIP39 phrases you can reserve on-chain.</p>
          </div>
          <div class="handle-caption">
            {#if handleRegistryInfo}
              Vocabulary: {handleRegistryInfo.vocabLength} • Max words: {handleRegistryInfo.maxLength}
            {/if}
            {#if wordlistLoading}
              <span class="handle-pill">Loading vocabulary…</span>
            {/if}
          </div>
        </div>

        {#if handleRegistryLoading}
          <div class="status-box">Checking handle registry…</div>
        {:else if handleRegistrySupported}
          {#if existingHandle}
            <div class="handle-card claimed">
              <div class="handle-label">Your handle</div>
              <div class="handle-phrase">{existingHandle.phrase}</div>
              <div class="handle-meta">
                <code>{existingHandle.hex}</code>
                {#if existingHandle.indices.length}
                  <span>Indices: {existingHandle.indices.join(", ")}</span>
                {/if}
              </div>
              {#if releaseHandleError}
                <div class="error-box inline">{releaseHandleError}</div>
              {/if}
              <button
                class="btn-release"
                on:click={releaseWordHandle}
                disabled={releaseHandleLoading}
              >
                {#if releaseHandleLoading}
                  Releasing...
                {:else}
                  Release Handle
                {/if}
              </button>
            </div>
          {:else}
            <div class="handle-card">
              {#if handleSuggestion}
                <div class="handle-phrase">{handleSuggestion.phrase}</div>
                <div class="handle-meta">
                  <code>{handleSuggestion.hex}</code>
                  <span>{handleSuggestion.words.join(" · ")}</span>
                </div>
              {:else}
                <p class="handle-placeholder">
                  {#if handleSuggestionLoading}
                    Generating the next available handle…
                  {:else}
                    Generate a phrase to reserve it permanently.
                  {/if}
                </p>
              {/if}

              {#if handleSuggestionError}
                <div class="error-box inline">{handleSuggestionError}</div>
              {/if}

              {#if handleClaimError}
                <div class="error-box inline">{handleClaimError}</div>
              {/if}

              {#if wordlistError}
                <div class="error-box inline">
                  Vocabulary error: {wordlistError}
                </div>
              {/if}

              {#if handleClaimSuccess}
                <div class="success-box inline">
                  Handle claimed successfully!
                </div>
              {/if}

              <div class="handle-actions">
                <button
                  class="btn-secondary"
                  on:click={() => generateHandleSuggestion({ reset: true })}
                  disabled={handleSuggestionLoading ||
                    handleClaiming ||
                    wordlistLoading}
                >
                  {#if handleSuggestionLoading}
                    Working...
                  {:else if handleSuggestion}
                    Suggest Another
                  {:else}
                    Generate Suggestion
                  {/if}
                </button>
                <button
                  class="btn-handle-claim"
                  on:click={claimWordHandle}
                  disabled={!handleSuggestion ||
                    handleSuggestionLoading ||
                    handleClaiming}
                >
                  {#if handleClaiming}
                    Claiming...
                  {:else}
                    Claim Word Handle
                  {/if}
                </button>
              </div>
            </div>
          {/if}
        {:else}
          <div class="info-box subtle">
            <strong>Word handles unavailable</strong>
            <p>
              {handleRegistryError ||
                "This network does not have a handle registry yet."}
            </p>
          </div>
        {/if}
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

  .warning-box.already-claimed {
    margin-bottom: 1.5rem;
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

  .status-box {
    padding: 0.75rem 1rem;
    border-radius: 8px;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    color: #475569;
    margin-bottom: 1.5rem;
    font-weight: 500;
  }

  .claim-container.dark .status-box {
    background: #334155;
    border-color: #475569;
    color: #cbd5e1;
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
    font-family: "SF Mono", "Monaco", "Inconsolata", "Fira Code", "Courier New",
      monospace;
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
    font-family: "SF Mono", "Monaco", "Inconsolata", "Fira Code", "Courier New",
      monospace;
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

  .handle-section {
    margin-top: 2.5rem;
    padding-top: 2rem;
    border-top: 1px solid #e2e8f0;
  }

  .claim-container.dark .handle-section {
    border-top-color: #334155;
  }

  .handle-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
  }

  .handle-header h3 {
    margin: 0;
    font-size: 1.4rem;
    color: #0f172a;
  }

  .claim-container.dark .handle-header h3 {
    color: #f1f5f9;
  }

  .handle-header p {
    margin: 0.35rem 0 0;
    color: #64748b;
  }

  .claim-container.dark .handle-header p {
    color: #94a3b8;
  }

  .handle-caption {
    font-size: 0.9rem;
    color: #475569;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: flex-end;
  }

  .claim-container.dark .handle-caption {
    color: #cbd5e1;
  }

  .handle-pill {
    background: #e0f2fe;
    color: #0369a1;
    padding: 0.15rem 0.85rem;
    border-radius: 999px;
    font-size: 0.8rem;
    font-weight: 600;
  }

  .claim-container.dark .handle-pill {
    background: #1d4ed8;
    color: #e0f2fe;
  }

  .handle-card {
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 1.5rem;
    background: #ffffff;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
    margin-top: 1rem;
  }

  .claim-container.dark .handle-card {
    background: #1e293b;
    border-color: #334155;
    box-shadow: none;
  }

  .handle-card.claimed {
    border-color: #0f172a;
  }

  .claim-container.dark .handle-card.claimed {
    border-color: #f1f5f9;
  }

  .handle-label {
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #94a3b8;
    margin-bottom: 0.35rem;
  }

  .claim-container.dark .handle-label {
    color: #cbd5e1;
  }

  .handle-phrase {
    font-size: 1.35rem;
    font-weight: 700;
    color: #0f172a;
    word-break: break-word;
  }

  .claim-container.dark .handle-phrase {
    color: #f8fafc;
  }

  .handle-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    align-items: center;
    margin-top: 0.75rem;
    color: #475569;
    font-size: 0.95rem;
  }

  .claim-container.dark .handle-meta {
    color: #cbd5e1;
  }

  .handle-meta code {
    font-family: "SF Mono", "Monaco", "Inconsolata", "Fira Code", "Courier New",
      monospace;
    background: #f1f5f9;
    padding: 0.35rem 0.6rem;
    border-radius: 8px;
  }

  .claim-container.dark .handle-meta code {
    background: #0f172a;
    color: #f8fafc;
  }

  .handle-placeholder {
    margin: 0;
    color: #94a3b8;
  }

  .handle-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin-top: 1.25rem;
  }

  .btn-secondary {
    flex: 1;
    min-width: 180px;
    border: 1px solid #c7d2fe;
    background: #eef2ff;
    color: #1e3a8a;
    border-radius: 10px;
    padding: 0.85rem 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-secondary:hover:not(:disabled) {
    border-color: #818cf8;
    transform: translateY(-1px);
  }

  .claim-container.dark .btn-secondary {
    border-color: #475569;
    background: #1e293b;
    color: #e0e7ff;
  }

  .btn-secondary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-handle-claim {
    flex: 1;
    min-width: 180px;
    border: none;
    border-radius: 10px;
    padding: 0.85rem 1rem;
    font-weight: 600;
    background: var(--accent-primary, #3b82f6);
    color: #ffffff;
    box-shadow: 0 6px 16px rgba(59, 130, 246, 0.25);
    cursor: pointer;
    transition: transform 0.2s ease;
  }

  .btn-handle-claim:hover:not(:disabled) {
    transform: translateY(-1px);
  }

  .btn-handle-claim:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-release {
    margin-top: 1rem;
    border: 1px solid #fecaca;
    background: #fff1f2;
    color: #b91c1c;
    border-radius: 10px;
    padding: 0.75rem 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .claim-container.dark .btn-release {
    background: #3f1d1d;
    border-color: #fecaca;
    color: #fecaca;
  }

  .btn-release:disabled {
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

  .info-box.subtle {
    margin-top: 1rem;
  }

  .error-box.inline,
  .success-box.inline {
    margin-top: 1rem;
    margin-bottom: 0;
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

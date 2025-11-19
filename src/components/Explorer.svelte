<script>
  import { createEventDispatcher, onMount } from "svelte";
  import { ethers } from "ethers";
  import { ethersStore } from "../stores/ethers";
  import { multiChainStore } from "../stores/multichain";
  import { themeStore } from "../stores/theme";
  import { resolveAddressOrENS, isENSName } from "../utils/ens";
  import { parseClaimData } from "../utils/claimParser";
  import {
    loadWordlist,
    decodeHandle,
    formatHandle,
  } from "../utils/wordhandles";
  import Icon from "./Icon.svelte";

  const dispatch = createEventDispatcher();

  let darkMode = false;
  let searchAddress = "";
  let recentClaims = [];
  let loading = false;
  let searchError = null;
  let provider = null;
  let contract = null;
  let contractNetworkName = null;
  let loadingStats = true;
  let chainsInitialized = false;
  let dataReloadPromise = null;
  let activeInfoModal = null;
  let contractChainId = null;
  let previousChainId = null;
  let explorerHandleChainId = null;
  let explorerHandleAvailable = false;
  let handleWordlist = [];
  let handleWordlistPromise = null;

  const createEmptyStats = () => ({
    claimedAddresses: 0,
    activeUsers: 0,
    contractClaims: 0,
  });

  let stats = createEmptyStats();
  let chainStats = [];
  let loadingChainStats = true;
  let chainStatsQueued = false;
  let recentClaimsLoadTimer = null;
  let totalNetworks = 0;
  let handleReadyNetworks = 0;
  let recentClaimsSeededFromStats = false;
  let cachedViewStats = null;
  $: totalNetworks = chainStats.length;
  $: handleReadyNetworks = chainStats.filter(
    (stat) => stat.handleRegistryAvailable,
  ).length;

  const infoHighlights = [
    {
      id: "identity",
      title: "Own Your Identity",
      icon: "shield-alt",
      summary: "Claim your address with verifiable metadata.",
      details: [
        "Bind ENS names, avatars, and biographies directly to your wallet.",
        "Generate DID-compatible identifiers for cross-platform trust.",
        "Sign metadata updates so dapps can independently verify ownership.",
      ],
    },
    {
      id: "network",
      title: "Decentralized Network",
      icon: "network-wired",
      summary: "Build a web of trust without a central authority.",
      details: [
        "Follow, friend, and attest to other wallets entirely on-chain.",
        "Multi-chain support lets you reuse the same identity everywhere.",
        "Events are indexed so explorers and dapps can surface social graphs.",
      ],
    },
    {
      id: "privacy",
      title: "Privacy Control",
      icon: "lock",
      summary: "Decide who can read sensitive metadata.",
      details: [
        "Toggle public/private mode for any field in your profile.",
        "Whitelist trusted viewers and rotate access at any time.",
        "Store extended metadata on IPFS while keeping keys on-chain.",
      ],
    },
  ];

  function resetExplorerData({ keepLoading = false } = {}) {
    stats = createEmptyStats();
    recentClaims = [];
    recentClaimsSeededFromStats = false;
    cachedViewStats = null;
    if (!keepLoading) {
      loadingStats = false;
    }
  }

  function getContractProvider(targetContract) {
    if (!targetContract) {
      return null;
    }

    if (targetContract.runner?.provider) {
      return targetContract.runner.provider;
    }

    if (
      targetContract.runner &&
      typeof targetContract.runner.getBlockNumber === "function"
    ) {
      return targetContract.runner;
    }

    if (
      targetContract.provider &&
      typeof targetContract.provider.getBlockNumber === "function"
    ) {
      return targetContract.provider;
    }

    return null;
  }

  function getReadableContract(chainData) {
    if (!chainData) {
      return null;
    }
    return (
      chainData.readContract ||
      chainData.contract ||
      chainData.writeContract ||
      null
    );
  }

  function deriveExplorerContract(storeValue) {
    if (!storeValue?.chains) {
      return { contract: null, name: null, chainId: null };
    }

    const { primaryChainId, chains } = storeValue;

    if (primaryChainId && chains[primaryChainId]) {
      const chainData = chains[primaryChainId];
      const readableContract = getReadableContract(chainData);
      if (readableContract) {
        return {
          contract: readableContract,
          name: chainData.networkConfig?.name || null,
          chainId: chainData.networkConfig?.chainId || null,
        };
      }
    }

    const fallbackEntry = Object.values(chains).find((chain) => {
      return getReadableContract(chain) && chain?.isAvailable !== false;
    });
    if (fallbackEntry) {
      return {
        contract: getReadableContract(fallbackEntry),
        name: fallbackEntry.networkConfig?.name || null,
        chainId: fallbackEntry.networkConfig?.chainId || null,
      };
    }

    return { contract: null, name: null, chainId: null };
  }

  async function ensureHandleWordlist() {
    if (handleWordlist.length) {
      return handleWordlist;
    }
    if (handleWordlistPromise) {
      return handleWordlistPromise;
    }
    handleWordlistPromise = loadWordlist()
      .then((list) => {
        handleWordlist = list;
        return list;
      })
      .finally(() => {
        handleWordlistPromise = null;
      });
    return handleWordlistPromise;
  }

  async function ensureExplorerHandleSupport(chainId) {
    if (!chainId) {
      explorerHandleAvailable = false;
      explorerHandleChainId = null;
      return false;
    }

    if (explorerHandleAvailable && explorerHandleChainId === chainId) {
      return true;
    }

    explorerHandleChainId = chainId;

    try {
      const info = await multiChainStore.getHandleRegistryInfo(chainId);
      if (!info?.success) {
        explorerHandleAvailable = false;
        return false;
      }
      await ensureHandleWordlist();
      explorerHandleAvailable = true;
      return true;
    } catch (error) {
      console.debug("Handle registry unavailable for explorer:", error);
      explorerHandleAvailable = false;
      return false;
    }
  }

  async function fetchWordHandle(chainId, address) {
    if (!chainId || !address) {
      return null;
    }

    try {
      const result = await multiChainStore.getHandleForAddress(
        chainId,
        address,
      );
      if (!result?.success || !result.handle) {
        return null;
      }
      const vocab = await ensureHandleWordlist();
      const indices = decodeHandle(result.handle);
      const withinBounds =
        vocab.length > 0 && indices.every((idx) => idx < vocab.length);
      const phrase = withinBounds
        ? formatHandle(indices, vocab)
        : ethers.hexlify(result.handle);
      return {
        phrase,
        hex: ethers.hexlify(result.handle),
      };
    } catch (error) {
      console.debug("Failed to fetch handle for explorer card:", error);
      return null;
    }
  }

  async function refreshExplorerData(handleChainIdOverride = contractChainId) {
    if (!contract) {
      return;
    }

    if (dataReloadPromise) {
      return dataReloadPromise;
    }

    const targetContract = contract;
    const handleChainId = handleChainIdOverride;

    dataReloadPromise = (async () => {
      scheduleChainStatsLoad();
      await loadStats();
      stageRecentClaimsLoad(targetContract, handleChainId);
    })().finally(() => {
      dataReloadPromise = null;
    });

    return dataReloadPromise;
  }

  themeStore.subscribe((value) => {
    darkMode = value.darkMode;
  });

  ethersStore.subscribe((value) => {
    provider = value.provider;
  });

  multiChainStore.subscribe((value) => {
    chainsInitialized = (value.initializedChains?.length || 0) > 0;

    const {
      contract: nextContract,
      name,
      chainId: nextChainId,
    } = deriveExplorerContract(value);
    contractNetworkName = name || null;
    const chainChanged =
      nextChainId !== null && nextChainId !== previousChainId;
    previousChainId = nextChainId;
    contractChainId = nextChainId || null;

    // Refresh data if contract changed OR if chain changed (network switch)
    if (nextContract !== contract || (chainChanged && nextContract)) {
      contract = nextContract;
      if (contract) {
        resetExplorerData({ keepLoading: true });
        loadingStats = true;
        refreshExplorerData(contractChainId);
      }
    }

    if (!nextContract) {
      if (chainsInitialized) {
        resetExplorerData();
      } else if (!value.connected) {
        resetExplorerData({ keepLoading: true });
      }
    }
  });

  onMount(async () => {
    await refreshExplorerData(contractChainId);
  });

  async function loadStats() {
    loadingStats = true;

    try {
      const aggregatedStats =
        chainStats.length > 0
          ? chainStats
          : await multiChainStore.getExplorerStats();

      if (aggregatedStats && aggregatedStats.length) {
        chainStats = aggregatedStats;
      }

      const claimTotals = (aggregatedStats || []).reduce(
        (sum, stat) => sum + (stat?.claimedCount || 0),
        0,
      );

      stats = {
        claimedAddresses: claimTotals,
        activeUsers: claimTotals,
        contractClaims: claimTotals,
      };
    } catch (error) {
      console.error("Error loading aggregate stats:", error);
      stats = createEmptyStats();
    } finally {
      loadingStats = false;
    }
  }

  async function loadChainStatsSection() {
    loadingChainStats = true;
    try {
      chainStats = await multiChainStore.getExplorerStats();
    } catch (error) {
      console.error("Failed to load chain stats:", error);
      chainStats = [];
    } finally {
      loadingChainStats = false;
    }
  }

  function scheduleChainStatsLoad() {
    if (chainStatsQueued || chainStats.length > 0) {
      return;
    }
    chainStatsQueued = true;
    const runner = () => {
      chainStatsQueued = false;
      if (chainStats.length > 0) {
        return;
      }
      loadChainStatsSection().catch((error) =>
        console.error("Chain stats load failed:", error),
      );
    };

    if (
      typeof window !== "undefined" &&
      typeof window.requestIdleCallback === "function"
    ) {
      window.requestIdleCallback(() => runner(), { timeout: 1200 });
    } else {
      setTimeout(runner, 50);
    }
  }

  function stageRecentClaimsLoad(targetContract, handleChainId) {
    if (recentClaimsLoadTimer) {
      clearTimeout(recentClaimsLoadTimer);
    }
    recentClaimsLoadTimer = setTimeout(() => {
      recentClaimsLoadTimer = null;
      if (contract === targetContract) {
        loadRecentClaims(targetContract, handleChainId);
      }
    }, 150);
  }

  async function loadRecentClaims(
    targetContract = contract,
    handleChainId = contractChainId,
  ) {
    if (!targetContract) {
      recentClaims = [];
      return;
    }

    try {
      let handleSupport = false;
      if (handleChainId) {
        try {
          handleSupport = await ensureExplorerHandleSupport(handleChainId);
        } catch (handleError) {
          console.debug("Handle support check failed:", handleError);
          handleSupport = false;
        }
      }

      if (recentClaimsSeededFromStats && targetContract === contract) {
        return;
      }

      if (
        cachedViewStats?.recentAddresses?.length &&
        targetContract === contract
      ) {
        const seeded = await buildRecentClaimsFromAddresses(
          cachedViewStats.recentAddresses,
          targetContract,
        );
        recentClaimsSeededFromStats = seeded;
        cachedViewStats = null;
        if (seeded) {
          return;
        }
      }

      const viewStats = await fetchStatsViaView(targetContract, 3);
      if (viewStats) {
        const seeded = await buildRecentClaimsFromAddresses(
          viewStats.recentAddresses,
          targetContract,
        );
        if (seeded && targetContract === contract) {
          recentClaimsSeededFromStats = true;
        }
        if (seeded) {
          return;
        }
      }

      recentClaimsSeededFromStats = false;
      cachedViewStats = null;

      let claimFilter;
      try {
        claimFilter = targetContract.filters.AddressClaimed();
      } catch (filterError) {
        console.error(
          "[Explorer] Failed to build AddressClaimed filter for recent claims:",
          filterError,
        );
        claimFilter = {
          address: targetContract.target,
          topics: [
            "0xb0174747c5fea45e2ab2159ce19603239fc4ed7e3850bb6d6e753cfabd12f461",
          ],
        };
      }
      console.debug(
        "[Explorer] Loading recent claims with contract:",
        targetContract.target,
      );
      const events = await fetchEventsWithAdaptiveLookback(
        targetContract,
        claimFilter,
        {
          initialLookback: 2500,
          maxLookback: 80000,
          chunkSize: 200,
          maxEvents: 12,
          minEvents: 3,
          historyLimitBlocks: 800000,
        },
      );
      console.debug("[Explorer] Recent claim events found:", events.length);

      const recentEvents = events.slice(-3).reverse();

      const claimsData = await Promise.all(
        recentEvents.map(async (event) => {
          const eventAddress = event.args?.claimedAddress || event.args?.[0];
          console.debug("[Explorer] Processing claim event", {
            address: eventAddress,
            blockNumber: event.blockNumber,
            tx: event.transactionHash,
          });
          const address = eventAddress;
          if (!address) {
            return null;
          }

          const timestampValue = event.args?.timestamp ?? event.args?.[2] ?? 0;
          const timestampSecondsRaw =
            typeof timestampValue === "bigint"
              ? Number(timestampValue)
              : Number(timestampValue || 0);
          const fallbackSeconds =
            Number.isFinite(timestampSecondsRaw) && timestampSecondsRaw > 0
              ? timestampSecondsRaw
              : Math.floor(Date.now() / 1000);

          let handleSummary = null;
          if (handleSupport) {
            handleSummary = await fetchWordHandle(handleChainId, address);
          }

          const fallbackClaim = {
            address,
            name: shortenAddress(address) || "Claimed Address",
            avatar: "👤",
            claimTime: fallbackSeconds * 1000,
            isActive: true,
            handle: handleSummary,
          };
          console.debug(
            "[Explorer] Fallback claim data prepared:",
            fallbackClaim,
          );

          try {
            const claim = await targetContract.getClaim(address);
            const parsedClaim = parseClaimData(claim);

            if (!parsedClaim) {
              console.warn("[Explorer] Parsed claim missing, using fallback.", {
                address,
              });
              return fallbackClaim;
            }

            if (parsedClaim.isActive === false) {
              console.debug("[Explorer] Claim inactive, skipping:", {
                address,
              });
              return null;
            }

            const claimTimestamp =
              typeof parsedClaim.claimTime?.toNumber === "function"
                ? parsedClaim.claimTime.toNumber()
                : Number(parsedClaim.claimTime || fallbackSeconds || 0);

            console.debug("[Explorer] Parsed claim info:", {
              address,
              name: parsedClaim.name,
              isActive: parsedClaim.isActive,
              claimTime,
            });
            return {
              address,
              name: parsedClaim.name || fallbackClaim.name,
              avatar: parsedClaim.avatar || fallbackClaim.avatar,
              claimTime: claimTimestamp * 1000,
              isActive: true,
              handle: handleSummary,
              network: networkLabel || fallbackClaim.network,
            };
          } catch (error) {
            console.warn("Error fetching claim metadata:", error);
            return fallbackClaim;
          }
        }),
      );
      console.debug(
        "[Explorer] Recent claims after parsing:",
        claimsData.length,
      );

      if (targetContract !== contract) {
        return;
      }

      if (claimsData.length === 0) {
        console.warn("[Explorer] Recent claims list empty after parsing.");
      }
      recentClaims = claimsData.filter(
        (claim) => claim && claim.isActive !== false,
      );
    } catch (error) {
      if (targetContract === contract) {
        console.error("Error loading recent claims:", error);
        recentClaims = [];
      }
    }
  }

  async function handleSearch() {
    if (!searchAddress) {
      return;
    }

    searchError = null;
    loading = true;

    try {
      // If provider is available and input looks like ENS name, try to resolve it
      if (provider && isENSName(searchAddress)) {
        const { address, ensName } = await resolveAddressOrENS(
          searchAddress,
          provider,
        );

        if (address) {
          dispatch("viewAddress", { view: "address", address, ensName });
        } else {
          searchError = "ENS name not found or could not be resolved";
        }
      } else {
        // Check if it's a valid address format (basic validation)
        if (/^0x[a-fA-F0-9]{40}$/.test(searchAddress)) {
          // Normalize the address to proper checksum
          const normalizedAddress = ethers.getAddress(
            searchAddress.toLowerCase(),
          );
          dispatch("viewAddress", {
            view: "address",
            address: normalizedAddress,
          });
        } else {
          searchError =
            "Invalid address format. Please enter a valid Ethereum address or ENS name.";
        }
      }
    } catch (error) {
      console.error("Search error:", error);
      searchError = "Error searching for address";
    } finally {
      loading = false;
    }
  }

  function viewAddress(address) {
    dispatch("viewAddress", { view: "address", address });
  }

  function openInfoModal(id) {
    const target = infoHighlights.find((item) => item.id === id);
    if (target) {
      activeInfoModal = target;
    }
  }

  function closeInfoModal() {
    activeInfoModal = null;
  }

  const RATE_LIMIT_CODE = -32005;

  function shortenAddress(addr) {
    if (!addr) {
      return "";
    }
    return `${addr.substring(0, 10)}...${addr.substring(addr.length - 8)}`;
  }

  function timeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  }

  function isRateLimitError(error) {
    const code = error?.code ?? error?.error?.code ?? error?.info?.error?.code;
    const message = (
      error?.error?.message ||
      error?.info?.error?.message ||
      error?.message ||
      ""
    )
      .toString()
      .toLowerCase();

    return (
      code === RATE_LIMIT_CODE ||
      message.includes("rate limit") ||
      message.includes("limit exceeded")
    );
  }

  function createRateLimitError(originalError) {
    const error = new Error("RPC rate limit reached while fetching logs");
    error.isRateLimit = true;
    error.originalError = originalError;
    return error;
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function normalizeNumericValue(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : null;
    }
    if (typeof value === "bigint") {
      return Number(value);
    }
    if (typeof value?.toNumber === "function") {
      try {
        return value.toNumber();
      } catch (error) {
        console.warn("Failed to convert numeric value:", error);
      }
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  async function tryGetTotalClaimsFromContract(targetContract) {
    if (!targetContract) {
      return null;
    }

    const candidateMethods = [
      "getTotalClaims",
      "getClaimedAddressesCount",
      "totalActiveClaims",
    ];
    for (const method of candidateMethods) {
      if (typeof targetContract[method] === "function") {
        try {
          const result = await targetContract[method]();
          const numeric = normalizeNumericValue(result);
          if (numeric !== null) {
            return numeric;
          }
        } catch (error) {
          console.warn(`[Explorer] ${method} call failed:`, error);
        }
      }
    }
    return null;
  }

  async function tryFetchClaimedAddressesFromContract(
    targetContract,
    offset,
    limit,
  ) {
    if (!targetContract || limit === 0) {
      return null;
    }

    if (typeof targetContract.getClaimedAddressesPaginated === "function") {
      try {
        const response = await targetContract.getClaimedAddressesPaginated(
          offset,
          limit,
        );
        const addresses = Array.isArray(response?.[0])
          ? response[0]
          : response?.addresses || [];
        const total = normalizeNumericValue(response?.[1] ?? response?.total);
        return { addresses, total };
      } catch (error) {
        console.warn(
          "[Explorer] getClaimedAddressesPaginated call failed:",
          error,
        );
      }
    }

    if (typeof targetContract.getClaimedAddresses === "function") {
      try {
        const addresses = await targetContract.getClaimedAddresses(
          offset,
          limit,
        );
        return { addresses: addresses || [], total: null };
      } catch (error) {
        console.warn("[Explorer] getClaimedAddresses call failed:", error);
      }
    }

    return null;
  }

  async function fetchStatsViaView(targetContract, desiredRecentCount = 3) {
    const totalClaims = await tryGetTotalClaimsFromContract(targetContract);
    if (totalClaims === null) {
      return null;
    }

    let recentAddresses = [];
    if (desiredRecentCount > 0) {
      const limit = desiredRecentCount;
      const offset = totalClaims > limit ? totalClaims - limit : 0;
      const addressResult = await tryFetchClaimedAddressesFromContract(
        targetContract,
        offset,
        limit,
      );
      if (addressResult?.addresses) {
        recentAddresses = addressResult.addresses.filter(Boolean);
      }
    }

    return {
      totalClaims,
      recentAddresses,
    };
  }

  async function fetchClaimCardFromContract(targetContract, address) {
    if (!address) {
      return null;
    }

    const fallbackClaim = {
      address,
      name: shortenAddress(address) || "Claimed Address",
      avatar: "👤",
      claimTime: Date.now(),
      isActive: true,
    };

    try {
      const claim = await targetContract.getClaim(address);
      const parsedClaim = parseClaimData(claim);

      if (!parsedClaim || parsedClaim.isActive === false) {
        return null;
      }

      const claimTimestampSeconds =
        normalizeNumericValue(parsedClaim.claimTime) ??
        Math.floor(Date.now() / 1000);

      return {
        address,
        name: parsedClaim.name || fallbackClaim.name,
        avatar: parsedClaim.avatar || fallbackClaim.avatar,
        claimTime: claimTimestampSeconds * 1000,
        isActive: true,
      };
    } catch (error) {
      console.warn("Error fetching claim via view:", error);
      return fallbackClaim;
    }
  }

  async function buildRecentClaimsFromAddresses(addresses, targetContract) {
    if (!addresses || addresses.length === 0) {
      if (targetContract === contract) {
        recentClaims = [];
      }
      return false;
    }

    const cards = await Promise.all(
      addresses.map((addr) => fetchClaimCardFromContract(targetContract, addr)),
    );
    const filtered = cards.filter(Boolean);

    if (targetContract === contract) {
      recentClaims = filtered.slice().reverse();
    }

    return filtered.length > 0;
  }

  async function fetchEventsInChunks(
    targetContract,
    filter,
    {
      lookback = 4000,
      chunkSize = 500,
      maxEvents = Infinity,
      endBlock = null,
      latestBlockHint = null,
    } = {},
  ) {
    const provider = getContractProvider(targetContract);
    if (!provider || typeof provider.getBlockNumber !== "function") {
      return [];
    }

    let latestBlock;
    try {
      if (typeof endBlock === "number") {
        latestBlock = endBlock;
      } else if (typeof latestBlockHint === "number") {
        latestBlock = latestBlockHint;
      } else {
        latestBlock = Number(await provider.getBlockNumber());
      }
    } catch (error) {
      console.warn(
        "Could not determine latest block for explorer data:",
        error,
      );
      return [];
    }

    if (!Number.isFinite(latestBlock)) {
      return [];
    }

    const minBlock = Math.max(latestBlock - (lookback - 1), 0);
    let currentEnd = latestBlock;
    let currentChunkSize = Math.max(chunkSize, 50);
    const collected = [];
    let consecutiveRateLimits = 0;
    const maxRateLimitRetries = 5;

    while (currentEnd >= minBlock && collected.length < maxEvents) {
      const fromBlock = Math.max(currentEnd - currentChunkSize + 1, minBlock);

      try {
        const events = await targetContract.queryFilter(
          filter,
          fromBlock,
          currentEnd,
        );
        collected.push(...events);
        currentEnd = fromBlock - 1;
        consecutiveRateLimits = 0;
        await delay(250);
      } catch (error) {
        if (isRateLimitError(error)) {
          consecutiveRateLimits += 1;
          if (
            consecutiveRateLimits > maxRateLimitRetries ||
            currentChunkSize <= 50
          ) {
            console.warn(
              "Hit rate limit repeatedly, switching to block-by-block fetch.",
            );
            throw createRateLimitError(error);
          }
          currentChunkSize = Math.max(Math.floor(currentChunkSize / 2), 50);
          await delay(350 * consecutiveRateLimits);
          continue;
        }

        console.warn("Chunked log fetch failed, adjusting range:", error);
        if (currentChunkSize <= 50) {
          throw error;
        }
        currentChunkSize = Math.max(Math.floor(currentChunkSize / 2), 50);
      }
    }

    collected.sort((a, b) => (a.blockNumber || 0) - (b.blockNumber || 0));
    return collected.slice(-maxEvents);
  }

  async function fetchEventsByBlock(
    targetContract,
    filter,
    {
      lookbackBlocks = 5000,
      maxEvents = 300,
      interBlockDelay = 75,
      endBlock = null,
    } = {},
  ) {
    const provider = getContractProvider(targetContract);
    if (!provider || typeof provider.getBlockNumber !== "function") {
      return [];
    }

    let latestBlock;
    try {
      if (typeof endBlock === "number") {
        latestBlock = endBlock;
      } else {
        latestBlock = Number(await provider.getBlockNumber());
      }
    } catch (error) {
      console.warn(
        "Failed to determine latest block for block-by-block fetch:",
        error,
      );
      return [];
    }

    if (!Number.isFinite(latestBlock)) {
      return [];
    }

    const address = filter.address || targetContract.target;
    const topics = filter.topics;
    console.debug("[Explorer] Block-by-block fetch start", {
      target: targetContract.target,
      latestBlock,
      lookbackBlocks,
      maxEvents,
    });

    const events = [];
    const blocksToScan = Math.min(lookbackBlocks, latestBlock + 1);

    for (
      let offset = 0;
      offset < blocksToScan && events.length < maxEvents;
      offset++
    ) {
      const blockNumber = latestBlock - offset;
      if (blockNumber < 0) break;

      let block;
      try {
        block = await provider.getBlock(blockNumber);
      } catch (error) {
        console.warn("Failed to fetch block metadata:", error);
        continue;
      }

      if (!block?.hash) {
        continue;
      }

      try {
        const logs = await provider.getLogs({
          address,
          topics,
          blockHash: block.hash,
        });
        if (logs.length > 0) {
          console.debug(
            "[Explorer] Logs found in block",
            blockNumber,
            "count:",
            logs.length,
          );
        }

        for (const log of logs) {
          try {
            const parsed = targetContract.interface.parseLog(log);
            events.push({
              ...log,
              args: parsed.args,
              eventName: parsed.name,
              blockNumber: log.blockNumber,
              transactionHash: log.transactionHash,
            });
          } catch (parseError) {
            console.warn("Failed to parse log entry:", parseError);
          }
        }
      } catch (error) {
        if (!isRateLimitError(error)) {
          console.warn("Block-by-block log fetch failed:", error);
        } else {
          await delay(400);
        }
      }

      if (events.length >= maxEvents) {
        break;
      }

      if (offset % 5 === 0) {
        await delay(interBlockDelay);
      }
    }

    console.debug("[Explorer] Block-by-block fetch complete", {
      scannedBlocks: Math.min(
        blocksToScan,
        maxEvents ? blocksToScan : blocksToScan,
      ),
      eventsFound: events.length,
    });
    events.sort((a, b) => (a.blockNumber || 0) - (b.blockNumber || 0));
    return events.slice(-maxEvents);
  }

  async function fetchEventsWithAdaptiveLookback(
    targetContract,
    filter,
    {
      initialLookback = 4000,
      maxLookback = 64000,
      chunkSize = 250,
      maxEvents = 500,
      minEvents = 1,
      historyLimitBlocks = 400000,
    } = {},
  ) {
    if (!targetContract || !filter) {
      return [];
    }

    const provider = getContractProvider(targetContract);
    if (!provider || typeof provider.getBlockNumber !== "function") {
      return [];
    }

    let latestBlock;
    try {
      latestBlock = Number(await provider.getBlockNumber());
    } catch (error) {
      console.warn("Unable to resolve latest block for explorer scan:", error);
      return [];
    }

    let lookback = initialLookback;
    let events = [];
    let endCursor = latestBlock;
    let remainingHistory = Math.min(historyLimitBlocks, latestBlock + 1);

    console.debug("[Explorer] Starting adaptive log scan", {
      target: targetContract.target,
      latestBlock,
      historyLimitBlocks,
    });

    while (remainingHistory > 0 && endCursor >= 0) {
      const windowSize = Math.min(lookback, remainingHistory, endCursor + 1);
      console.debug("[Explorer] Query window", { endCursor, windowSize });

      try {
        events = await fetchEventsInChunks(targetContract, filter, {
          lookback: windowSize,
          chunkSize,
          maxEvents,
          endBlock: endCursor,
          latestBlockHint: endCursor,
        });
        console.debug("[Explorer] Window events", { count: events.length });

        if (events.length >= minEvents) {
          break;
        }

        endCursor -= windowSize;
        remainingHistory -= windowSize;
        if (remainingHistory <= 0 || endCursor < 0) {
          break;
        }

        lookback = Math.min(maxLookback, lookback * 2);
      } catch (error) {
        if (error?.isRateLimit) {
          console.warn(
            "Switching to per-block log fetching due to repeated rate limits.",
          );
          events = await fetchEventsByBlock(targetContract, filter, {
            lookbackBlocks: remainingHistory,
            maxEvents,
            endBlock: endCursor,
          });
          break;
        }
        throw error;
      }
    }

    console.debug("[Explorer] Adaptive scan completed", {
      totalEvents: events.length,
    });
    return events;
  }
</script>

<div class="explorer" class:dark={darkMode}>
  <div class="hero">
    <h2>
      <Icon name="globe" size="2.5rem" />
      <span>Blockchain Identity Explorer</span>
    </h2>
    <p>
      Discover and explore claimed addresses on the decentralized human network
    </p>
  </div>

  <div class="search-section">
    <div class="search-bar">
      <input
        type="text"
        placeholder="Search by address or ENS name (0x... or name.eth)"
        bind:value={searchAddress}
        on:keypress={(e) => e.key === "Enter" && handleSearch()}
        disabled={loading}
      />
      <button class="btn-search" on:click={handleSearch} disabled={loading}>
        <Icon name="search" size="1.125rem" />
        {loading ? "Searching..." : "Search"}
      </button>
    </div>
    {#if searchError}
      <div class="search-error">{searchError}</div>
    {/if}
  </div>

  <div class="stats">
    <div class="stat-card">
      <div class="stat-value">
        {loadingStats ? "..." : stats.claimedAddresses}
      </div>
      <div class="stat-label">Claimed Addresses</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">{loadingStats ? "..." : stats.activeUsers}</div>
      <div class="stat-label">Active Users</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">
        {loadingStats ? "..." : stats.contractClaims}
      </div>
      <div class="stat-label">Contract Claims</div>
    </div>
  </div>

  <div class="stats-meta" aria-live="polite">
    {#if contractNetworkName}
      <span>Data source: {contractNetworkName}</span>
    {:else if loadingStats}
      <span>Syncing public chain data...</span>
    {:else}
      <span
        >No public network data detected. Connect a wallet to load live stats.</span
      >
    {/if}
  </div>

  <div class="chain-stats">
    <h3>Network Footprint</h3>
    <div class="chain-summary-row">
      <span
        >{totalNetworks} network{totalNetworks === 1 ? "" : "s"} connected</span
      >
      <span
        >{handleReadyNetworks} handle registry{handleReadyNetworks === 1
          ? ""
          : "ies"} active</span
      >
    </div>
    {#if loadingChainStats}
      <p class="muted">Loading chain summaries...</p>
    {:else if chainStats.length === 0}
      <p class="muted">No networks configured.</p>
    {:else}
      <div class="chain-grid">
        {#each chainStats as chain}
          <div class="chain-card">
            <div class="chain-chip">{chain.name}</div>
            <div class="chain-metric">
              <span>Claims</span><strong>{chain.claimedCount}</strong>
            </div>
            <div
              class="chain-metric handle"
              class:available={chain.handleRegistryAvailable}
            >
              <span>Word Handles</span><strong
                >{chain.handleRegistryAvailable
                  ? "Available"
                  : "Not Configured"}</strong
              >
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <div class="recent-claims">
    <h3>Recent Claims</h3>
    {#if recentClaims.length > 0}
      <div class="claims-grid">
        {#each recentClaims as claim}
          <div class="claim-card" on:click={() => viewAddress(claim.address)}>
            <div class="claim-chain-chip">
              {claim.network || contractNetworkName || "Unknown Network"}
            </div>
            <div class="claim-avatar">{claim.avatar}</div>
            <div class="claim-info">
              <div class="claim-name">{claim.name}</div>
              {#if claim.handle?.phrase}
                <div class="claim-handle">{claim.handle.phrase}</div>
              {/if}
              <div class="claim-address">{shortenAddress(claim.address)}</div>
              <div class="claim-time">{timeAgo(claim.claimTime)}</div>
            </div>
            <div class="claim-badge">
              <Icon name="check" size="0.875rem" />
              Claimed
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <div class="empty-state">
        <Icon name="inbox" size="3rem" />
        <p>No claims found yet. Be the first to claim your address!</p>
      </div>
    {/if}
  </div>

  <div class="info-section">
    {#each infoHighlights as highlight}
      <button
        class="info-card"
        type="button"
        on:click={() => openInfoModal(highlight.id)}
        aria-label={`Learn more about ${highlight.title}`}
      >
        <h4>
          <Icon name={highlight.icon} size="1.5rem" />
          <span>{highlight.title}</span>
        </h4>
        <p>{highlight.summary}</p>
        <span class="info-card-cta">Learn more →</span>
      </button>
    {/each}
  </div>

  {#if activeInfoModal}
    <div
      class="info-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={activeInfoModal.title}
    >
      <div class="info-modal">
        <div class="info-modal-header">
          <div class="info-modal-title">
            <Icon name={activeInfoModal.icon} size="1.5rem" />
            <div>
              <h3>{activeInfoModal.title}</h3>
              <p>{activeInfoModal.summary}</p>
            </div>
          </div>
          <button
            class="info-modal-close"
            on:click={closeInfoModal}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <ul class="info-modal-list">
          {#each activeInfoModal.details as detail}
            <li>{detail}</li>
          {/each}
        </ul>
        <div class="info-modal-actions">
          <button class="btn-primary" on:click={closeInfoModal}>Got it</button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .explorer {
    color: #0f172a;
  }

  .explorer.dark {
    color: #f1f5f9;
  }

  .hero {
    text-align: center;
    margin-bottom: 3rem;
    padding: 3rem 0;
  }

  .hero h2 {
    font-size: 2.75rem;
    font-weight: 800;
    margin-bottom: 1rem;
    color: #0f172a;
    letter-spacing: -0.03em;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
  }

  .explorer.dark .hero h2 {
    color: #f1f5f9;
  }

  .hero p {
    font-size: 1.125rem;
    color: #64748b;
    font-weight: 400;
  }

  .explorer.dark .hero p {
    color: #94a3b8;
  }

  .search-section {
    max-width: 700px;
    margin: 0 auto 4rem;
  }

  .search-bar {
    display: flex;
    gap: 0.75rem;
    background: #ffffff;
    padding: 0.5rem;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
    transition: all 0.2s ease;
  }

  .search-bar:focus-within {
    border-color: #0f172a;
    box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.1);
  }

  .explorer.dark .search-bar {
    background: #1e293b;
    border: 1px solid #334155;
  }

  .explorer.dark .search-bar:focus-within {
    border-color: #f1f5f9;
    box-shadow: 0 0 0 3px rgba(241, 245, 249, 0.1);
  }

  .search-error {
    margin-top: 1rem;
    padding: 1rem 1.25rem;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 10px;
    color: #dc2626;
    text-align: center;
    font-size: 0.9375rem;
  }

  .explorer.dark .search-error {
    background: #450a0a;
    border-color: #7f1d1d;
    color: #fca5a5;
  }

  .search-bar input {
    flex: 1;
    border: none;
    padding: 1rem;
    font-size: 0.9375rem;
    background: transparent;
    color: #0f172a;
    outline: none;
  }

  .search-bar input:focus {
    color: var(--accent-primary);
  }

  .explorer.dark .search-bar input {
    color: #f1f5f9;
  }

  .search-bar input::placeholder {
    color: #94a3b8;
  }

  .btn-search {
    background: var(--accent-primary);
    color: #ffffff;
    border: none;
    padding: 1rem 2rem;
    border-radius: 8px;
    font-weight: 600;
    font-size: 0.9375rem;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .explorer.dark .btn-search {
    background: var(--accent-primary);
    color: #ffffff;
  }

  .btn-search:hover {
    background: var(--accent-primary-hover);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }

  .explorer.dark .btn-search:hover {
    background: var(--accent-primary-hover);
  }

  .btn-search:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-search:disabled:hover {
    transform: none;
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1.5rem;
    margin-bottom: 4rem;
  }

  .stats-meta {
    text-align: center;
    color: #64748b;
    font-size: 0.875rem;
    font-weight: 500;
    margin: -1rem 0 3rem;
  }

  .explorer.dark .stats-meta {
    color: #94a3b8;
  }

  .stat-card {
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(10px);
    padding: 2rem;
    border-radius: 12px;
    text-align: center;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
    transition: all 0.2s ease;
  }

  .explorer.dark .stat-card {
    background: rgba(30, 41, 59, 0.8);
    border: 1px solid #334155;
  }

  .stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12);
  }

  .stat-value {
    font-size: 2.5rem;
    font-weight: 800;
    background: linear-gradient(
      135deg,
      var(--accent-primary),
      var(--accent-secondary)
    );
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 0.5rem;
    letter-spacing: -0.02em;
  }

  .stat-label {
    color: #64748b;
    font-size: 0.9375rem;
    font-weight: 500;
  }

  .explorer.dark .stat-label {
    color: #94a3b8;
  }

  .recent-claims {
    margin-bottom: 4rem;
  }

  .recent-claims h3 {
    color: #0f172a;
    font-size: 1.875rem;
    font-weight: 700;
    margin-bottom: 1.5rem;
    letter-spacing: -0.02em;
  }

  .explorer.dark .recent-claims h3 {
    color: #f1f5f9;
  }

  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
    color: #94a3b8;
  }

  .explorer.dark .empty-state {
    color: #64748b;
  }

  .empty-state p {
    margin-top: 1rem;
    font-size: 1rem;
  }

  .claims-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 1.5rem;
  }

  .muted {
    color: #94a3b8;
    font-size: 0.95rem;
  }

  .explorer.dark .muted {
    color: #64748b;
  }

  .claim-card {
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(10px);
    padding: 1.5rem;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    display: flex;
    align-items: center;
    gap: 1.25rem;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
  }

  .explorer.dark .claim-card {
    background: rgba(30, 41, 59, 0.8);
    border: 1px solid #334155;
  }

  .claim-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
    border-color: var(--accent-primary);
  }

  .explorer.dark .claim-card:hover {
    border-color: var(--accent-primary);
  }

  .claim-avatar {
    font-size: 2.5rem;
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
  }

  .explorer.dark .claim-avatar {
    background: #334155;
    border: 1px solid #475569;
  }

  .claim-info {
    flex: 1;
  }

  .claim-name {
    font-weight: 600;
    font-size: 1.0625rem;
    color: #0f172a;
    margin-bottom: 0.375rem;
  }

  .explorer.dark .claim-name {
    color: #f1f5f9;
  }

  .claim-handle {
    font-size: 0.9rem;
    font-weight: 600;
    color: #0f766e;
    margin-bottom: 0.25rem;
  }

  .explorer.dark .claim-handle {
    color: #5eead4;
  }

  .claim-address {
    font-family: "SF Mono", "Monaco", "Inconsolata", "Fira Code", "Courier New",
      monospace;
    font-size: 0.8125rem;
    color: #64748b;
    margin-bottom: 0.375rem;
  }

  .explorer.dark .claim-address {
    color: #94a3b8;
  }

  .claim-time {
    font-size: 0.8125rem;
    color: #94a3b8;
  }

  .explorer.dark .claim-time {
    color: #64748b;
  }

  .claim-badge {
    background: var(--accent-primary-light);
    color: var(--accent-primary);
    padding: 0.5rem 0.875rem;
    border-radius: 8px;
    font-size: 0.8125rem;
    font-weight: 600;
    border: 1px solid var(--accent-primary);
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }

  .explorer.dark .claim-badge {
    background: rgba(59, 130, 246, 0.1);
    color: var(--accent-primary);
    border: 1px solid var(--accent-primary);
  }

  .info-section {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
  }

  .info-card {
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(10px);
    padding: 2rem;
    border-radius: 12px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
    transition: all 0.2s ease;
    width: 100%;
    text-align: left;
    cursor: pointer;
    outline: none;
  }

  .explorer.dark .info-card {
    background: rgba(30, 41, 59, 0.8);
    border: 1px solid #334155;
  }

  .info-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.15);
    border-color: var(--accent-secondary);
  }

  .info-card h4 {
    color: var(--accent-secondary);
    margin-bottom: 1rem;
    font-size: 1.125rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.625rem;
  }

  .info-card p {
    color: #64748b;
    line-height: 1.6;
    font-size: 0.9375rem;
  }

  .explorer.dark .info-card p {
    color: #94a3b8;
  }

  .info-card-cta {
    display: inline-flex;
    align-items: center;
    margin-top: 1.25rem;
    font-weight: 600;
    color: var(--accent-primary);
  }

  .info-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.65);
    z-index: 999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
  }

  .info-modal {
    background: #ffffff;
    border-radius: 16px;
    max-width: 520px;
    width: 100%;
    padding: 2rem;
    box-shadow: 0 20px 60px rgba(15, 23, 42, 0.25);
  }

  .explorer.dark .info-modal {
    background: #0f172a;
    color: #f8fafc;
  }

  .info-modal-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .info-modal-title {
    display: flex;
    gap: 0.75rem;
  }

  .info-modal-title h3 {
    margin: 0;
    font-size: 1.5rem;
  }

  .info-modal-title p {
    margin: 0.25rem 0 0;
    color: #64748b;
  }

  .explorer.dark .info-modal-title p {
    color: #cbd5e1;
  }

  .info-modal-close {
    background: transparent;
    border: none;
    font-size: 1.25rem;
    cursor: pointer;
    color: inherit;
  }

  .info-modal-list {
    list-style: disc;
    padding-left: 1.25rem;
    color: #475569;
    line-height: 1.6;
  }

  .explorer.dark .info-modal-list {
    color: #e2e8f0;
  }

  .info-modal-actions {
    margin-top: 1.75rem;
    text-align: right;
  }

  .btn-primary {
    background: var(--accent-primary);
    color: #fff;
    border: none;
    border-radius: 999px;
    padding: 0.75rem 1.5rem;
    font-weight: 600;
    cursor: pointer;
  }

  @media (max-width: 768px) {
    .hero h2 {
      font-size: 2rem;
    }

    .hero p {
      font-size: 1rem;
    }

    .search-bar {
      flex-direction: column;
    }

    .claims-grid {
      grid-template-columns: 1fr;
    }
  }
  .chain-stats {
    margin: 2rem 0;
  }

  .chain-summary-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.9rem;
    color: #64748b;
    margin-bottom: 0.75rem;
  }

  .explorer.dark .chain-summary-row {
    color: #94a3b8;
  }

  .chain-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 1rem;
  }

  .chain-card {
    background: rgba(255, 255, 255, 0.8);
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 1.25rem;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.1);
  }

  .explorer.dark .chain-card {
    background: rgba(15, 23, 42, 0.8);
    border-color: #334155;
  }

  .chain-chip {
    display: inline-flex;
    padding: 0.25rem 0.75rem;
    border-radius: 999px;
    background: rgba(59, 130, 246, 0.15);
    color: #1d4ed8;
    font-weight: 600;
    font-size: 0.85rem;
    margin-bottom: 0.75rem;
  }

  .explorer.dark .chain-chip {
    background: rgba(59, 130, 246, 0.25);
    color: #bfdbfe;
  }

  .chain-metric {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 0.5rem;
    font-size: 0.95rem;
    color: #475569;
  }

  .explorer.dark .chain-metric {
    color: #cbd5e1;
  }

  .chain-metric strong {
    font-size: 1.1rem;
    color: #0f172a;
  }

  .explorer.dark .chain-metric strong {
    color: #f8fafc;
  }

  .chain-metric.handle strong {
    color: #b91c1c;
  }

  .chain-metric.handle.available strong {
    color: #0f766e;
  }

  .claim-chain-chip {
    display: inline-flex;
    padding: 0.2rem 0.65rem;
    border-radius: 999px;
    background: rgba(148, 163, 184, 0.2);
    color: #475569;
    font-size: 0.8rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }

  .explorer.dark .claim-chain-chip {
    background: rgba(15, 23, 42, 0.5);
    color: #cbd5e1;
  }
</style>

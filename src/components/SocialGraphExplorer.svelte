<script>
  import { onMount, onDestroy } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  import * as d3 from 'd3';
  import { themeStore } from '../stores/theme';

  export let address;
  export let socialGraph = { following: [], followers: [], friends: [] };
  export let expanded = false;

  const dispatch = createEventDispatcher();

  let container;
  let svg;
  let simulation;
  let darkMode = false;

  themeStore.subscribe(value => {
    darkMode = value.darkMode;
  });

  onMount(() => {
    if (expanded) {
      initializeGraph();
    }
  });

  onDestroy(() => {
    if (simulation) {
      simulation.stop();
    }
  });

  $: if (expanded && container && !svg) {
    initializeGraph();
  }

  function initializeGraph() {
    if (!container) return;

    // Clear any existing SVG
    d3.select(container).selectAll('*').remove();

    // Set dimensions
    const width = container.clientWidth || 800;
    const height = 500;

    // Create SVG
    svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height]);

    // Create graph data
    const graphData = createGraphData();

    // Create force simulation
    simulation = d3.forceSimulation(graphData.nodes)
      .force('link', d3.forceLink(graphData.links)
        .id(d => d.id)
        .distance(100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(40));

    // Create arrow markers for directed edges
    svg.append('defs').selectAll('marker')
      .data(['following', 'friend'])
      .enter().append('marker')
      .attr('id', d => `arrow-${d}`)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', d => d === 'friend' ? '#48bb78' : '#667eea');

    // Create links
    const link = svg.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(graphData.links)
      .enter().append('line')
      .attr('stroke', d => d.type === 'friend' ? '#48bb78' : '#667eea')
      .attr('stroke-width', d => d.type === 'friend' ? 3 : 2)
      .attr('stroke-opacity', 0.6)
      .attr('marker-end', d => `url(#arrow-${d.type})`);

    // Create nodes
    const node = svg.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(graphData.nodes)
      .enter().append('g')
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    // Add circles for nodes
    node.append('circle')
      .attr('r', d => d.id === address ? 20 : 15)
      .attr('fill', d => {
        if (d.id === address) return '#764ba2';
        if (d.type === 'friend') return '#48bb78';
        if (d.type === 'following') return '#667eea';
        return '#4299e1';
      })
      .attr('stroke', darkMode ? '#fff' : '#333')
      .attr('stroke-width', d => d.id === address ? 3 : 2)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        if (d.id !== address) {
          dispatch('viewAddress', { view: 'address', address: d.id });
        }
      });

    // Add labels
    node.append('text')
      .text(d => shortenAddress(d.id))
      .attr('x', 0)
      .attr('y', 30)
      .attr('text-anchor', 'middle')
      .attr('fill', darkMode ? '#e0e0e0' : '#333')
      .attr('font-size', '10px')
      .attr('font-family', 'monospace')
      .style('pointer-events', 'none');

    // Add hover tooltips
    node.append('title')
      .text(d => {
        if (d.id === address) return 'You';
        if (d.type === 'friend') return `Friend: ${d.id}`;
        if (d.type === 'following') return `Following: ${d.id}`;
        return `Follower: ${d.id}`;
      });

    // Update positions on each tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node
        .attr('transform', d => `translate(${d.x},${d.y})`);
    });
  }

  function createGraphData() {
    const nodes = [];
    const links = [];
    const nodeSet = new Set();

    // Add central node (user)
    nodes.push({ id: address, type: 'self' });
    nodeSet.add(address);

    // Add friends (bidirectional)
    socialGraph.friends.forEach(friendAddr => {
      if (!nodeSet.has(friendAddr)) {
        nodes.push({ id: friendAddr, type: 'friend' });
        nodeSet.add(friendAddr);
      }
      links.push({ source: address, target: friendAddr, type: 'friend' });
    });

    // Add following (outgoing)
    socialGraph.following.forEach(followingAddr => {
      if (!nodeSet.has(followingAddr)) {
        nodes.push({ id: followingAddr, type: 'following' });
        nodeSet.add(followingAddr);
      }
      if (!socialGraph.friends.includes(followingAddr)) {
        links.push({ source: address, target: followingAddr, type: 'following' });
      }
    });

    // Add followers (incoming)
    socialGraph.followers.forEach(followerAddr => {
      if (!nodeSet.has(followerAddr)) {
        nodes.push({ id: followerAddr, type: 'follower' });
        nodeSet.add(followerAddr);
      }
      if (!socialGraph.friends.includes(followerAddr) && !socialGraph.following.includes(followerAddr)) {
        links.push({ source: followerAddr, target: address, type: 'following' });
      }
    });

    return { nodes, links };
  }

  function shortenAddress(addr) {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  }

  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }

  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }

  function toggleExpanded() {
    expanded = !expanded;
    if (expanded) {
      setTimeout(() => initializeGraph(), 100);
    }
  }
</script>

<div class="graph-explorer" class:dark={darkMode}>
  <div class="graph-header">
    <h3>🕸️ Social Network Graph</h3>
    <button class="btn-toggle" on:click={toggleExpanded}>
      {expanded ? '▼ Collapse' : '▶ Expand'}
    </button>
  </div>

  {#if expanded}
    <div class="graph-container" bind:this={container}>
      <!-- D3 graph will be rendered here -->
    </div>

    <div class="graph-legend">
      <div class="legend-item">
        <div class="legend-color" style="background: #764ba2;"></div>
        <span>You</span>
      </div>
      <div class="legend-item">
        <div class="legend-color" style="background: #48bb78;"></div>
        <span>Friends (mutual)</span>
      </div>
      <div class="legend-item">
        <div class="legend-color" style="background: #667eea;"></div>
        <span>Following</span>
      </div>
      <div class="legend-item">
        <div class="legend-color" style="background: #4299e1;"></div>
        <span>Followers</span>
      </div>
    </div>

    <div class="graph-info">
      <p>💡 <strong>Tip:</strong> Click on any node to view that address's profile. Drag nodes to rearrange the graph.</p>
    </div>
  {:else}
    <div class="collapsed-message">
      <p>Click "Expand" to view your social network as an interactive graph visualization.</p>
    </div>
  {/if}
</div>

<style>
  .graph-explorer {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    margin-top: 2rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  .graph-explorer.dark {
    background: #1a1a2e;
    color: #e0e0e0;
  }

  .graph-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .graph-header h3 {
    margin: 0;
    font-size: 1.3rem;
    color: #667eea;
  }

  .graph-explorer.dark .graph-header h3 {
    color: #a78bfa;
  }

  .btn-toggle {
    padding: 0.5rem 1rem;
    background: #667eea;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.3s ease;
  }

  .btn-toggle:hover {
    background: #5568d3;
    transform: translateY(-2px);
  }

  .graph-container {
    width: 100%;
    height: 500px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    overflow: hidden;
    background: #f9f9f9;
    margin-bottom: 1rem;
  }

  .graph-explorer.dark .graph-container {
    border-color: rgba(255, 255, 255, 0.1);
    background: #16213e;
  }

  .graph-legend {
    display: flex;
    gap: 1.5rem;
    flex-wrap: wrap;
    padding: 1rem;
    background: #f7fafc;
    border-radius: 8px;
    margin-bottom: 1rem;
  }

  .graph-explorer.dark .graph-legend {
    background: #16213e;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .legend-color {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2px solid #333;
  }

  .graph-explorer.dark .legend-color {
    border-color: #fff;
  }

  .graph-info {
    padding: 0.75rem 1rem;
    background: rgba(102, 126, 234, 0.1);
    border-left: 4px solid #667eea;
    border-radius: 4px;
    font-size: 0.9rem;
  }

  .graph-info p {
    margin: 0;
  }

  .graph-explorer.dark .graph-info {
    background: rgba(102, 126, 234, 0.2);
  }

  .collapsed-message {
    text-align: center;
    padding: 2rem;
    color: #666;
  }

  .graph-explorer.dark .collapsed-message {
    color: #a0aec0;
  }

  @media (max-width: 768px) {
    .graph-container {
      height: 400px;
    }

    .graph-legend {
      gap: 0.75rem;
    }

    .legend-item {
      font-size: 0.85rem;
    }
  }
</style>

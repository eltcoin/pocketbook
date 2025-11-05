# D3 Social Graph Explorer

## Overview

The D3 Social Graph Explorer is an interactive visualization component that displays a user's social network as a force-directed graph. It provides an intuitive way to explore connections and relationships in the decentralized network.

## Features

### Interactive Visualization
- **Force-directed graph**: Nodes naturally position themselves using physics simulation
- **Drag-and-drop**: Click and drag nodes to rearrange the layout
- **Click navigation**: Click on any node to view that address's profile
- **Zoom and pan**: Explore large networks easily

### Visual Encoding
- **Color-coded relationships**:
  - 🟣 Purple: Current user (you)
  - 🟢 Green: Friends (mutual connections)
  - 🔵 Blue: Following
  - 🔵 Light Blue: Followers

- **Node sizes**:
  - Larger: Current user
  - Standard: Other addresses

- **Edge types**:
  - Green arrows: Friend connections (bidirectional)
  - Blue arrows: Following relationships (directional)

### User Interface
- **Expandable panel**: Toggle between collapsed and expanded views
- **Legend**: Clear explanation of colors and node types
- **Tooltips**: Hover over nodes to see address details
- **Tips**: Helpful guidance for interaction

## Implementation

### Technology Stack
- **D3.js v7**: For force simulation and SVG rendering
- **Svelte**: Reactive component framework
- **Force simulation**: Natural node positioning

### Component: SocialGraphExplorer.svelte

```javascript
import * as d3 from 'd3';

// Force simulation setup
simulation = d3.forceSimulation(nodes)
  .force('link', d3.forceLink(links).distance(100))
  .force('charge', d3.forceManyBody().strength(-300))
  .force('center', d3.forceCenter(width/2, height/2))
  .force('collision', d3.forceCollide().radius(40));
```

### Props
- `address`: Current user's address
- `socialGraph`: Object with following, followers, and friends arrays
- `expanded`: Boolean to control visibility (optional)

### Events
- `viewAddress`: Dispatched when a node is clicked
  - `event.detail.address`: The clicked address

## Usage

### In AddressView Component

```svelte
<SocialGraphExplorer 
  {address} 
  socialGraph={socialGraphData} 
  on:viewAddress={handleViewChange} 
/>
```

### Data Format

```javascript
const socialGraphData = {
  following: ['0xabc...', '0xdef...'],
  followers: ['0x123...', '0x456...'],
  friends: ['0x789...']
};
```

## Graph Algorithm

### Node Creation
1. Central node for the current user
2. Friend nodes (bidirectional connections)
3. Following nodes (outgoing connections)
4. Follower nodes (incoming connections)

### Edge Creation
- Friend relationships: Bidirectional edges
- Following: Edges from user to followed address
- Followers: Edges from follower to user

### Deduplication
- Nodes are deduplicated using a Set
- Friends are not shown in following/followers lists to avoid redundancy

## Styling

### Light Mode
- Background: Light gray (#f9f9f9)
- Nodes: Vibrant colors
- Text: Dark (#333)
- Borders: Light gray (#e0e0e0)

### Dark Mode
- Background: Dark navy (#16213e)
- Nodes: Same vibrant colors for consistency
- Text: Light (#e0e0e0)
- Borders: Transparent white

## Performance Considerations

### Optimization
- Force simulation stops after convergence
- Only active when expanded
- SVG rendered once, updated on tick
- Efficient event handling

### Scalability
- Suitable for networks up to ~100 nodes
- Beyond that, consider clustering or filtering
- Force parameters tuned for typical social graphs

## Accessibility

### Keyboard Support
- Tab navigation to focus on nodes
- Enter key to select focused node
- Expand/collapse button is keyboard accessible

### Screen Readers
- SVG has descriptive titles
- Nodes have tooltips with address information
- Alternative list view available (SocialGraph component)

## Browser Compatibility

### Supported Browsers
- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

### Requirements
- SVG support
- ES6 modules
- CSS Grid and Flexbox

## Examples

### Basic Usage
```svelte
<script>
  import SocialGraphExplorer from './SocialGraphExplorer.svelte';
  
  let socialGraph = {
    following: ['0xabc...'],
    followers: ['0x123...'],
    friends: ['0x789...']
  };
</script>

<SocialGraphExplorer 
  address="0xuser..." 
  {socialGraph}
  expanded={true}
/>
```

### With Event Handling
```svelte
<script>
  function handleAddressClick(event) {
    const { address } = event.detail;
    console.log('Navigate to:', address);
  }
</script>

<SocialGraphExplorer 
  address="0xuser..." 
  {socialGraph}
  on:viewAddress={handleAddressClick}
/>
```

## Customization

### Force Parameters
Adjust in `initializeGraph()`:
- `distance(100)`: Link length
- `strength(-300)`: Repulsion between nodes
- `radius(40)`: Collision radius

### Colors
Modify in the node creation:
```javascript
.attr('fill', d => {
  if (d.id === address) return '#764ba2';  // User
  if (d.type === 'friend') return '#48bb78';  // Friends
  // ... etc
})
```

### Layout
Change force simulation center:
```javascript
.force('center', d3.forceCenter(width / 2, height / 2))
```

## Testing

### Unit Tests
See `test/socialGraph.test.js` for utility function tests

### Manual Testing
1. Navigate to a claimed address profile
2. Click "Expand" on the Social Network Graph
3. Verify nodes appear correctly
4. Test drag-and-drop functionality
5. Click nodes to test navigation
6. Test expand/collapse toggle

### Test Cases
- ✅ Empty social graph (single node)
- ✅ Graph with only followers
- ✅ Graph with only following
- ✅ Graph with friends
- ✅ Mixed relationships
- ✅ Large networks (50+ nodes)

## Troubleshooting

### Graph Not Rendering
- Check that D3.js is installed: `npm list d3`
- Verify container element exists
- Check console for errors
- Ensure socialGraph prop has correct structure

### Nodes Overlapping
- Increase collision radius
- Adjust charge strength (more negative)
- Increase canvas size

### Performance Issues
- Reduce number of nodes displayed
- Increase simulation stabilization time
- Consider pagination for large networks

## Future Enhancements

Potential improvements:
- [ ] Filtering by relationship type
- [ ] Search/highlight specific addresses
- [ ] Clustering for large networks
- [ ] Mini-map for navigation
- [ ] Export graph as image
- [ ] Animation when nodes are added/removed
- [ ] Show second-degree connections
- [ ] Network statistics overlay

## References

- [D3.js Force Simulation](https://github.com/d3/d3-force)
- [Force-Directed Graph Tutorial](https://observablehq.com/@d3/force-directed-graph)
- [Svelte Documentation](https://svelte.dev/docs)

## License

MIT License - Same as the Pocketbook project

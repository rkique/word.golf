// Network diagram functionality for finish modals
function createWordPathDiagram(otherWordsArrays, userWordsArray = null, columnIndex =4) {
    if (!otherWordsArrays || otherWordsArrays.length === 0) {
        return;
    }
    // Determine which modal is being used (guest or user) by checking visibility
    const guestContainer = document.getElementById('word-path-container-guest');
    const userContainer = document.getElementById('word-path-container-user');

    let container, svgId, downloadContainer;
    
    // Check which container is actually visible
    const guestModal = document.getElementById('modal-finish-guest');
    const userModal = document.getElementById('modal-finish-user');
    
    const isGuestVisible = guestModal && window.getComputedStyle(guestModal).display !== 'none';
    const isUserVisible = userModal && window.getComputedStyle(userModal).display !== 'none';
    
    if (isGuestVisible && guestContainer) {
        container = guestContainer;
        svgId = 'path-svg-guest';
        downloadContainer = document.querySelector('#modal-finish-guest .svg-download-container');
    } else if (isUserVisible && userContainer) {
        container = userContainer;
        svgId = 'path-svg-user';
        downloadContainer = document.querySelector('#modal-finish-user .svg-download-container');
    } else {
        return;
    }

    container.style.display = 'block';
    container.style.visibility = 'hidden'; // Hide initially, show in finalizeLayout

    const selectedPromptPaths = otherWordsArrays.map(userWords => userWords[columnIndex] || []).filter(path => path.length > 0);
    let currentUserPath = null;
    if (userWordsArray && userWordsArray[columnIndex]) {
        currentUserPath = userWordsArray[columnIndex];
    }

    // Show/hide the appropriate svg-download-container based on word-path-container display
    if (selectedPromptPaths.length === 0) {
        // Hide download container when no graph is shown
        if (downloadContainer) {
            downloadContainer.style.display = 'none';
        }
        return;
    }

    // Show download container when graph is displayed
    if (downloadContainer) {
        const containerDisplay = window.getComputedStyle(container).display;
        if (containerDisplay === 'block') {
            downloadContainer.style.display = 'block';
        } else {
            downloadContainer.style.display = 'none';
        }
    }

    const nodes = new Map();
    const edgeConnections = new Map();

    // Process each user's path
    selectedPromptPaths.forEach((path, userIndex) => {
        for (let i = 0; i < path.length; i++) {
            const word = path[i];
            if (!nodes.has(word)) {
                nodes.set(word, {
                    id: word,
                    x: 0,
                    y: 0,
                    level: i,
                    users: new Set()
                });
            }
            nodes.get(word).users.add(userIndex);

            // Create edge to next word
            if (i < path.length - 1) {
                const nextWord = path[i + 1];
                const edgeKey = `${word}->${nextWord}`;

                if (!edgeConnections.has(edgeKey)) {
                    edgeConnections.set(edgeKey, {
                        from: word,
                        to: nextWord,
                        count: 0,
                        users: new Set(),
                        isUserPath: false
                    });
                }

                const edge = edgeConnections.get(edgeKey);
                edge.count++;
                edge.users.add(userIndex);

                // Check if this is part of the current user's path
                if (currentUserPath &&
                    currentUserPath.indexOf(word) !== -1 &&
                    currentUserPath.indexOf(nextWord) === currentUserPath.indexOf(word) + 1) {
                    edge.isUserPath = true;
                }
            }
        }
    });
    // Cache for text bounding box measurements
    textBoundingBoxCache = new Map();
    drawNetworkDiagram(
        Array.from(nodes.values()),
        Array.from(edgeConnections.values()),
        selectedPromptPaths,
        svgId,
        currentUserPath); // Pass currentUserPath to the function
}

function fontSizeforNode(node) {
    return 32 + Math.min(node.userCount * 2, 48);
}

// Colors using CSS variables
textColor = getComputedStyle(document.documentElement).getPropertyValue('--grayed-out-color');
backgroundColor = getComputedStyle(document.documentElement).getPropertyValue('--background-color');
borderColor = getComputedStyle(document.documentElement).getPropertyValue('--grayed-out-color-unfocused');
accentColor = getComputedStyle(document.documentElement).getPropertyValue('--hover-color');
userColorEmph = '#c0c499ff'
userColor = getComputedStyle(document.documentElement).getPropertyValue('--grayed-out-color-help-target');
otherUserColor = getComputedStyle(document.documentElement).getPropertyValue('--border-color');

async function drawNetworkDiagram(nodes, edges, paths, svgId, currentUserPath) { // Added currentUserPath parameter
    const svg = document.getElementById(svgId);
    if (!svg) {
        return;
    }

    // Clear existing content
    svg.innerHTML = '';

    // Get SVG dimensions
    const rect = svg.getBoundingClientRect();
    const width = Math.max(rect.width, 600) || 600;
    const height = Math.max(rect.height, 600) || 600;

    // Convert to D3 format
    let d3Nodes = nodes.map(node => ({
        id: node.id,
        level: node.level,
        users: node.users,
        userCount: node.users.size
    }));

    // Get start and final words
    const startWord = paths[0][0];
    const finalWord = paths[0][paths[0].length - 1];
    const importantNodes = nodes.filter(node => (currentUserPath.includes(node.id)));
    let countLimits = [6, 5, 3]

    if (importantNodes.length > 7){
        countLimits = [4, 3, 3];
    }
    // Filters down to not important nodes
    d3Nodes = d3Nodes.filter((node) => { return !importantNodes.includes(node); });
    d3Nodes = d3Nodes.filter((node, index, self) => {
        const userCount = node.userCount;
        const sameUserCountNodes = self.filter(node => node.userCount === userCount);
        if (userCount === 1) {
            return sameUserCountNodes.indexOf(node) < countLimits[0];
        } else if (userCount === 2) {
            return sameUserCountNodes.indexOf(node) < countLimits[1];
        } else if (userCount >= 3) {
            return sameUserCountNodes.indexOf(node) < countLimits[2];
        }
        return false;
    });
    //add important nodes back to d3Nodes if not in d3Nodes
    importantNodes.forEach(importantNode => {
        if (!d3Nodes.some(node => node.id === importantNode.id)) {
            d3Nodes.push({
                id: importantNode.id,
                level: importantNode.level,
                users: importantNode.users,
                userCount: importantNode.users.size
            });
        }
    });

    edges = edges.filter(edge => {
        return d3Nodes.some(node => node.id === edge.from) &&
            d3Nodes.some(node => node.id === edge.to);
    });

    d3Links = edges.map(edge => ({
        source: edge.from,
        target: edge.to,
        count: edge.count,
        isUserPath: edge.isUserPath
    }));
    function calculateTextBoundingBox(node) {
        const fontSize = fontSizeforNode(node);
        const text = node.id.length > 12 ? node.id.substring(0, 10) + '...' : node.id;
        const cacheKey = `${node.id}-${fontSize}-${text}`;

        // Check cache first
        if (textBoundingBoxCache.has(cacheKey)) {
            return textBoundingBoxCache.get(cacheKey);
        }
        let result;
        const avgCharWidth = fontSize * 0.6;
        const textWidth = text.length * avgCharWidth + 8; // Add padding
        const textHeight = fontSize + 4; // Add padding
        result = {
            width: textWidth,
            height: textHeight,
            halfWidth: textWidth / 2,
            halfHeight: textHeight / 2
        };
        textBoundingBoxCache.set(cacheKey, result);
        return result;
    }
    function checkBoundingBoxCollision(node1, node2) {
        const bbox1 = calculateTextBoundingBox(node1);
        const bbox2 = calculateTextBoundingBox(node2);

        const dx = Math.abs(node2.x - node1.x);
        const dy = Math.abs(node2.y - node1.y);

        // Add small padding to prevent touching
        const minHorizontalDistance = bbox1.halfWidth + bbox2.halfWidth + 8
        const minVerticalDistance = bbox1.halfHeight + bbox2.halfHeight + 12;

        // Check for standard overlap collision
        const isOverlapping = dx < minHorizontalDistance && dy < minVerticalDistance;
        
        // Add margins to make the inner boxes appear larger for collision detection
        const marginX = 12; // Horizontal margin around text
        const marginY = 8;  // Vertical margin around text
        
        // Check if one node is completely inside the other (with margins)
        const node1Left = node1.x - bbox1.halfWidth - marginX;
        const node1Right = node1.x + bbox1.halfWidth + marginX;
        const node1Top = node1.y - bbox1.halfHeight - marginY;
        const node1Bottom = node1.y + bbox1.halfHeight + marginY;
        
        const node2Left = node2.x - bbox2.halfWidth - marginX;
        const node2Right = node2.x + bbox2.halfWidth + marginX;
        const node2Top = node2.y - bbox2.halfHeight - marginY;
        const node2Bottom = node2.y + bbox2.halfHeight + marginY;
        
        // Check if node1 is inside node2 (with margins)
        const node1InsideNode2 = (
            node1Left >= node2Left && node1Right <= node2Right ||
            node1Top >= node2Top && node1Bottom <= node2Bottom
        );
        
        // Check if node2 is inside node1 (with margins)
        const node2InsideNode1 = (
            node2Left >= node1Left && node2Right <= node1Right ||
            node2Top >= node1Top && node2Bottom <= node1Bottom
        );

        const isCollided = isOverlapping || node1InsideNode2 || node2InsideNode1;
        
        if (isCollided){
            // console.log(`Collision detected between ${node1.id} and ${node2.id}`);
            return true;
        } else return false;
    }

    // Create D3 SVG
    const d3Svg = d3.select(svg);
    // Create force simulation with your parameters
    const simulation = d3.forceSimulation(d3Nodes)
        .force('link', d3.forceLink(d3Links)
            .id(d => d.id)
            .strength(1) // attractionStrength
            .distance(50))
        .force('charge', d3.forceManyBody()
            .strength(d => -1900 * (1 + d.userCount * 0.1))) // Bigger nodes repel more
        .force('center', d3.forceCenter(width / 2, height / 2)
            .strength(0.1)) // centeringForce
        .force('collision', d3.forceCollide()
            .radius(d => {
                const bbox = calculateTextBoundingBox(d);
                return Math.max(bbox.halfWidth, bbox.halfHeight) + 10;
            }))
        .alphaDecay(0.1) // damping equivalent
        .velocityDecay(0.9); // damping

    // Initialize positions based on level
    const maxLevel = Math.max(...d3Nodes.map(n => n.level));
    d3Nodes.forEach(node => {
        const bbox = calculateTextBoundingBox(node);
        const margin = 20;
        
        const levelProgress = maxLevel > 0 ? node.level / maxLevel : 0.5;
        // Ensure initial X position keeps bounding box within bounds
        const minX = bbox.halfWidth + margin;
        const maxX = width - bbox.halfWidth - margin;
        node.x = Math.max(minX, Math.min(maxX, minX + levelProgress * (maxX - minX)));
        
        const levelHeight = height / (maxLevel + 1);
        const levelCenter = levelHeight * (node.level + 0.5);
        // Ensure initial Y position keeps bounding box within bounds
        const minY = bbox.halfHeight + margin;
        const maxY = height - bbox.halfHeight - margin;
        const targetY = levelCenter + (Math.random() - 0.5) * levelHeight * 0.6;
        node.y = Math.max(minY, Math.min(maxY, targetY));
    });

    const userPathLinks = d3Svg.append('g')
        .selectAll('line')
        .data(d3Links.filter(d => d.isUserPath))
        .enter().append('line')
        .attr('stroke', 'var(--emphasis-color)')
        .attr('stroke-width', d => Math.max(2, Math.min(4, d.count + 1)) + 1) // Slightly thicker for user path
        .attr('opacity', 0.9);

    // Create links
    const link = d3Svg.append('g')
        .selectAll('line')
        .data(d3Links.filter(d => !d.isUserPath))
        .enter().append('line')
        .attr('stroke', borderColor)
        .attr('stroke-width', d => Math.max(2, Math.min(4, d.count + 1)))
        .attr('opacity', 0.6);

    // Create nodes
    const node = d3Svg.append('g')
        .selectAll('g')
        .data(d3Nodes)
        .enter().append('g');

    // Add background rectangle for each text node
    node.append('rect')
        .attr('x', d => {
            const bbox = calculateTextBoundingBox(d);
            return -bbox.halfWidth + 10
        })
        .attr('y', d => {
            const bbox = calculateTextBoundingBox(d);
            return -bbox.halfHeight
        })
        .attr('width', d => {
            const bbox = calculateTextBoundingBox(d);
            return bbox.width;
        })
        .attr('height', d => {
            const bbox = calculateTextBoundingBox(d);
            return bbox.height * 0.8;
        })
        .attr('fill', backgroundColor)
        // .attr('stroke', borderColor)
        // .attr('stroke-width', 1)
        // .attr('rx', 4)
        // .attr('ry', 4)
        .attr('opacity', 0.7);

    // Add text
    node.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', 3)
        .attr('font-size', d => fontSizeforNode(d)) // Adjusted font size based on user count
        .attr('font-weight', 'bold')
        .attr('fill', d => [startWord, finalWord].includes(d.id) ? userColorEmph : currentUserPath && currentUserPath.includes(d.id) ? userColor : otherUserColor)
        .text(d => d.id.length > 12 ? d.id.substring(0, 10) + '...' : d.id);


    // Update positions on each tick
    simulation.on('tick', () => {
        // Keep nodes within bounds considering their text bounding boxes
        d3Nodes.forEach(d => {
            const bbox = calculateTextBoundingBox(d);
            const margin = 20;
            // Constrain based on bounding box, not just center point
            d.x = Math.max(bbox.halfWidth + margin, Math.min(width - bbox.halfWidth - margin, d.x));
            d.y = Math.max(bbox.halfHeight + margin, Math.min(height - bbox.halfHeight - margin, d.y));
        });

        userPathLinks
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);

        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);


        node.attr('transform', d => `translate(${d.x},${d.y})`);
        // Stop simulation when alpha gets low (nodes have settled)
        if (simulation.alpha() < 0.005) {
            simulation.stop();
            
            // After simulation stops, check for collisions and resolve them
            checkAndResolveCollisions();
            finalizeLayout();
        }
    });

    function checkAndResolveCollisions() {
        let maxIterations = 100;
        let iteration = 0;
        let hasCollisions = true;
        
        while (hasCollisions && iteration < maxIterations) {
            hasCollisions = false;
            let resolvedCount = 0;
            
            // Phase 1: Broad Phase - Quick spatial filtering using bounding boxes (per iteration)
            const potentialCollisions = [];
            
            for (let i = 0; i < d3Nodes.length; i++) {
                for (let j = i + 1; j < d3Nodes.length; j++) {
                    const node1 = d3Nodes[i];
                    const node2 = d3Nodes[j];
                    const dx = node2.x - node1.x;
                    const dy = node2.y - node1.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const bbox1 = calculateTextBoundingBox(node1);
                    const bbox2 = calculateTextBoundingBox(node2);
                    const maxDistance = Math.sqrt(
                        Math.pow(bbox1.halfWidth + bbox2.halfWidth + 20, 2) + 
                        Math.pow(bbox1.halfHeight + bbox2.halfHeight + 20, 2)
                    );
                    
                    if (distance < maxDistance) {
                        potentialCollisions.push({node1, node2, distance});
                    }
                }
            }
            
            // Phase 2: Narrow Phase - Precise collision detection and resolution
            // Sort potential collisions by distance (resolve closest pairs first)
            potentialCollisions.sort((a, b) => a.distance - b.distance);
            
            for (const {node1, node2} of potentialCollisions) {
                if (checkBoundingBoxCollision(node1, node2)) {
                    hasCollisions = true;
                    resolvedCount++;
                    
                    const bbox1 = calculateTextBoundingBox(node1);
                    const bbox2 = calculateTextBoundingBox(node2);
                    
                    // Calculate collision normal (direction to separate)
                    const dx = node2.x - node1.x;
                    const dy = node2.y - node1.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // Minimum separation distance with safety margin
                    const minSeparation = Math.max(
                        bbox1.halfWidth + bbox2.halfWidth + 4,
                        bbox1.halfHeight + bbox2.halfHeight + 2,
                    );
                    
                    if (distance > 0) {
                        // Normalize collision vector
                        const normalX = dx / distance;
                        const normalY = dy / distance;
                        // Calculate required separation
                        const separationDistance = minSeparation - distance;
                        // Apply separation force (move both nodes to distribute load)
                        const separationX = normalX * separationDistance * 0.5;
                        const separationY = normalY * separationDistance * 0.5;
                        
                        // Move nodes apart
                        node1.x -= separationX;
                        node1.y -= separationY;
                        node2.x += separationX;
                        node2.y += separationY;
                    } else {
                        // Handle identical positions with random separation
                        const angle = Math.random() * 2 * Math.PI;
                        const separationX = Math.cos(angle) * minSeparation * 0.5;
                        const separationY = Math.sin(angle) * minSeparation * 0.5;
                        
                        node1.x -= separationX;
                        node1.y -= separationY;
                        node2.x += separationX;
                        node2.y += separationY;
                    }
                    
                    // Constrain nodes within bounds
                    [node1, node2].forEach(node => {
                        const bbox = calculateTextBoundingBox(node);
                        const margin = 5;
                        node.x = Math.max(bbox.halfWidth + margin, 
                                Math.min(width - bbox.halfWidth - margin, node.x));
                        node.y = Math.max(bbox.halfHeight + margin, 
                                Math.min(height - bbox.halfHeight - margin, node.y));
                    });
                }
            }
            
            iteration++;
            if (resolvedCount > 0) {
                const totalPairs = d3Nodes.length * (d3Nodes.length - 1) / 2;
                // console.log(`Iteration ${iteration}: Checked ${potentialCollisions.length}/${totalPairs} pairs, resolved ${resolvedCount} collisions`);
            }
        }
    }

    function finalizeLayout() {        
        // Update visual positions with best layout
        node.attr('transform', d => `translate(${d.x},${d.y})`);
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);
        userPathLinks
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);

        // Set final viewBox with best layout
        const xMargin = 100;
        const bottomMargin = 100;
        const topMargin = 40;
        const xExtent = d3.extent(d3Nodes, d => d.x);
        const yExtent = d3.extent(d3Nodes, d => d.y);
        const viewBoxX = xExtent[0] - xMargin;
        const viewBoxY = yExtent[0] - topMargin;
        const viewBoxWidth = xExtent[1] - xExtent[0] + 2 * xMargin;
        const viewBoxHeight = yExtent[1] - yExtent[0] + bottomMargin + topMargin;
        svg.setAttribute('viewBox', `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`);
        // Show container after optimization is complete
        const container = document.getElementById(svgId.replace('path-svg-', 'word-path-container-'));
        if (container) {
            container.style.visibility = 'visible';
        }
        // console.log(`Final optimized layout: ${viewBoxWidth} x ${viewBoxHeight}`);
        localStorage.setItem('viewBoxWidth', viewBoxWidth);
        localStorage.setItem('viewBoxHeight', viewBoxHeight);
        
        // Add legend and watermark directly to the main SVG after layout is finalized
        addLegendToMainSvg(svg, viewBoxX, viewBoxY, viewBoxWidth, viewBoxHeight);
    }
} // End of drawNetworkDiagram function

function addLegendToMainSvg(svg, viewBoxX, viewBoxY, viewBoxWidth, viewBoxHeight) {

    const d3Svg = d3.select(svg);
    
    const legendX = viewBoxX + 20;
    const legendY = viewBoxY + viewBoxHeight - 60;
    const legend = d3Svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${legendX}, ${legendY})`);

    legend.append('rect')
        .attr('x', -10)
        .attr('y', -10)
        .attr('width', 140)
        .attr('height', 60)
        .attr('fill', backgroundColor)
        .attr('stroke', borderColor)
        .attr('stroke-width', 1)
        .attr('opacity', 0.9);

    // User color legend item
    legend.append('circle')
        .attr('cx', 10)
        .attr('cy', 10)
        .attr('r', 6)
        .attr('fill', userColorEmph);

    legend.append('text')
        .attr('x', 25)
        .attr('y', 15)
        .attr('font-size', '18px')
        .attr('fill', textColor)
        .text('your path');

    // Other users color legend item
    legend.append('circle')
        .attr('cx', 10)
        .attr('cy', 35)
        .attr('r', 6)
        .attr('fill', otherUserColor);

    legend.append('text')
        .attr('x', 25)
        .attr('y', 40)
        .attr('font-size', '18px')
        .attr('fill', textColor)
        .text('other users');
    
    // Add URL watermark to bottom right corner in viewBox coordinates
    const watermarkX = viewBoxX + viewBoxWidth - 85;
    const watermarkY = viewBoxY + viewBoxHeight - 12;
    
    const watermark = d3Svg.append('g')
        .attr('class', 'watermark')
        .attr('transform', `translate(${watermarkX}, ${watermarkY})`);

    watermark.append('text')
        .attr('x', 0)
        .attr('y', 0)
        .attr('font-size', '18px')
        .attr('font-family', 'Arial, sans-serif')
        .attr('fill', textColor)
        .attr('opacity', 0.7)
        .attr('text-anchor', 'start')
        .text('word.golf');
}

// Make the functions globally available
window.createWordPathDiagram = createWordPathDiagram;

import { GraphData, Node, Edge } from '@/types/graph';

interface GraphMap {
  [nodeId: string]: {
    [neighborId: string]: number; // distance
  };
}

export function findShortestPath(data: GraphData, startId: string, endId: string): string[] | null {
  // Build adjacency list
  const graph: GraphMap = {};
  
  data.nodes.forEach(node => {
    graph[node.id] = {};
  });

  data.edges.forEach(edge => {
    if (!graph[edge.sourceId]) graph[edge.sourceId] = {};
    if (!graph[edge.targetId]) graph[edge.targetId] = {};
    
    // Assuming undirected graph or bidirectional edges?
    // Looking at the data, edges have source and target.
    // Usually walkable paths are bidirectional unless specified.
    // The dataset has "edges" array. Let's assume bidirectional for now as they are walkways.
    
    // Check if edge already exists to avoid overwriting shorter path if duplicates
    const currentDist = graph[edge.sourceId][edge.targetId];
    if (currentDist === undefined || edge.distance < currentDist) {
       graph[edge.sourceId][edge.targetId] = edge.distance;
    }
    
    const currentDistReverse = graph[edge.targetId][edge.sourceId];
    if (currentDistReverse === undefined || edge.distance < currentDistReverse) {
       graph[edge.targetId][edge.sourceId] = edge.distance;
    }
  });

  // Dijkstra's Algorithm
  const distances: { [key: string]: number } = {};
  const previous: { [key: string]: string | null } = {};
  const pq: string[] = []; // Simple priority queue (array based for simplicity given graph size < 2000 nodes)

  data.nodes.forEach(node => {
    distances[node.id] = Infinity;
    previous[node.id] = null;
    pq.push(node.id);
  });

  distances[startId] = 0;

  while (pq.length > 0) {
    // Sort pq by distance (naive implementation)
    pq.sort((a, b) => distances[a] - distances[b]);
    const shortestNodeId = pq.shift(); // Remove node with smallest distance

    if (!shortestNodeId) break;
    if (shortestNodeId === endId) break; // Reached destination
    if (distances[shortestNodeId] === Infinity) break; // Remaining nodes unreachable

    const neighbors = graph[shortestNodeId];
    if (!neighbors) continue;

    for (const neighborId in neighbors) {
      const distance = neighbors[neighborId];
      const alt = distances[shortestNodeId] + distance;

      if (alt < distances[neighborId]) {
        distances[neighborId] = alt;
        previous[neighborId] = shortestNodeId;
      }
    }
  }

  // Reconstruct path
  const path: string[] = [];
  let u: string | null = endId;
  
  if (previous[u] !== null || u === startId) {
    while (u !== null) {
      path.unshift(u);
      u = previous[u];
    }
  }

  return path.length > 0 ? path : null;
}


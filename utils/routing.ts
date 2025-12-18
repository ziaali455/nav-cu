import { GraphData, Node } from '@/types/graph';

export type RoutePreferences = {
  /**
   * If true, remove any edge where `no_stairs === false`.
   * Use this for wheelchair mode or explicit "avoid stairs".
   */
  disallowStairs?: boolean;
  /**
   * Extra cost added when traversing an outdoor segment (based on node fields).
   * Used for "minimize outdoor paths".
   */
  outdoorPenalty?: number;
  /**
   * Penalty applied every time a path crosses the campus boundary
   * (inside -> outside or outside -> inside).
   */
  campusBoundaryPenalty?: number;
};

type Neighbor = {
  id: string;
  distance: number;
  no_stairs: boolean;
};

type GraphAdj = Record<string, Neighbor[]>;

export function findShortestPath(
  data: GraphData,
  startId: string,
  endId: string,
  preferences: RoutePreferences = {}
): string[] | null {
  const nodeMap = new Map<string, Node>();
  data.nodes.forEach(node => nodeMap.set(node.id, node));

  const graph: GraphAdj = {};
  data.nodes.forEach(node => {
    graph[node.id] = [];
  });

  const disallowStairs = !!preferences.disallowStairs;
  // Stairs penalty is intentionally disabled (graph should already be stair-free)
  const stairsPenalty = 0;
  const outdoorPenalty = Math.max(0, preferences.outdoorPenalty ?? 0);
  const campusBoundaryPenalty = Math.max(0, preferences.campusBoundaryPenalty ?? 0);

  const isOutdoorNode = (node?: Node) =>
    node?.indoor === false || node?.outside_campus === true;

  const edgeCost = (fromId: string, toId: string, neighbor: Neighbor) => {
    let cost = neighbor.distance;

    if (neighbor.no_stairs === false) {
      cost += stairsPenalty;
    }

    const fromNode = nodeMap.get(fromId);
    const toNode = nodeMap.get(toId);

    // Apply outdoor penalty only when moving between indoor and outdoor and setting is enabled
    const crossesIndoorOutdoor =
      (fromNode?.indoor === true && isOutdoorNode(toNode)) ||
      (toNode?.indoor === true && isOutdoorNode(fromNode));
    if (outdoorPenalty > 0 && crossesIndoorOutdoor) {
      cost += outdoorPenalty;
    }

    if (campusBoundaryPenalty > 0) {
      const fromOutside = !!fromNode?.outside_campus;
      const toOutside = !!toNode?.outside_campus;
      if (fromOutside !== toOutside) {
        cost += campusBoundaryPenalty;
      }
    }

    return cost > 0 ? cost : neighbor.distance;
  };

  data.edges.forEach(edge => {
    // Remove non-accessible edges when required (wheelchair / avoid stairs)
    if (disallowStairs && edge.no_stairs === false) return;

    if (graph[edge.sourceId]) {
      graph[edge.sourceId].push({
        id: edge.targetId,
        distance: edge.distance,
        no_stairs: edge.no_stairs,
      });
    }

    if (graph[edge.targetId]) {
      graph[edge.targetId].push({
        id: edge.sourceId,
        distance: edge.distance,
        no_stairs: edge.no_stairs,
      });
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

    for (const neighbor of neighbors) {
      if (distances[neighbor.id] === undefined) continue;

      const alt =
        distances[shortestNodeId] + edgeCost(shortestNodeId, neighbor.id, neighbor);

      if (alt < distances[neighbor.id]) {
        distances[neighbor.id] = alt;
        previous[neighbor.id] = shortestNodeId;
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


export interface Node {
  id: string;
  x: number;
  y: number;
  name: string;
  no_stairs: boolean;
  outside_campus?: boolean;
  indoor?: boolean;
  elevator?: boolean;
  different_floor?: boolean;
}

export interface Edge {
  id: string;
  sourceId: string;
  targetId: string;
  distance: number;
  no_stairs: boolean;
}

export interface GraphData {
  nodes: Node[];
  edges: Edge[];
}


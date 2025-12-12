import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Line, Circle, G } from 'react-native-svg';
import { GraphData, Node } from '@/types/graph';

interface GraphOverlayProps {
  data: GraphData;
  width: number;
  height: number;
  originalWidth?: number; // Width of the coordinate system in JSON
  originalHeight?: number; // Height of the coordinate system in JSON
  highlightedPath?: string[]; // Array of node IDs
  highlightedNodes?: string[]; // Array of node IDs to highlight specifically
}

// Based on the JSON data scan, the coordinates seem to be roughly in a 1000x1000 box?
// Let's assume for now we might need to calibrate this. 
// Looking at the data, max X is around 900, max Y is around 700.
// A standard map image might be 1000x1000 or similar.
// We'll use a default scale or allow passing it in.

const DEFAULT_COORD_WIDTH = 1000; 
const DEFAULT_COORD_HEIGHT = 1000;

export default function GraphOverlay({ 
  data, 
  width, 
  height, 
  originalWidth = DEFAULT_COORD_WIDTH,
  originalHeight = DEFAULT_COORD_HEIGHT,
  highlightedPath = [],
  highlightedNodes = []
}: GraphOverlayProps) {
  
  // Calculate scaling factors
  // The graph coordinates need to be mapped to the view dimensions (width, height)
  // We assume the graph coordinates correspond to the original image dimensions.
  
  // However, "contain" mode in Image means the image might be letterboxed.
  // We really need the actual rendered dimensions of the image.
  // Passed 'width' and 'height' should be the actual displayed size of the map image.
  
  const scaleX = width / originalWidth;
  const scaleY = height / originalHeight;

  // We can use a unified scale if the aspect ratio is preserved and coordinates match that.
  // But let's stick to independent scaling if the container might distort (though map shouldn't).
  
  // Helper to get node by ID for edge drawing
  const nodeMap = new Map<string, Node>();
  data.nodes.forEach(node => nodeMap.set(node.id, node));

  return (
    <View style={[styles.container, { width, height }]} pointerEvents="none">
      <Svg height={height} width={width}>
        <G>
          {/* Draw Edges */}
          {data.edges.map(edge => {
            const source = nodeMap.get(edge.sourceId);
            const target = nodeMap.get(edge.targetId);

            if (!source || !target) return null;

            // Check if this edge is part of the highlighted path
            let isHighlighted = false;
            if (highlightedPath.length > 1) {
              // Check if source and target are sequential in the path
              const sourceIndex = highlightedPath.indexOf(edge.sourceId);
              const targetIndex = highlightedPath.indexOf(edge.targetId);
              
              if (sourceIndex !== -1 && targetIndex !== -1) {
                // They must be adjacent in the path array
                if (Math.abs(sourceIndex - targetIndex) === 1) {
                  isHighlighted = true;
                }
              }
            }
            
            return (
              <Line
                key={edge.id}
                x1={source.x * scaleX}
                y1={source.y * scaleY}
                x2={target.x * scaleX}
                y2={target.y * scaleY}
                stroke={isHighlighted ? "#FF4B4B" : "rgba(0,0,255, 0.15)"}
                strokeWidth={isHighlighted ? 4 : 1}
              />
            );
          })}

          {/* Draw Nodes */}
          {data.nodes.map(node => {
            const isHighlighted = highlightedNodes.includes(node.id);
            const isPathNode = highlightedPath.includes(node.id);
            
            // Only draw relevant nodes or all nodes? User asked to "overlay this graph".
            // Drawing all might be cluttered. Let's draw small dots for all, bigger for highlighted.
            
            return (
              <Circle
                key={node.id}
                cx={node.x * scaleX}
                cy={node.y * scaleY}
                r={isHighlighted || isPathNode ? 4 : 2}
                fill={isHighlighted ? "red" : (isPathNode ? "orange" : "rgba(0,0,255, 0.5)")}
              />
            );
          })}
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'transparent',
  },
});


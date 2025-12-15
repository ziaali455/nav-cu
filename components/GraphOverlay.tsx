import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import Svg, { Line, G } from 'react-native-svg';
import { GraphData, Node } from '@/types/graph';

interface MarkerVisibility {
  showElevators: boolean;
  showRamps: boolean;
  showEntrances: boolean;
  showWheelchairAccess: boolean;
}

interface GraphOverlayProps {
  data: GraphData;
  width: number;
  height: number;
  originalWidth?: number; // Width of the coordinate system in JSON
  originalHeight?: number; // Height of the coordinate system in JSON
  offsetX?: number; // Horizontal offset to shift graph
  offsetY?: number; // Vertical offset to shift graph
  highlightedPath?: string[]; // Array of node IDs
  highlightedNodes?: string[]; // Array of node IDs to highlight specifically
  markerVisibility?: MarkerVisibility; // Controls which markers are visible
}

// Based on the JSON data scan, the coordinates seem to be roughly in a 1000x1000 box?
// Let's assume for now we might need to calibrate this. 
// Looking at the data, max X is around 900, max Y is around 700.
// A standard map image might be 1000x1000 or similar.
// We'll use a default scale or allow passing it in.

const DEFAULT_COORD_WIDTH = 1000; 
const DEFAULT_COORD_HEIGHT = 1000;

// Icon size in pixels
const ICON_SIZE = 16;

// Icon mapping based on node properties
function getNodeIconType(node: Node): string {
  const name = node.name.toLowerCase();
  
  if (node.elevator) {
    return 'elevator';
  } else if (name.includes('building connection')) {
    return 'arrow';
  } else if (name.includes('campus entrance')) {
    return 'information';
  } else if (name.includes('ramp')) {
    return 'ramp';
  } else if (name.includes('entrance')) {
    return 'door';
  }
  
  // Default: handicap sign for accessible locations
  return 'handicap_sign';
}

// Icon assets mapping
const iconAssets: { [key: string]: any } = {
  elevator: require('@/assets/icons/elevator.png'),
  door: require('@/assets/icons/door.png'),
  ramp: require('@/assets/icons/ramp.png'),
  arrow: require('@/assets/icons/arrow.png'),
  information: require('@/assets/icons/information.png'),
  handicap_sign: require('@/assets/icons/handicap_sign.png'),
};

export default function GraphOverlay({ 
  data, 
  width, 
  height, 
  originalWidth = DEFAULT_COORD_WIDTH,
  originalHeight = DEFAULT_COORD_HEIGHT,
  offsetX = 0,
  offsetY = 0,
  highlightedPath = [],
  highlightedNodes = [],
  markerVisibility = {
    showElevators: true,
    showRamps: true,
    showEntrances: true,
    showWheelchairAccess: true,
  }
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

  // Check if a node should be visible based on marker visibility settings
  const shouldShowNode = (node: Node): boolean => {
    const iconType = getNodeIconType(node);
    
    switch (iconType) {
      case 'elevator':
        return markerVisibility.showElevators;
      case 'ramp':
        return markerVisibility.showRamps;
      case 'door':
      case 'information':
      case 'arrow':
        return markerVisibility.showEntrances;
      case 'handicap_sign':
        return markerVisibility.showWheelchairAccess;
      default:
        return true;
    }
  };

  // Filter nodes based on visibility settings
  const visibleNodes = data.nodes.filter(shouldShowNode);

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
                x1={(source.x + offsetX) * scaleX}
                y1={(source.y + offsetY) * scaleY}
                x2={(target.x + offsetX) * scaleX}
                y2={(target.y + offsetY) * scaleY}
                stroke={isHighlighted ? "#FF4B4B" : "rgba(0,0,255, 0.15)"}
                strokeWidth={isHighlighted ? 4 : 1}
              />
            );
          })}
        </G>
      </Svg>

      {/* Draw Node Icons as Overlay */}
      {visibleNodes.map(node => {
        const isHighlighted = highlightedNodes.includes(node.id);
        const isPathNode = highlightedPath.includes(node.id);
        const x = (node.x + offsetX) * scaleX;
        const y = (node.y + offsetY) * scaleY;
        const iconType = getNodeIconType(node);
        
        return (
          <View
            key={node.id}
            style={{
              position: 'absolute',
              left: x - ICON_SIZE / 2,
              top: y - ICON_SIZE / 2,
              width: ICON_SIZE,
              height: ICON_SIZE,
              opacity: 1,
              borderRadius: ICON_SIZE / 2,
              borderWidth: isHighlighted || isPathNode ? 2 : 0,
              borderColor: isHighlighted ? 'red' : 'orange',
            }}
          >
            <Image
              source={iconAssets[iconType]}
              resizeMode="contain"
              style={{
                width: ICON_SIZE,
                height: ICON_SIZE,
              }}
            />
          </View>
        );
      })}
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


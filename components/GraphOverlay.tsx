import React, { useState } from 'react';
import { View, StyleSheet, Image, TouchableOpacity, Text, Modal, Pressable } from 'react-native';
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
  originalWidth?: number;
  originalHeight?: number;
  offsetX?: number;
  offsetY?: number;
  highlightedPath?: string[];
  highlightedNodes?: string[];
  markerVisibility?: MarkerVisibility;
  onSetStart?: (node: Node) => void;
  onSetEnd?: (node: Node) => void;
}

const DEFAULT_COORD_WIDTH = 1000; 
const DEFAULT_COORD_HEIGHT = 1000;

const ICON_SIZE = 16;
const DOT_SIZE = 8; // Smaller size for default dot

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
  
  return 'handicap_sign';
}


const iconAssets: { [key: string]: any } = {
  elevator: require('@/assets/icons/elevator.png'),
  door: require('@/assets/icons/door.png'),
  ramp: require('@/assets/icons/ramp.png'),
  arrow: require('@/assets/icons/arrow.png'),
  information: require('@/assets/icons/information.png'),
  handicap_sign: require('@/assets/icons/handicap_sign.png'),
};

interface NodePopupProps {
  node: Node;
  position: { x: number; y: number };
  onClose: () => void;
  containerWidth: number;
  onSetStart?: (node: Node) => void;
  onSetEnd?: (node: Node) => void;
}

function NodePopup({ node, position, onClose, containerWidth, onSetStart, onSetEnd }: NodePopupProps) {
  const popupWidth = 200;
  // Increase height to accommodate buttons
  const popupHeight = 220;
  
  let popupX = position.x - popupWidth / 2;
  let popupY = position.y - popupHeight - 20;
  
  if (popupX < 10) popupX = 10;
  if (popupX + popupWidth > containerWidth - 10) popupX = containerWidth - popupWidth - 10;
  if (popupY < 10) popupY = position.y + 30;
  
  const getBooleanDisplay = (value: boolean | undefined) => {
    if (value === undefined) return 'N/A';
    return value ? 'Yes' : 'No';
  };
  
  return (
    <Pressable style={styles.popupOverlay} onPress={onClose}>
      <View 
        style={[
          styles.popupContainer, 
          { 
            left: popupX, 
            top: popupY,
            width: popupWidth,
          }
        ]}
      >
        <View style={styles.popupHeader}>
          <Text style={styles.popupTitle} numberOfLines={2}>{node.name}</Text>
        </View>
        
        <View style={styles.popupContent}>
          <View style={styles.popupRow}>
            <Text style={styles.popupLabel}>No Stairs:</Text>
            <View style={[styles.badge, node.no_stairs ? styles.badgeYes : styles.badgeNo]}>
              <Text style={styles.badgeText}>{getBooleanDisplay(node.no_stairs)}</Text>
            </View>
          </View>
          
          <View style={styles.popupRow}>
            <Text style={styles.popupLabel}>Outside Campus:</Text>
            <View style={[styles.badge, node.outside_campus ? styles.badgeYes : styles.badgeNo]}>
              <Text style={styles.badgeText}>{getBooleanDisplay(node.outside_campus)}</Text>
            </View>
          </View>
          
          <View style={styles.popupRow}>
            <Text style={styles.popupLabel}>Indoor:</Text>
            <View style={[styles.badge, node.indoor ? styles.badgeYes : styles.badgeNo]}>
              <Text style={styles.badgeText}>{getBooleanDisplay(node.indoor)}</Text>
            </View>
          </View>
          
          <View style={styles.popupRow}>
            <Text style={styles.popupLabel}>Elevator:</Text>
            <View style={[styles.badge, node.elevator ? styles.badgeYes : styles.badgeNo]}>
              <Text style={styles.badgeText}>{getBooleanDisplay(node.elevator)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.startButton]} 
            onPress={() => { onSetStart?.(node); onClose(); }}
          >
            <Text style={styles.actionButtonText}>Set Start</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.endButton]} 
            onPress={() => { onSetEnd?.(node); onClose(); }}
          >
            <Text style={styles.actionButtonText}>Set Dest</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.popupArrow} />
      </View>
    </Pressable>
  );
}

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
  },
  onSetStart,
  onSetEnd
}: GraphOverlayProps) {
  
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  
  const scaleX = width / originalWidth;
  const scaleY = height / originalHeight;
  
  const nodeMap = new Map<string, Node>();
  data.nodes.forEach(node => nodeMap.set(node.id, node));

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

  const visibleNodes = data.nodes.filter(shouldShowNode);
  
  const handleNodePress = (node: Node, x: number, y: number) => {
    if (selectedNode?.id === node.id) {
      setSelectedNode(null);
    } else {
      setSelectedNode(node);
      setPopupPosition({ x, y });
    }
  };
  
  const handleClosePopup = () => {
    setSelectedNode(null);
  };

  return (
    <View style={[styles.container, { width, height }]} pointerEvents="box-none">
      <Svg height={height} width={width} pointerEvents="none">
        <G>
          {data.edges.map(edge => {
            const source = nodeMap.get(edge.sourceId);
            const target = nodeMap.get(edge.targetId);

            if (!source || !target) return null;

            let isHighlighted = false;
            if (highlightedPath.length > 1) {
              const sourceIndex = highlightedPath.indexOf(edge.sourceId);
              const targetIndex = highlightedPath.indexOf(edge.targetId);
              
              if (sourceIndex !== -1 && targetIndex !== -1) {
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

      {visibleNodes.map(node => {
        const isHighlighted = highlightedNodes.includes(node.id);
        const isPathNode = highlightedPath.includes(node.id);
        const isSelected = selectedNode?.id === node.id;
        const x = (node.x + offsetX) * scaleX;
        const y = (node.y + offsetY) * scaleY;
        const iconType = getNodeIconType(node);
        
        // Logic: Show full icon if it's an elevator, selected, or highlighted. 
        // Otherwise, show a small dot.
        const showFullIcon = node.elevator || isSelected || isHighlighted || isPathNode;
        const currentSize = showFullIcon ? ICON_SIZE : DOT_SIZE;
        const touchSize = ICON_SIZE + 12; // Always keep touch target accessible

        // Center centering logic
        // x and y are the center coordinates of the node.
        // We position the touchable absolutely at (x - width/2, y - height/2) so that its center aligns with (x,y).
        
        return (
          <TouchableOpacity
            key={node.id}
            style={{
              position: 'absolute',
              // Center the touch target around the point (x,y)
              left: x - touchSize / 2, 
              top: y - touchSize / 2,
              width: touchSize,
              height: touchSize,
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: isSelected ? 100 : 1,
            }}
            onPress={() => handleNodePress(node, x, y)}
            activeOpacity={0.7}
          >
            {showFullIcon ? (
              <View
                style={{
                  width: ICON_SIZE,
                  height: ICON_SIZE,
                  // No offset needed here if the container (TouchableOpacity) is already centered
                  justifyContent: 'center',
                  alignItems: 'center',
                  opacity: 1,
                  borderRadius: ICON_SIZE / 2,
                  borderWidth: isHighlighted || isPathNode || isSelected ? 2 : 0,
                  borderColor: isSelected ? '#4A90E2' : isHighlighted ? 'red' : 'orange',
                  backgroundColor: isSelected ? 'rgba(74, 144, 226, 0.2)' : 'transparent',
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
            ) : (
              <View
                style={{
                  width: DOT_SIZE,
                  height: DOT_SIZE,
                  // No offset needed here either
                  borderRadius: DOT_SIZE / 2,
                  backgroundColor: '#3A3A3C', // Dark gray for unobtrusive nodes
                  borderWidth: 1,
                  borderColor: '#fff',
                  opacity: 0.8,
                }}
              />
            )}
          </TouchableOpacity>
        );
      })}
      
      {selectedNode && (
        <NodePopup 
          node={selectedNode} 
          position={popupPosition} 
          onClose={handleClosePopup}
          containerWidth={width}
          onSetStart={onSetStart}
          onSetEnd={onSetEnd}
        />
      )}
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
  popupOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  popupContainer: {
    position: 'absolute',
    backgroundColor: '#1D2535',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#3A4451',
    zIndex: 1001,
  },
  popupHeader: {
    borderBottomWidth: 1,
    borderBottomColor: '#3A4451',
    paddingBottom: 8,
    marginBottom: 8,
  },
  popupTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ECEDEE',
  },
  popupContent: {
    gap: 6,
  },
  popupRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  popupLabel: {
    fontSize: 12,
    color: '#9BA1A6',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 40,
    alignItems: 'center',
  },
  badgeYes: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  badgeNo: {
    backgroundColor: 'rgba(158, 158, 158, 0.2)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#ECEDEE',
  },
  popupArrow: {
    position: 'absolute',
    bottom: -8,
    left: '50%',
    marginLeft: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#1D2535',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButton: {
    backgroundColor: '#27ae60',
  },
  endButton: {
    backgroundColor: '#4A90E2',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

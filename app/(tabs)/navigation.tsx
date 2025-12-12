import { StyleSheet, TextInput, View, Image, Dimensions, TouchableOpacity, FlatList, Text, Keyboard } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useState, useMemo, useEffect } from 'react';
import GraphOverlay from '@/components/GraphOverlay';
import graphDataRaw from '@/assets/graphs/upper_campus_graph_data.json';
import { GraphData, Node } from '@/types/graph';
import { findShortestPath } from '@/utils/routing';

const graphData = graphDataRaw as GraphData;

export default function NavigationScreen() {
  // Mode: 'explore' (single search) or 'navigate' (start/end)
  const [mode, setMode] = useState<'explore' | 'navigate'>('explore');
  
  // Search inputs
  const [searchQuery, setSearchQuery] = useState('');
  const [startQuery, setStartQuery] = useState('');
  const [endQuery, setEndQuery] = useState('');
  
  // Selected Nodes
  const [selectedNode, setSelectedNode] = useState<Node | null>(null); // For explore mode
  const [startNode, setStartNode] = useState<Node | null>(null);
  const [endNode, setEndNode] = useState<Node | null>(null);
  
  // Active Input for suggestions
  const [activeInput, setActiveInput] = useState<'search' | 'start' | 'end' | null>(null);

  // Routing Result
  const [routePath, setRoutePath] = useState<string[]>([]);
  
  // Layout
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });

  const mapSource = require('@/assets/images/columbia-ods-map-2.png');

  // Safely resolve image dimensions
  const { originalWidth, originalHeight } = useMemo(() => {
    let width = 1000;
    let height = 1000;

    try {
      // Try standard resolveAssetSource
      const source = Image.resolveAssetSource?.(mapSource);
      if (source) {
        width = source.width;
        height = source.height;
      } else if (typeof mapSource === 'object' && mapSource !== null) {
        // Fallback for web/bundlers where require returns object with dimensions
        if (mapSource.width) width = mapSource.width;
        if (mapSource.height) height = mapSource.height;
      }
    } catch (e) {
      console.log('Error resolving image source:', e);
    }
    
    return { originalWidth: width, originalHeight: height };
  }, []);

  // Calculate Route
  useEffect(() => {
    if (startNode && endNode) {
      const path = findShortestPath(graphData, startNode.id, endNode.id);
      setRoutePath(path || []);
    } else {
      setRoutePath([]);
    }
  }, [startNode, endNode]);

  // Suggestions Logic
  const getSuggestions = (query: string) => {
    if (!query || query.length < 2) return [];
    return graphData.nodes
      .filter(node => node.name && node.name.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5);
  };

  const suggestions = useMemo(() => {
    if (activeInput === 'search') return getSuggestions(searchQuery);
    if (activeInput === 'start') return getSuggestions(startQuery);
    if (activeInput === 'end') return getSuggestions(endQuery);
    return [];
  }, [activeInput, searchQuery, startQuery, endQuery]);

  const handleSelectSuggestion = (node: Node) => {
    if (activeInput === 'search') {
      setSearchQuery(node.name);
      setSelectedNode(node);
      setActiveInput(null);
      Keyboard.dismiss();
    } else if (activeInput === 'start') {
      setStartQuery(node.name);
      setStartNode(node);
      setActiveInput(null);
    } else if (activeInput === 'end') {
      setEndQuery(node.name);
      setEndNode(node);
      setActiveInput(null);
    }
  };

  const startNavigation = () => {
    setMode('navigate');
    if (selectedNode) {
      setEndNode(selectedNode);
      setEndQuery(selectedNode.name);
      setStartQuery(''); // Reset start
      setActiveInput('start'); // Focus start
    }
  };

  const exitNavigation = () => {
    setMode('explore');
    setStartNode(null);
    setEndNode(null);
    setRoutePath([]);
    setStartQuery('');
    setEndQuery('');
    setActiveInput(null);
  };

  // Image Scaling Logic
  const renderedMapDimensions = useMemo(() => {
    if (!containerDimensions.width || !containerDimensions.height) {
      return { width: 0, height: 0 };
    }
    const containerAspect = containerDimensions.width / containerDimensions.height;
    const imageAspect = originalWidth / originalHeight;
    let renderWidth, renderHeight;
    if (containerAspect > imageAspect) {
      renderHeight = containerDimensions.height;
      renderWidth = renderHeight * imageAspect;
    } else {
      renderWidth = containerDimensions.width;
      renderHeight = renderWidth / imageAspect;
    }
    return { width: renderWidth, height: renderHeight };
  }, [containerDimensions, originalWidth, originalHeight]);

  return (
    <ThemedView style={styles.container}>
      
      {/* Search Header */}
      <View style={styles.headerContainer}>
        {mode === 'explore' ? (
          <View style={styles.searchContainer}>
            <IconSymbol name="magnifyingglass" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Find a place..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setActiveInput('search')}
            />
            {selectedNode && (
              <TouchableOpacity onPress={startNavigation} style={styles.directionsButton}>
                <IconSymbol name="arrow.triangle.turn.up.right.circle.fill" size={24} color="#4A90E2" />
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.navHeader}>
            <TouchableOpacity onPress={exitNavigation} style={styles.backButton}>
              <IconSymbol name="chevron.left" size={24} color="#333" />
            </TouchableOpacity>
            <View style={styles.navInputs}>
              <View style={styles.inputRow}>
                <View style={[styles.dot, { backgroundColor: 'green' }]} />
                <TextInput
                  style={styles.navInput}
                  placeholder="Start Location"
                  value={startQuery}
                  onChangeText={setStartQuery}
                  onFocus={() => setActiveInput('start')}
                />
              </View>
              <View style={styles.inputDivider} />
              <View style={styles.inputRow}>
                <View style={[styles.dot, { backgroundColor: 'red' }]} />
                <TextInput
                  style={styles.navInput}
                  placeholder="Destination"
                  value={endQuery}
                  onChangeText={setEndQuery}
                  onFocus={() => setActiveInput('end')}
                />
              </View>
            </View>
          </View>
        )}

        {/* Suggestions Dropdown */}
        {suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            {suggestions.map(node => (
              <TouchableOpacity 
                key={node.id} 
                style={styles.suggestionItem}
                onPress={() => handleSelectSuggestion(node)}
              >
                <IconSymbol name="mappin.circle.fill" size={16} color="#666" style={{marginRight: 8}} />
                <ThemedText>{node.name}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View 
        style={styles.mapWrapper}
        onLayout={(event) => setContainerDimensions(event.nativeEvent.layout)}
      >
        <Image
          source={mapSource}
          style={styles.mapImage}
          resizeMode="contain"
        />
        
        {renderedMapDimensions.width > 0 && (
          <View style={[styles.overlayWrapper, { width: renderedMapDimensions.width, height: renderedMapDimensions.height }]}>
            <GraphOverlay 
              data={graphData}
              width={renderedMapDimensions.width}
              height={renderedMapDimensions.height}
              originalWidth={originalWidth}
              originalHeight={originalHeight}
              highlightedPath={routePath}
              highlightedNodes={[
                ...(selectedNode && mode === 'explore' ? [selectedNode.id] : []),
                ...(startNode ? [startNode.id] : []),
                ...(endNode ? [endNode.id] : [])
              ]}
              offsetX={80}
              offsetY={40}
            />
          </View>
        )}
      </View>

      {/* Info Card / Legend */}
      {routePath.length > 0 ? (
        <View style={styles.infoCard}>
          <ThemedText style={styles.infoTitle}>Route Calculated</ThemedText>
          <ThemedText>Distance: {routePath.length} nodes (approx)</ThemedText>
        </View>
      ) : (
        <View style={styles.legendCard}>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.iconWrapper, { backgroundColor: '#4A90E2' }]}>
              <IconSymbol name="figure.roll" size={18} color="#fff" />
            </View>
            <ThemedText style={styles.legendText}>Wheelchair Access</ThemedText>
          </View>
          
          <View style={styles.legendItem}>
            <View style={[styles.iconWrapper, { backgroundColor: '#FD9644' }]}>
              <IconSymbol name="arrow.up.arrow.down" size={18} color="#fff" />
            </View>
            <ThemedText style={styles.legendText}>Elevator Access</ThemedText>
          </View>
        </View>
      </View>
      )}

      <View style={styles.nextStepContainer}>
        <IconSymbol name="figure.walk" size={24} color="#2C3E50" style={styles.nextStepIcon} />
        <ThemedText style={styles.nextStepText}>
          Next Step: Continue on the accessible path
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    backgroundColor: '#fff',
    zIndex: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    paddingBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    margin: 16,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    height: 24, // Fix height for proper alignment
  },
  directionsButton: {
    marginLeft: 8,
  },
  
  // Navigation Mode Header
  navHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    paddingBottom: 8,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
    marginTop: 4,
  },
  navInputs: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  inputDivider: {
    height: 1,
    backgroundColor: '#ddd',
    marginLeft: 24,
    marginVertical: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
    marginLeft: 4,
  },
  navInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    padding: 4,
  },

  // Suggestions
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 30,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#eee',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  
  // Map
  mapWrapper: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  overlayWrapper: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
    pointerEvents: 'none',
  },
  
  // Bottom Cards
  legendCard: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    zIndex: 10,
  },
  infoCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    zIndex: 10,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  legendText: {
    fontSize: 13,
    color: '#2C3E50',
    fontWeight: '500',
  },
  nextStepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  nextStepIcon: {
    marginRight: 12,
  },
  nextStepText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#2C3E50',
  },
});

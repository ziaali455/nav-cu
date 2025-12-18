import graphDataRaw from '@/assets/graphs/upper_campus_graph_data.json';
import GraphOverlay, { MAP_ICON_ASSETS, MAP_ICON_LEGEND } from '@/components/GraphOverlay';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useSettings } from '@/context/SettingsContext';
import { GraphData, Node } from '@/types/graph';
import { findShortestPath } from '@/utils/routing';
import { useEffect, useMemo, useState } from 'react';
import { Image, Keyboard, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

const graphData = graphDataRaw as GraphData;
const mapSource = require('@/assets/images/columbia-ods-map-2.png');

export default function NavigationScreen() {
  // Get marker visibility from settings
  const {
    markerVisibility,
    avoidStairs,
    minimizeOutdoorPaths,
    caneCrutches,
    wheelchairUser,
    setWheelchairUser,
    preferElevators,
    setPreferElevators,
  } = useSettings();
  
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
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  
  // Show Only Route mode
  const [showOnlyRoute, setShowOnlyRoute] = useState(false);
  
  // Layout
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  
  // Zoom controls
  const [zoomLevel, setZoomLevel] = useState(1);
  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 6;
  const ZOOM_STEP = 0.25;
  
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  };
  
  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - ZOOM_STEP, MIN_ZOOM));
  };
  
  const handleResetZoom = () => {
    setZoomLevel(1);
  };

  // Graph Coordinate System Configuration
  // Adjust these to align the graph nodes with the map image
  const GRAPH_WIDTH = 820; // tuned for current map alignment
  const GRAPH_HEIGHT = 1250;
  const GRAPH_X_OFFSET = -310;
  const GRAPH_Y_OFFSET = -85;
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

  const routePreferences = useMemo(() => {
    const disallowStairs = wheelchairUser || avoidStairs;
    // Outdoor penalty only used when minimizeOutdoorPaths is true (applied on indoor<->outdoor crossings)
    const outdoorPenalty = minimizeOutdoorPaths ? 50 : 0;
    // Make campus boundary penalty very large to strongly avoid leaving campus
    const campusBoundaryPenalty = 5000;

    return {
      disallowStairs,
      outdoorPenalty,
      campusBoundaryPenalty,
      // stairs penalty and elevator bias are intentionally not used
    };
  }, [avoidStairs, minimizeOutdoorPaths, wheelchairUser]);

  const displayGraphData = useMemo(() => {
    if (!routePreferences.disallowStairs) return graphData;

    // Remove non-accessible edges (stairs). This may isolate some nodes; hide those nodes too.
    const isStairsNodeName = (name?: string) => (name ?? '').toLowerCase().includes('stair');

    const allowedNodeIds = new Set(
      graphData.nodes
        .map(node => node.id)
    );

    const edges = graphData.edges
      .filter(edge => edge.no_stairs !== false)
      .filter(edge => allowedNodeIds.has(edge.sourceId) && allowedNodeIds.has(edge.targetId));

    const connectedNodeIds = new Set<string>();
    edges.forEach(edge => {
      connectedNodeIds.add(edge.sourceId);
      connectedNodeIds.add(edge.targetId);
    });

    // Keep currently-selected nodes visible even if isolated (so search doesn't feel broken)
    if (selectedNode?.id && allowedNodeIds.has(selectedNode.id)) connectedNodeIds.add(selectedNode.id);
    if (startNode?.id && allowedNodeIds.has(startNode.id)) connectedNodeIds.add(startNode.id);
    if (endNode?.id && allowedNodeIds.has(endNode.id)) connectedNodeIds.add(endNode.id);

    const nodes = graphData.nodes.filter(node => connectedNodeIds.has(node.id));

    return { nodes, edges };
  }, [endNode?.id, routePreferences.disallowStairs, selectedNode?.id, startNode?.id]);

  const nodeById = useMemo(() => {
    const map = new Map<string, Node>();
    displayGraphData.nodes.forEach(n => map.set(n.id, n));
    return map;
  }, [displayGraphData.nodes]);

  // Calculate Route
  // Indoor-first routing when minimizeOutdoorPaths is true:
  // 1) Try indoor-only graph; if a path exists, take it.
  // 2) Otherwise, fall back to normal graph with outdoor penalty.
  useEffect(() => {
    if (!(startNode && endNode)) {
      setRoutePath([]);
      setCurrentStepIndex(0);
      return;
    }

    const isIndoorSafe = (node: Node) =>
      node.indoor === true && node.outside_campus !== true;

    let chosenPath: string[] | null = null;

    if (minimizeOutdoorPaths && isIndoorSafe(startNode) && isIndoorSafe(endNode)) {
      const indoorNodes = displayGraphData.nodes.filter(isIndoorSafe);
      const indoorIds = new Set(indoorNodes.map(n => n.id));
      // Only attempt indoor routing if both endpoints exist in the indoor subgraph
      if (indoorIds.has(startNode.id) && indoorIds.has(endNode.id)) {
        const indoorEdges = displayGraphData.edges.filter(
          e => indoorIds.has(e.sourceId) && indoorIds.has(e.targetId)
        );
        const indoorGraph: GraphData = { nodes: indoorNodes, edges: indoorEdges };

        const indoorPath = findShortestPath(indoorGraph, startNode.id, endNode.id, {
          ...routePreferences,
          outdoorPenalty: 0,
        });

        if (indoorPath && indoorPath.length > 0) {
          chosenPath = indoorPath;
        }
      }
    }

    if (!chosenPath) {
      chosenPath = findShortestPath(displayGraphData, startNode.id, endNode.id, routePreferences);
    }

    setRoutePath(chosenPath || []);
    setCurrentStepIndex(0);
  }, [displayGraphData, endNode, minimizeOutdoorPaths, routePreferences, startNode]);

  // Keep currentStepIndex in bounds when routePath changes
  useEffect(() => {
    if (currentStepIndex >= routePath.length) {
      setCurrentStepIndex(routePath.length > 0 ? routePath.length - 1 : 0);
    }
  }, [currentStepIndex, routePath.length]);

  // Suggestions Logic
  const suggestions = useMemo(() => {
    const query =
      activeInput === 'search'
        ? searchQuery
        : activeInput === 'start'
          ? startQuery
          : activeInput === 'end'
            ? endQuery
            : '';

    if (!query || query.length < 2) return [];

    return displayGraphData.nodes
      .filter(node => node.name && node.name.toLowerCase().includes(query.toLowerCase()));
  }, [activeInput, displayGraphData, endQuery, searchQuery, startQuery]);

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
  
  // Handlers for Node Popup Actions
  const handleSetStart = (node: Node) => {
    setMode('navigate');
    setStartNode(node);
    setStartQuery(node.name);
    // If we don't have an end node, focus it
    if (!endNode) {
       setActiveInput('end');
    }
  };

  const handleSetEnd = (node: Node) => {
    setMode('navigate');
    setEndNode(node);
    setEndQuery(node.name);
    // If we don't have a start node, focus it
    if (!startNode) {
       setActiveInput('start');
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
    setShowOnlyRoute(false);
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

  const scaledMapDimensions = useMemo(() => {
    if (!renderedMapDimensions.width || !renderedMapDimensions.height) {
      return { width: 0, height: 0 };
    }
    return {
      width: renderedMapDimensions.width * zoomLevel,
      height: renderedMapDimensions.height * zoomLevel,
    };
  }, [renderedMapDimensions, zoomLevel]);

  const mapLegendVisibility = useMemo(() => {
    return {
      elevator: markerVisibility.showElevators,
      ramp: markerVisibility.showRamps,
      door: markerVisibility.showEntrances,
      arrow: markerVisibility.showEntrances,
      handicap_sign: markerVisibility.showWheelchairAccess,
      ladder: !routePreferences.disallowStairs,
      triangle: markerVisibility.showEntrances,
    } as const;
  }, [markerVisibility, routePreferences.disallowStairs]);

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
            <ScrollView style={styles.suggestionsScroll} nestedScrollEnabled>
              {suggestions.map(node => (
                <TouchableOpacity 
                  key={node.id} 
                  style={styles.suggestionItem}
                  onPress={() => handleSelectSuggestion(node)}
                >
                  <IconSymbol name="mappin.circle.fill" size={16} color="#9BA1A6" style={{marginRight: 8}} />
                  <ThemedText style={styles.suggestionText}>{node.name}</ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      <View 
        style={styles.mapContainer}
        onLayout={(event) => setContainerDimensions(event.nativeEvent.layout)}
      >
        <ScrollView
          style={styles.zoomScrollView}
          contentContainerStyle={styles.zoomContentContainer}
          horizontal={false}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          scrollEnabled={zoomLevel > 1}
          maximumZoomScale={1}
          minimumZoomScale={1}
          nestedScrollEnabled
        >
          <ScrollView
            horizontal={true}
            showsHorizontalScrollIndicator={false}
            scrollEnabled={zoomLevel > 1}
            contentContainerStyle={styles.horizontalScrollContent}
            nestedScrollEnabled
          >
            <View style={styles.mapWrapper}>
              <View style={{ width: scaledMapDimensions.width, height: scaledMapDimensions.height }}>
                <Image
                  source={mapSource}
                  style={styles.mapImage}
                  resizeMode="contain"
                />
              </View>
              
              {scaledMapDimensions.width > 0 && (
                <View style={[styles.overlayWrapper, { width: scaledMapDimensions.width, height: scaledMapDimensions.height }]}>
                  <GraphOverlay 
                    data={displayGraphData}
                    width={scaledMapDimensions.width}
                    height={scaledMapDimensions.height}
                    originalWidth={GRAPH_WIDTH}
                    originalHeight={GRAPH_HEIGHT}
                    offsetX={GRAPH_X_OFFSET}
                    offsetY={GRAPH_Y_OFFSET}
                    highlightedPath={routePath}
                    highlightedNodes={[
                      ...(selectedNode && mode === 'explore' ? [selectedNode.id] : []),
                      ...(startNode ? [startNode.id] : []),
                      ...(endNode ? [endNode.id] : []),
                      ...(hoveredNodeId ? [hoveredNodeId] : []),
                      ...(routePath[currentStepIndex] ? [routePath[currentStepIndex]] : []),
                    ]}
                    currentStepNodeId={routePath[currentStepIndex] ?? null}
                    markerVisibility={markerVisibility}
                    iconScale={zoomLevel}
                    showOnlyRoute={showOnlyRoute}
                    onSetStart={handleSetStart}
                    onSetEnd={handleSetEnd}
                  />
                </View>
              )}
            </View>
          </ScrollView>
        </ScrollView>
        
        {/* Show Only Route Button */}
        {startNode && endNode && routePath.length > 0 && (
          <TouchableOpacity 
            style={[styles.showRouteButton, showOnlyRoute && styles.showRouteButtonActive]}
            onPress={() => setShowOnlyRoute(!showOnlyRoute)}
          >
            <IconSymbol 
              name={showOnlyRoute ? "eye.slash.fill" : "eye.fill"} 
              size={18} 
              color={showOnlyRoute ? "#fff" : "#4A90E2"} 
            />
            <ThemedText style={[styles.showRouteButtonText, showOnlyRoute && styles.showRouteButtonTextActive]}>
              {showOnlyRoute ? "Show All" : "Show Only Route"}
            </ThemedText>
          </TouchableOpacity>
        )}
        
        {/* Zoom Controls */}
        <View style={styles.zoomControls}>
          <TouchableOpacity 
            style={[styles.zoomButton, zoomLevel >= MAX_ZOOM && styles.zoomButtonDisabled]} 
            onPress={handleZoomIn}
            disabled={zoomLevel >= MAX_ZOOM}
          >
            <ThemedText style={[styles.zoomIcon, zoomLevel >= MAX_ZOOM && styles.zoomIconDisabled]}>+</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.zoomLevelButton} 
            onPress={handleResetZoom}
          >
            <ThemedText style={styles.zoomLevelText}>{Math.round(zoomLevel * 100)}%</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.zoomButton, zoomLevel <= MIN_ZOOM && styles.zoomButtonDisabled]} 
            onPress={handleZoomOut}
            disabled={zoomLevel <= MIN_ZOOM}
          >
            <ThemedText style={[styles.zoomIcon, zoomLevel <= MIN_ZOOM && styles.zoomIconDisabled]}>−</ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      {/* Info Card / Legend */}
      <View style={styles.bottomPanel}>
        {/* Accessibility settings (synced with Settings tab) */}
        <View style={styles.legendCard}>
          <View style={styles.legendRow}>
            <TouchableOpacity
              style={styles.legendItem}
              activeOpacity={0.75}
              onPress={() => setWheelchairUser(!wheelchairUser)}
            >
              <View
                style={[
                  styles.iconWrapper,
                  { backgroundColor: wheelchairUser ? '#4A90E2' : '#3A4451' },
                ]}
              >
                <IconSymbol name="figure.roll" size={18} color={wheelchairUser ? '#fff' : '#9BA1A6'} />
              </View>
              <ThemedText style={[styles.legendText, !wheelchairUser && styles.legendTextDisabled]}>
                Wheelchair Access
              </ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.legendItem}
              activeOpacity={0.75}
              onPress={() => setPreferElevators(!preferElevators)}
            >
              <View
                style={[
                  styles.iconWrapper,
                  { backgroundColor: preferElevators ? '#FD9644' : '#3A4451' },
                ]}
              >
                <IconSymbol name="arrow.up.arrow.down" size={18} color={preferElevators ? '#fff' : '#9BA1A6'} />
              </View>
              <ThemedText style={[styles.legendText, !preferElevators && styles.legendTextDisabled]}>
                Elevator Access
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {/* Map icon legend (mirrors icons rendered on the map) */}
        <View style={styles.mapIconLegendCard}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.mapIconLegendContent}
          >
            {MAP_ICON_LEGEND.map(({ type, label }) => {
              const isEnabled = mapLegendVisibility[type];
              return (
                <View
                  key={type}
                  style={[styles.mapIconLegendItem, !isEnabled && styles.mapIconLegendItemDisabled]}
                >
                  <Image source={MAP_ICON_ASSETS[type]} style={styles.mapLegendIcon} resizeMode="contain" />
                  <ThemedText style={[styles.mapIconLegendLabel, !isEnabled && styles.mapIconLegendLabelDisabled]}>
                    {label}
                  </ThemedText>
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* Next Step Bar */}
      <View style={styles.nextStepContainer}>
        {routePath.length > 1 && currentStepIndex > 0 ? (
          <TouchableOpacity style={styles.nextPrevButton} onPress={() => setCurrentStepIndex(i => Math.max(i - 1, 0))}>
            <IconSymbol name="chevron.left" size={18} color="#ECEDEE" />
          </TouchableOpacity>
        ) : (
          <View style={styles.nextPrevButtonPlaceholder} />
        )}

        <View style={styles.nextStepTextWrapper}>
          <ThemedText style={styles.nextStepText}>
            {routePath.length > 0
              ? `Next Step: Continue to ${nodeById.get(routePath[currentStepIndex])?.name ?? 'destination'}`
              : 'Select a start and destination'}
          </ThemedText>
        </View>

        {routePath.length > 1 && currentStepIndex < routePath.length - 1 ? (
          <TouchableOpacity style={styles.nextPrevButton} onPress={() => setCurrentStepIndex(i => Math.min(i + 1, routePath.length - 1))}>
            <IconSymbol name="chevron.right" size={18} color="#ECEDEE" />
          </TouchableOpacity>
        ) : (
          <View style={styles.nextPrevButtonPlaceholder} />
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    backgroundColor: '#1D2535',
    zIndex: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2A3441',
    paddingBottom: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A3441',
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
    color: '#ECEDEE',
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
    backgroundColor: '#2A3441',
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
    backgroundColor: '#3A4451',
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
    color: '#ECEDEE',
    padding: 4,
  },
  showRouteButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(42, 52, 65, 0.95)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#4A90E2',
    gap: 6,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  showRouteButtonActive: {
    backgroundColor: 'rgba(74, 144, 226, 0.95)',
    borderColor: '#4A90E2',
  },
  showRouteButtonText: {
    fontSize: 13,
    color: '#4A90E2',
    fontWeight: '600',
  },
  showRouteButtonTextActive: {
    color: '#fff',
  },

  // Suggestions
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 16,
    right: 16,
    backgroundColor: '#2A3441',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 30,
    maxHeight: 180, // ~3 items visible with scrolling
    borderWidth: 1,
    borderColor: '#3A4451',
    overflow: 'hidden',
  },
  suggestionsScroll: {
    maxHeight: 180,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#3A4451',
  },
  suggestionText: {
    color: '#ECEDEE',
  },
  
  // Map Container with Zoom
  mapContainer: {
    flex: 1,
    backgroundColor: '#1D2535',
    position: 'relative',
  },
  zoomScrollView: {
    flex: 1,
  },
  zoomContentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  horizontalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapWrapper: {
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
    top: 0,
    left: 0,
    zIndex: 5,
    pointerEvents: 'box-none',
  },
  
  // Zoom Controls
  zoomControls: {
    position: 'absolute',
    right: 15,
    top: '50%',
    transform: [{ translateY: -75 }],
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderRadius: 25,
    padding: 8,
    gap: 5,
    zIndex: 999,
  },
  zoomButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomButtonDisabled: {
    backgroundColor: '#3A3A3C',
  },
  zoomIcon: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 32,
  },
  zoomIconDisabled: {
    color: '#8E8E93',
  },
  zoomLevelButton: {
    width: 44,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomLevelText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Bottom Panel
  bottomPanel: {
    backgroundColor: '#1D2535',
    borderTopWidth: 1,
    borderTopColor: '#2A3441',
    zIndex: 10,
  },
  legendCard: {
    backgroundColor: '#1D2535',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  infoCard: {
    backgroundColor: '#1D2535',
    padding: 16,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  infoText: {
    color: '#ECEDEE',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    gap: 12,
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
    color: '#ECEDEE',
    fontWeight: '500',
  },
  legendTextDisabled: {
    color: '#9BA1A6',
  },

  mapIconLegendCard: {
    backgroundColor: '#1D2535',
    paddingTop: 2,
    paddingBottom: 12,
    paddingHorizontal: 12,
  },
  mapIconLegendContent: {
    gap: 14,
    paddingHorizontal: 4,
  },
  mapIconLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#2A3441',
  },
  mapIconLegendItemDisabled: {
    opacity: 0.35,
  },
  mapLegendIcon: {
    width: 18,
    height: 18,
  },
  mapIconLegendLabel: {
    fontSize: 12,
    color: '#ECEDEE',
    fontWeight: '500',
  },
  mapIconLegendLabelDisabled: {
    color: '#9BA1A6',
  },
  nextStepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1D2535',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: '#2A3441',
  },
  nextStepText: {
    textAlign: 'center',
    color: '#ECEDEE',
    fontSize: 15,
    fontWeight: '600',
    paddingHorizontal: 8,
    flexWrap: 'wrap',
  },
  nextStepTextWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  nextPrevButton: {
    width: 44,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#2A3441',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextPrevButtonPlaceholder: {
    width: 44,
    height: 36,
  },
});

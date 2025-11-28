import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  GestureResponderEvent,
  Image,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

interface Report {
  id: string;
  x: number;
  y: number;
  brokenUtility: boolean;
  construction: boolean;
  comments: string;
}

interface DraggableMarkerProps {
  report: Report;
  onDragEnd: (id: string, newX: number, newY: number) => void;
  onPress: (report: Report) => void;
}

const DraggableMarker = ({ report, onDragEnd, onPress }: DraggableMarkerProps) => {
  const position = useRef(new Animated.ValueXY({ x: report.x - 20, y: report.y - 40 })).current;

  useEffect(() => {
    position.setValue({ x: report.x - 20, y: report.y - 40 });
  }, [report.x, report.y, position]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        position.setOffset({
          x: (position.x as any)._value,
          y: (position.y as any)._value,
        });
        position.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: position.x, dy: position.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, gestureState) => {
        position.flattenOffset();
        const newX = report.x + gestureState.dx;
        const newY = report.y + gestureState.dy;
        onDragEnd(report.id, newX, newY);
      },
    })
  ).current;

  return (
    <Animated.View
      style={[
        styles.marker,
        {
          left: position.x,
          top: position.y,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        activeOpacity={0.6}
        onPress={() => {
          console.log('PIN TAPPED! Report:', report.id);
          onPress(report);
        }}
      >
        <View style={styles.markerPin}>
          <IconSymbol
            size={40}
            name="mappin.circle.fill"
            color="#FF3B30"
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function ReportsScreen() {
  const [reports, setReports] = useState<Report[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedReport, setSelectedReport] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [brokenUtility, setBrokenUtility] = useState(false);
  const [construction, setConstruction] = useState(false);
  const [comments, setComments] = useState('');
  const [containerLayout, setContainerLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [imageLayout, setImageLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const colorScheme = useColorScheme();

  const handleMapPress = (event: GestureResponderEvent) => {
    console.log('Map pressed!');
    if (!containerLayout || !imageLayout) {
        console.log('Missing layout - blocking click');
        return;
    }

    // Use absolute screen coordinates (pageX, pageY) and subtract container offset
    const { pageX, pageY } = event.nativeEvent;
    const x = pageX - containerLayout.x;
    const y = pageY - containerLayout.y;
    
    // Check if click is within the rendered image bounds
    // imageLayout gives us the actual position and size of the rendered image
    if (x < imageLayout.x || x > imageLayout.x + imageLayout.width || 
        y < imageLayout.y || y > imageLayout.y + imageLayout.height) {
      console.log('Click outside image bounds (whitespace)');
      return;
    }
    
    console.log('Valid click at:', x, y);
    setSelectedReport({ x, y });
    setModalVisible(true);
  };

  const handleSubmitReport = () => {
    if (editingReport) {
      // Update existing report
      const updatedReports = reports.map(report => 
        report.id === editingReport.id
          ? { ...report, brokenUtility, construction, comments }
          : report
      );
      setReports(updatedReports);
      Alert.alert('Success', 'Report updated successfully!');
      resetForm();
    } else if (selectedReport) {
      // Create new report
      const newReport: Report = {
        id: Date.now().toString(),
        x: selectedReport.x,
        y: selectedReport.y,
        brokenUtility,
        construction,
        comments,
      };
      console.log('Submitting report at:', selectedReport.x, selectedReport.y);
      setReports([...reports, newReport]);
      Alert.alert('Success', 'Report submitted successfully!');
      resetForm();
    }
  };

  const handleMarkerPress = (report: Report) => {
    console.log('Marker pressed! Report ID:', report.id);
    setEditingReport(report);
    setBrokenUtility(report.brokenUtility);
    setConstruction(report.construction);
    setComments(report.comments);
    setModalVisible(true);
  };

  const handleDeleteReport = () => {
    if (!editingReport) return;

    const deleteAction = () => {
      setReports(reports.filter(r => r.id !== editingReport.id));
      setModalVisible(false);
      resetForm();
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to delete this report?')) {
        deleteAction();
      }
    } else {
      Alert.alert(
        'Confirm Delete',
        'Are you sure you want to delete this report?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: deleteAction,
          },
        ]
      );
    }
  };

  const handleCancelReport = () => {
    resetForm();
  };

  const handleDragEnd = (id: string, newX: number, newY: number) => {
    if (!imageLayout) {
      // If we don't have layout info, keep the original position
      return;
    }

    // Check if new position is within image bounds
    if (newX < imageLayout.x || newX > imageLayout.x + imageLayout.width || 
        newY < imageLayout.y || newY > imageLayout.y + imageLayout.height) {
      console.log('Cannot drag pin outside image bounds');
      // Don't update the position - keep it at the old position
      return;
    }

    // Position is valid, update it
    setReports(prevReports => 
      prevReports.map(report =>
        report.id === id ? { ...report, x: newX, y: newY } : report
      )
    );
  };

  const resetForm = () => {
    setModalVisible(false);
    setSelectedReport(null);
    setEditingReport(null);
    setBrokenUtility(false);
    setConstruction(false);
    setComments('');
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">Report a Location</ThemedText>
        {/* <ThemedText style={styles.subtitle}>To Teachers College</ThemedText> */}
      </ThemedView>

      <View 
        style={styles.mapContainer}
        onLayout={(event) => {
          const { x, y, width, height } = event.nativeEvent.layout;
          setContainerLayout({ x, y, width, height });
          console.log('Container positioned at:', x, y, 'Dimensions:', width, height);
        }}
      >
        <Pressable onPress={handleMapPress} style={styles.mapPressableArea}>
          <Image
            source={require('@/assets/columbia_ods_map.png')}
            style={styles.mapImage}
            resizeMode="contain"
            onLayout={(event) => {
              const { x, y, width, height } = event.nativeEvent.layout;
              setImageLayout({ x, y, width, height });
              console.log('Image layout:', x, y, width, height);
            }}
          />
        </Pressable>
        
        {/* Render report markers - absolutely positioned on top */}
        {reports.map((report) => (
          <DraggableMarker
            key={report.id}
            report={report}
            onDragEnd={handleDragEnd}
            onPress={handleMarkerPress}
          />
        ))}
        
        {/* Debug Info */}
        <View style={styles.debugInfo} pointerEvents="none">
          <ThemedText style={{ color: 'white', fontSize: 12 }}>
            Last Tap: {selectedReport ? `${Math.round(selectedReport.x)}, ${Math.round(selectedReport.y)}` : 'None'}
          </ThemedText>
          <ThemedText style={{ color: 'white', fontSize: 12 }}>
            Reports: {reports.length}
          </ThemedText>
          <ThemedText style={{ color: 'white', fontSize: 12 }}>
            Image: {imageLayout ? `${Math.round(imageLayout.width)}x${Math.round(imageLayout.height)} at (${Math.round(imageLayout.x)},${Math.round(imageLayout.y)})` : 'Not loaded'}
          </ThemedText>
        </View>
      </View>

      <ThemedView style={styles.footer}>
        <ThemedText style={styles.instruction}>
          Tap a location to add a report
        </ThemedText>
        <IconSymbol
          size={20}
          name="info.circle"
          color={colorScheme === 'dark' ? '#FFFFFF' : '#000000'}
        />
      </ThemedView>

      {/* Report Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={handleCancelReport}
      >
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContent,
            { backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#FFFFFF' }
          ]}>
            <View style={[
              styles.modalHeader,
              { borderBottomColor: colorScheme === 'dark' ? '#38383A' : '#E5E5EA' }
            ]}>
              <ThemedText type="subtitle">
                {editingReport ? 'Edit Report' : 'New Report'}
              </ThemedText>
              <View style={{ flexDirection: 'row', gap: 15, alignItems: 'center' }}>
                {editingReport && (
                  <TouchableOpacity onPress={handleDeleteReport}>
                    <IconSymbol 
                      size={24} 
                      name="trash.fill" 
                      color="#FF3B30" 
                    />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={handleCancelReport}>
                  <IconSymbol 
                    size={24} 
                    name="xmark.circle.fill" 
                    color={colorScheme === 'dark' ? '#8E8E93' : '#8E8E93'} 
                  />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView 
              style={styles.modalBody}
              contentContainerStyle={styles.modalBodyContent}
            >
              {/* Checkboxes */}
              <Pressable
                style={styles.checkboxRow}
                onPress={() => {
                  console.log('Broken Utility toggled:', !brokenUtility);
                  setBrokenUtility(!brokenUtility);
                }}
              >
                <View style={[
                  styles.checkbox,
                  { 
                    backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#FFFFFF',
                  },
                  brokenUtility && styles.checkboxChecked
                ]}>
                  {brokenUtility && (
                    <IconSymbol size={18} name="checkmark" color="#FFFFFF" />
                  )}
                </View>
                <ThemedText>Broken Utility</ThemedText>
              </Pressable>

              <Pressable
                style={styles.checkboxRow}
                onPress={() => {
                  console.log('Construction toggled:', !construction);
                  setConstruction(!construction);
                }}
              >
                <View style={[
                  styles.checkbox,
                  { 
                    backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#FFFFFF',
                  },
                  construction && styles.checkboxChecked
                ]}>
                  {construction && (
                    <IconSymbol size={18} name="checkmark" color="#FFFFFF" />
                  )}
                </View>
                <ThemedText>Construction</ThemedText>
              </Pressable>

              {/* Comments */}
              <ThemedText style={styles.commentsLabel}>Comments:</ThemedText>
              <TextInput
                style={[
                  styles.commentsInput,
                  {
                    color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
                    borderColor: colorScheme === 'dark' ? '#38383A' : '#8E8E93',
                    backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#F2F2F7',
                  },
                ]}
                multiline
                numberOfLines={4}
                value={comments}
                onChangeText={setComments}
                placeholder="Enter additional details..."
                placeholderTextColor="#8E8E93"
              />
            </ScrollView>

            <View style={[
              styles.modalFooter,
              { borderTopColor: colorScheme === 'dark' ? '#38383A' : '#E5E5EA' }
            ]}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancelReport}
              >
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.submitButton]}
                onPress={handleSubmitReport}
              >
                <ThemedText style={styles.submitButtonText}>
                  {editingReport ? 'Update Report' : 'Submit Report'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 15,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  mapContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  mapPressableArea: {
    width: '100%',
    height: '100%',
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  marker: {
    position: 'absolute',
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    elevation: 999,
  },
  markerPin: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 10,
  },
  debugInfo: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 8,
    zIndex: 9999,
    borderRadius: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  instruction: {
    fontSize: 14,
    color: '#8E8E93',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    borderRadius: 12,
    width: '90%',
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalBody: {
    maxHeight: 400,
  },
  modalBodyContent: {
    padding: 20,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingVertical: 5,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderWidth: 2,
    borderColor: '#4A90E2',
    borderRadius: 6,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  commentsLabel: {
    fontSize: 16,
    marginTop: 10,
    marginBottom: 10,
  },
  commentsInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    gap: 10,
    borderTopWidth: 1,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#8E8E93',
  },
  submitButton: {
    backgroundColor: '#4A90E2',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

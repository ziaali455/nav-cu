import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { db } from '@/config/firebase';
import { useColorScheme } from '@/hooks/use-color-scheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, updateDoc } from 'firebase/firestore';
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
  description: string;
  tags: 'construction' | 'broken';
  createdBy: string;
  firebaseDocId?: string; // Firestore document ID for updates/deletes
  // Keep x and y for map display
  x?: number;
  y?: number;
}

interface DraggableMarkerProps {
  report: Report;
  onDragEnd: (id: string, newX: number, newY: number) => void;
  onPress: (report: Report) => void;
  currentUserId: string;
}

const DraggableMarker = ({ report, onDragEnd, onPress, currentUserId }: DraggableMarkerProps) => {
  const x = report.x ?? 0;
  const y = report.y ?? 0;
  const isOwnReport = report.createdBy === currentUserId;
  
  const position = useRef(new Animated.ValueXY({ x: x - 20, y: y - 40 })).current;

  useEffect(() => {
    position.setValue({ x: x - 20, y: y - 40 });
  }, [x, y, position]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only allow dragging if user owns the report
        if (!isOwnReport) return false;
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        if (!isOwnReport) return;
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
        if (!isOwnReport) return;
        position.flattenOffset();
        const newX = x + gestureState.dx;
        const newY = y + gestureState.dy;
        onDragEnd(report.id, newX, newY);
      },
    })
  ).current;
  
  // Don't render if x or y is undefined
  if (report.x === undefined || report.y === undefined) return null;

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

// Get or create a unique user ID for this device
const getUserId = async (): Promise<string> => {
  try {
    let userId = await AsyncStorage.getItem('userId');
    if (!userId) {
      userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await AsyncStorage.setItem('userId', userId);
    }
    return userId;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
};

export default function ReportsScreen() {
  const [reports, setReports] = useState<Report[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedReport, setSelectedReport] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [selectedTag, setSelectedTag] = useState<'construction' | 'broken' | null>(null);
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [containerLayout, setContainerLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [imageLayout, setImageLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const colorScheme = useColorScheme();

  // Get user ID on mount
  useEffect(() => {
    getUserId().then(setCurrentUserId);
  }, []);

  // Load reports from Firebase on component mount
  useEffect(() => {
    const loadReports = async () => {
      try {
        const reportsQuery = query(
          collection(db, 'reports'),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(reportsQuery);
        
        const loadedReports: Report[] = [];
        querySnapshot.forEach((document) => {
          const data = document.data();
          loadedReports.push({
            id: data.id,
            description: data.description,
            tags: data.tags,
            createdBy: data.createdBy || '',
            firebaseDocId: document.id, // Store Firestore doc ID
            x: data.location?.x,
            y: data.location?.y,
          });
        });
        
        setReports(loadedReports);
        console.log(`Loaded ${loadedReports.length} reports from Firebase`);
      } catch (error) {
        console.error('Error loading reports:', error);
        Alert.alert('Error', 'Failed to load reports from database.');
      } finally {
        setIsLoading(false);
      }
    };

    loadReports();
  }, []);

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

  const handleSubmitReport = async () => {
    if (editingReport) {
      // Update existing report in Firebase
      if (!selectedTag || !description.trim()) {
        Alert.alert('Missing Information', 'Please select a tag and enter a description.');
        return;
      }

      // Check ownership
      if (editingReport.createdBy !== currentUserId) {
        Alert.alert('Permission Denied', 'You can only edit your own reports.');
        return;
      }

      setIsSaving(true);

      try {
        if (!editingReport.firebaseDocId) {
          throw new Error('No Firebase document ID');
        }

        // Update in Firebase
        const reportRef = doc(db, 'reports', editingReport.firebaseDocId);
        await updateDoc(reportRef, {
          description: description.trim(),
          tags: selectedTag,
          updatedAt: new Date().toISOString(),
        });

        // Update local state
        const updatedReports = reports.map(report => 
          report.id === editingReport.id
            ? { ...report, description: description.trim(), tags: selectedTag }
            : report
        );
        setReports(updatedReports);
        Alert.alert('Success', 'Report updated successfully!');
        resetForm();
      } catch (error) {
        console.error('Error updating report:', error);
        Alert.alert('Error', 'Failed to update report. Please try again.');
      } finally {
        setIsSaving(false);
      }
    } else if (selectedReport) {
      // Create new report
      if (!selectedTag || !description.trim()) {
        Alert.alert('Missing Information', 'Please select a tag and enter a description.');
        return;
      }

      setIsSaving(true);

      try {
        // Generate a unique ID
        const reportId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Save to Firebase Firestore
        const docRef = await addDoc(collection(db, 'reports'), {
          id: reportId,
          description: description.trim(),
          tags: selectedTag,
          createdBy: currentUserId,
          createdAt: new Date().toISOString(),
          location: {
            x: selectedReport.x,
            y: selectedReport.y,
          },
        });

        // Create report object with Firebase doc ID
        const newReport: Report = {
          id: reportId,
          description: description.trim(),
          tags: selectedTag,
          createdBy: currentUserId,
          firebaseDocId: docRef.id,
          x: selectedReport.x,
          y: selectedReport.y,
        };

        console.log('Submitting report at:', selectedReport.x, selectedReport.y);
        // Update local state
        setReports([...reports, newReport]);
        
        Alert.alert('Success', 'Report submitted successfully!');
        resetForm();
      } catch (error) {
        console.error('Error saving report:', error);
        Alert.alert('Error', 'Failed to save report. Please try again.');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleMarkerPress = (report: Report) => {
    console.log('Marker pressed! Report ID:', report.id);
    setEditingReport(report);
    setSelectedTag(report.tags);
    setDescription(report.description);
    setModalVisible(true);
  };

  const handleDeleteReport = () => {
    if (!editingReport) return;

    // Check ownership
    if (editingReport.createdBy !== currentUserId) {
      Alert.alert('Permission Denied', 'You can only delete your own reports.');
      return;
    }

    const deleteAction = async () => {
      try {
        if (!editingReport.firebaseDocId) {
          throw new Error('No Firebase document ID');
        }

        // Delete from Firebase
        await deleteDoc(doc(db, 'reports', editingReport.firebaseDocId));

        // Update local state
        setReports(reports.filter(r => r.id !== editingReport.id));
        setModalVisible(false);
        resetForm();
        Alert.alert('Success', 'Report deleted successfully!');
      } catch (error) {
        console.error('Error deleting report:', error);
        Alert.alert('Error', 'Failed to delete report. Please try again.');
      }
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

  const handleDragEnd = async (id: string, newX: number, newY: number) => {
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

    // Find the report and check ownership
    const report = reports.find(r => r.id === id);
    if (!report) return;

    if (report.createdBy !== currentUserId) {
      Alert.alert('Permission Denied', 'You can only move your own reports.');
      return;
    }

    // Update local state
    setReports(prevReports => 
      prevReports.map(report =>
        report.id === id ? { ...report, x: newX, y: newY } : report
      )
    );

    // Update in Firebase
    try {
      if (report.firebaseDocId) {
        const reportRef = doc(db, 'reports', report.firebaseDocId);
        await updateDoc(reportRef, {
          'location.x': newX,
          'location.y': newY,
          updatedAt: new Date().toISOString(),
        });
        console.log('Report position updated in Firebase');
      }
    } catch (error) {
      console.error('Error updating report position:', error);
      // Revert local state on error
      setReports(prevReports => 
        prevReports.map(r =>
          r.id === id ? { ...r, x: report.x, y: report.y } : r
        )
      );
      Alert.alert('Error', 'Failed to update report position.');
    }
  };

  const resetForm = () => {
    setModalVisible(false);
    setSelectedReport(null);
    setEditingReport(null);
    setSelectedTag(null);
    setDescription('');
  };

  // Check if current user owns the editing report
  const isOwnReport = !editingReport || editingReport.createdBy === currentUserId;

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
            source={require('@/assets/columbia-ods-map-2.png')}
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
            currentUserId={currentUserId}
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
          {isLoading ? 'Loading reports...' : 'Tap a location to add a report'}
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
                {editingReport ? (isOwnReport ? 'Edit Report' : 'View Report') : 'New Report'}
              </ThemedText>
              <View style={{ flexDirection: 'row', gap: 15, alignItems: 'center' }}>
                {editingReport && isOwnReport && (
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
              {/* Tag Selection */}
              <ThemedText style={styles.sectionLabel}>Issue Type:</ThemedText>
              
              <Pressable
                style={styles.checkboxRow}
                onPress={() => {
                  if (isOwnReport) {
                    console.log('Broken toggled');
                    setSelectedTag(selectedTag === 'broken' ? null : 'broken');
                  }
                }}
                disabled={!isOwnReport}
              >
                <View style={[
                  styles.checkbox,
                  { 
                    backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#FFFFFF',
                  },
                  selectedTag === 'broken' && styles.checkboxChecked,
                  !isOwnReport && { opacity: 0.6 }
                ]}>
                  {selectedTag === 'broken' && (
                    <IconSymbol size={18} name="checkmark" color="#FFFFFF" />
                  )}
                </View>
                <ThemedText style={!isOwnReport && { opacity: 0.6 }}>Broken</ThemedText>
              </Pressable>

              <Pressable
                style={styles.checkboxRow}
                onPress={() => {
                  if (isOwnReport) {
                    console.log('Construction toggled');
                    setSelectedTag(selectedTag === 'construction' ? null : 'construction');
                  }
                }}
                disabled={!isOwnReport}
              >
                <View style={[
                  styles.checkbox,
                  { 
                    backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#FFFFFF',
                  },
                  selectedTag === 'construction' && styles.checkboxChecked,
                  !isOwnReport && { opacity: 0.6 }
                ]}>
                  {selectedTag === 'construction' && (
                    <IconSymbol size={18} name="checkmark" color="#FFFFFF" />
                  )}
                </View>
                <ThemedText style={!isOwnReport && { opacity: 0.6 }}>Construction</ThemedText>
              </Pressable>

              {/* Description */}
              <ThemedText style={styles.sectionLabel}>Description:</ThemedText>
              <TextInput
                style={[
                  styles.commentsInput,
                  {
                    color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
                    borderColor: colorScheme === 'dark' ? '#38383A' : '#8E8E93',
                    backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#F2F2F7',
                  },
                  !isOwnReport && { opacity: 0.6 }
                ]}
                multiline
                numberOfLines={4}
                value={description}
                onChangeText={setDescription}
                placeholder="Enter details about the issue..."
                placeholderTextColor="#8E8E93"
                editable={isOwnReport}
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
                <ThemedText style={styles.cancelButtonText}>
                  {isOwnReport ? 'Cancel' : 'Close'}
                </ThemedText>
              </TouchableOpacity>
              {isOwnReport && (
                <TouchableOpacity
                  style={[styles.button, styles.submitButton]}
                  onPress={handleSubmitReport}
                  disabled={isSaving}
                >
                  <ThemedText style={styles.submitButtonText}>
                    {isSaving ? 'Saving...' : editingReport ? 'Update Report' : 'Submit Report'}
                  </ThemedText>
                </TouchableOpacity>
              )}
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
  sectionLabel: {
    fontSize: 16,
    marginTop: 10,
    marginBottom: 10,
    fontWeight: '600',
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

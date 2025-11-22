import { useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Pressable,
  Image,
  useWindowDimensions,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface Report {
  id: string;
  x: number;
  y: number;
  brokenUtility: boolean;
  construction: boolean;
  comments: string;
}

export default function ReportsScreen() {
  const [reports, setReports] = useState<Report[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedReport, setSelectedReport] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [brokenUtility, setBrokenUtility] = useState(false);
  const [construction, setConstruction] = useState(false);
  const [comments, setComments] = useState('');
  const colorScheme = useColorScheme();
  const { width } = useWindowDimensions();

  const handleMapPress = (event: any) => {
    const { locationX, locationY } = event.nativeEvent;
    setSelectedReport({ x: locationX, y: locationY });
    setModalVisible(true);
  };

  const handleSubmitReport = () => {
    if (selectedReport) {
      const newReport: Report = {
        id: Date.now().toString(),
        x: selectedReport.x,
        y: selectedReport.y,
        brokenUtility,
        construction,
        comments,
      };
      setReports([...reports, newReport]);
      resetForm();
    }
  };

  const handleCancelReport = () => {
    resetForm();
  };

  const resetForm = () => {
    setModalVisible(false);
    setSelectedReport(null);
    setBrokenUtility(false);
    setConstruction(false);
    setComments('');
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText type="title">Report a Location</ThemedText>
        <ThemedText style={styles.subtitle}>To Teachers College</ThemedText>
      </ThemedView>

      <View style={styles.mapContainer}>
        <Pressable onPress={handleMapPress} style={styles.mapPressable}>
          <Image
            source={require('@/assets/columbia_ods_map.png')}
            style={styles.mapImage}
            resizeMode="contain"
          />
          {/* Render report markers */}
          {reports.map((report) => (
            <View
              key={report.id}
              style={[
                styles.marker,
                {
                  left: report.x - 15,
                  top: report.y - 30,
                },
              ]}
            >
              <IconSymbol
                size={30}
                name="exclamationmark.triangle.fill"
                color="#FF3B30"
              />
            </View>
          ))}
        </Pressable>
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
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">Details:</ThemedText>
              <TouchableOpacity onPress={handleCancelReport}>
                <IconSymbol size={24} name="xmark.circle.fill" color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Checkboxes */}
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setBrokenUtility(!brokenUtility)}
              >
                <View style={styles.checkbox}>
                  {brokenUtility && (
                    <IconSymbol size={20} name="checkmark" color="#4A90E2" />
                  )}
                </View>
                <ThemedText style={styles.checkboxLabel}>Broken Utility</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setConstruction(!construction)}
              >
                <View style={styles.checkbox}>
                  {construction && (
                    <IconSymbol size={20} name="checkmark" color="#4A90E2" />
                  )}
                </View>
                <ThemedText style={styles.checkboxLabel}>Construction</ThemedText>
              </TouchableOpacity>

              {/* Comments */}
              <ThemedText style={styles.commentsLabel}>Comments:</ThemedText>
              <TextInput
                style={[
                  styles.commentsInput,
                  {
                    color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
                    borderColor: '#8E8E93',
                    backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F2F2F7',
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

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancelReport}
              >
                <ThemedText style={styles.buttonText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.submitButton]}
                onPress={handleSubmitReport}
              >
                <ThemedText style={[styles.buttonText, styles.submitButtonText]}>
                  Submit Report
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
    position: 'relative',
  },
  mapPressable: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  marker: {
    position: 'absolute',
    zIndex: 10,
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
    backgroundColor: '#FFFFFF',
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
    borderBottomColor: '#E5E5EA',
  },
  modalBody: {
    padding: 20,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#8E8E93',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#000000',
  },
  commentsLabel: {
    fontSize: 16,
    marginTop: 10,
    marginBottom: 10,
    color: '#000000',
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
    borderTopColor: '#E5E5EA',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#E5E5EA',
  },
  submitButton: {
    backgroundColor: '#4A90E2',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  submitButtonText: {
    color: '#FFFFFF',
  },
});

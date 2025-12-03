import { useState } from 'react';
import { StyleSheet, Switch, TouchableOpacity, ScrollView, Modal, Pressable } from 'react-native';
import * as Linking from 'expo-linking';
import { openBrowserAsync } from 'expo-web-browser';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function SettingsScreen() {
  const iconColor = useThemeColor({}, 'icon');
  const textColor = useThemeColor({}, 'text');
  const [showContactModal, setShowContactModal] = useState(false);

  // Accessibility Preference states
  const [standardMobility, setStandardMobility] = useState(false);
  const [caneCrutches, setCaneCrutches] = useState(true);
  const [wheelchairUser, setWheelchairUser] = useState(true);

  // Route Options states
  const [avoidStairs, setAvoidStairs] = useState(true);
  const [preferElevators, setPreferElevators] = useState(true);
  const [showRamps, setShowRamps] = useState(true);
  const [minimizeOutdoorPaths, setMinimizeOutdoorPaths] = useState(true);
  const [entrances, setEntrances] = useState(true);

  const handleSaveChanges = () => {
    // TODO: Implement save functionality
    console.log('Saving changes...');
  };

  const handleContactODS = () => {
    setShowContactModal(true);
  };

  const handlePhonePress = async () => {
    const phoneNumber = '212-854-2284';
    const url = `tel:${phoneNumber}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    }
  };

  const handleEmailPress = async () => {
    const email = 'health@columbia.edu';
    const url = `mailto:${email}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    }
  };

  const handleWebsitePress = async () => {
    const url = 'https://www.health.columbia.edu/content/disability-services';
    await openBrowserAsync(url);
  };

  const SettingRow = ({ 
    label, 
    value, 
    onValueChange 
  }: { 
    label: string; 
    value: boolean; 
    onValueChange: (value: boolean) => void;
  }) => (
    <ThemedView style={styles.settingRow}>
      <ThemedText style={styles.settingLabel}>{label}</ThemedText>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#E5E5EA', true: '#4A90E2' }}
        thumbColor={value ? '#FFFFFF' : '#F4F3F4'}
        ios_backgroundColor="#E5E5EA"
      />
    </ThemedView>
  );

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <ThemedView style={styles.header}>
        <IconSymbol name="gear" size={24} color={iconColor} />
        <ThemedText type="title" style={styles.headerTitle}>Settings</ThemedText>
      </ThemedView>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Accessibility Preference Section */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Accessibility Preference
          </ThemedText>
          <SettingRow
            label="Standard Mobility"
            value={standardMobility}
            onValueChange={setStandardMobility}
          />
          <SettingRow
            label="Cane/Crutches"
            value={caneCrutches}
            onValueChange={setCaneCrutches}
          />
          <SettingRow
            label="Wheelchair User"
            value={wheelchairUser}
            onValueChange={setWheelchairUser}
          />
        </ThemedView>

        {/* Divider */}
        <ThemedView style={styles.divider} />

        {/* Route Options Section */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Route Options
          </ThemedText>
          <SettingRow
            label="Avoid Stairs"
            value={avoidStairs}
            onValueChange={setAvoidStairs}
          />
          <SettingRow
            label="Prefer Elevators"
            value={preferElevators}
            onValueChange={setPreferElevators}
          />
          <SettingRow
            label="Show Ramps"
            value={showRamps}
            onValueChange={setShowRamps}
          />
          <SettingRow
            label="Minimize Outdoor Paths"
            value={minimizeOutdoorPaths}
            onValueChange={setMinimizeOutdoorPaths}
          />
          <SettingRow
            label="Entrances"
            value={entrances}
            onValueChange={setEntrances}
          />
        </ThemedView>

        {/* Action Buttons */}
        <ThemedView style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.saveButton]}
            onPress={handleSaveChanges}
            activeOpacity={0.7}
          >
            <ThemedText style={styles.buttonText}>Save Changes</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.contactButton]}
            onPress={handleContactODS}
            activeOpacity={0.7}
          >
            <ThemedText style={styles.buttonText}>Contact ODS</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </ScrollView>

      {/* Contact ODS Modal */}
      <Modal
        visible={showContactModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowContactModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowContactModal(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <TouchableOpacity
              onPress={() => setShowContactModal(false)}
              style={styles.closeButton}
            >
              <ThemedText style={styles.closeButtonText}>✕</ThemedText>
            </TouchableOpacity>

            <ThemedView style={styles.contactSection}>
              {/* Phone */}
              <TouchableOpacity
                style={styles.contactRow}
                onPress={handlePhonePress}
                activeOpacity={0.7}
              >
                <IconSymbol name="phone" size={36} color="#FFFFFF" />
                <ThemedView style={styles.contactInfo}>
                  <ThemedText style={styles.contactLabel}>Phone</ThemedText>
                  <ThemedText style={styles.contactValue}>212-854-2284</ThemedText>
                </ThemedView>
              </TouchableOpacity>

              {/* Email */}
              <TouchableOpacity
                style={styles.contactRow}
                onPress={handleEmailPress}
                activeOpacity={0.7}
              >
                <IconSymbol name="envelope" size={36} color="#FFFFFF" />
                <ThemedView style={styles.contactInfo}>
                  <ThemedText style={styles.contactLabel}>Contact Us</ThemedText>
                  <ThemedText style={styles.contactValue}>health@columbia.edu</ThemedText>
                </ThemedView>
              </TouchableOpacity>

              {/* Website */}
              <TouchableOpacity
                style={styles.contactRow}
                onPress={handleWebsitePress}
                activeOpacity={0.7}
              >
                <IconSymbol name="paperplane.fill" size={36} color="#FFFFFF" />
                <ThemedView style={styles.contactInfo}>
                  <ThemedText style={styles.contactLabel}>Website</ThemedText>
                  <ThemedText style={styles.contactValue} numberOfLines={1}>
                    health.columbia.edu
                  </ThemedText>
                </ThemedView>
              </TouchableOpacity>
            </ThemedView>
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  section: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingLabel: {
    fontSize: 16,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: 20,
  },
  buttonContainer: {
    marginTop: 32,
    gap: 16,
  },
  button: {
    backgroundColor: '#4A90E2',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    backgroundColor: '#4A90E2',
  },
  contactButton: {
    backgroundColor: '#4A90E2',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#2C3E50',
    borderRadius: 20,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginBottom: 8,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '300',
  },
  contactSection: {
    gap: 32,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingVertical: 8,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
  },
  contactValue: {
    color: '#4A90E2',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});

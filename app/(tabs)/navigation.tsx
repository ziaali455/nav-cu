import { StyleSheet, TextInput, View, Image, ScrollView, Dimensions } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useState } from 'react';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function NavigationScreen() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <ThemedView style={styles.container}>
      <View style={styles.searchContainer}>
        <IconSymbol name="magnifyingglass" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Find name or place..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.mapWrapper}>
        <ScrollView 
          style={styles.mapContainer}
          contentContainerStyle={styles.mapContent}
          showsVerticalScrollIndicator={true}
        >
          <Image
            source={require('@/assets/images/campus-map.png')}
            style={styles.mapImage}
            resizeMode="contain"
          />
        </ScrollView>

        <View style={styles.accessibilityOverlay}>
          <View style={styles.legendCard}>
            <View style={styles.legendItem}>
              <View style={[styles.iconWrapper, { backgroundColor: '#4A90E2' }]}>
                <IconSymbol name="figure.roll" size={20} color="#fff" />
              </View>
              <ThemedText style={styles.legendText}>Ramps</ThemedText>
            </View>
            
            <View style={styles.legendItem}>
              <View style={[styles.iconWrapper, { backgroundColor: '#E84393' }]}>
                <IconSymbol name="location.fill" size={20} color="#fff" />
              </View>
              <ThemedText style={styles.legendText}>Entry</ThemedText>
            </View>

            <View style={styles.legendItem}>
              <View style={[styles.iconWrapper, { backgroundColor: '#00B894' }]}>
                <IconSymbol name="figure.roll" size={20} color="#fff" />
              </View>
              <ThemedText style={styles.legendText}>Access</ThemedText>
            </View>

            <View style={styles.legendItem}>
              <View style={[styles.iconWrapper, { backgroundColor: '#FD9644' }]}>
                <IconSymbol name="arrow.up.arrow.down" size={20} color="#fff" />
              </View>
              <ThemedText style={styles.legendText}>Elevator</ThemedText>
            </View>

            <View style={styles.legendItem}>
              <View style={[styles.iconWrapper, { backgroundColor: '#6C5CE7' }]}>
                <IconSymbol name="building.2.fill" size={20} color="#fff" />
              </View>
              <ThemedText style={styles.legendText}>Building</ThemedText>
            </View>
          </View>
        </View>
      </View>

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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  mapWrapper: {
    flex: 1,
    position: 'relative',
  },
  mapContainer: {
    flex: 1,
  },
  mapContent: {
    paddingHorizontal: 8,
    paddingBottom: 20,
  },
  mapImage: {
    width: SCREEN_WIDTH - 16,
    height: (SCREEN_WIDTH - 16) * 1.85,
    alignSelf: 'center',
  },
  accessibilityOverlay: {
    position: 'absolute',
    bottom: 20,
    right: 16,
  },
  legendCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
    minWidth: 140,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
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
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
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

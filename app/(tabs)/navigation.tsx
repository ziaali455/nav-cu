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
          bounces={true}
        >
          <Image
            source={require('@/assets/images/campus-map.png')}
            style={styles.mapImage}
            resizeMode="cover"
          />
        </ScrollView>
      </View>

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
    marginBottom: 8,
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
    flexGrow: 1,
  },
  mapImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.75,
    minHeight: 500,
  },
  legendCard: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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

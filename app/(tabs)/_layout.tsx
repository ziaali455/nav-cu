import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import EvilIcons from '@expo/vector-icons/EvilIcons';
import Feather from '@expo/vector-icons/Feather';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#3B82F6', // Blue for selected
        tabBarInactiveTintColor: '#9CA3AF', // Gray for unselected
        tabBarStyle: {
          backgroundColor: '#111827',
          borderTopColor: '#1F2937',
          borderTopWidth: 1,
          height: 100,
          paddingBottom: 30,
          paddingTop: 12,
        },
        tabBarLabelPosition: 'below-icon',
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => (
            <Feather name="settings" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="navigation"
        options={{
          title: 'Navigation',
          tabBarIcon: ({ color }) => (
            <EvilIcons name="location" size={32} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Reports',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="exclamationmark.circle" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          href: null, // Hide from tabs
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          href: null, // Hide from tabs
        }}
      />
    </Tabs>
  );
}

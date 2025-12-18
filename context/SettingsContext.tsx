import React, { createContext, ReactNode, useContext, useState } from 'react';

interface MarkerVisibility {
  showElevators: boolean;
  showRamps: boolean;
  showEntrances: boolean;
  showWheelchairAccess: boolean;
}

interface SettingsContextType {
  // Accessibility Preferences
  standardMobility: boolean;
  setStandardMobility: (value: boolean) => void;
  caneCrutches: boolean;
  setCaneCrutches: (value: boolean) => void;
  wheelchairUser: boolean;
  setWheelchairUser: (value: boolean) => void;

  // Route Options
  avoidStairs: boolean;
  setAvoidStairs: (value: boolean) => void;
  preferElevators: boolean;
  setPreferElevators: (value: boolean) => void;
  showRamps: boolean;
  setShowRamps: (value: boolean) => void;
  minimizeOutdoorPaths: boolean;
  setMinimizeOutdoorPaths: (value: boolean) => void;
  entrances: boolean;
  setEntrances: (value: boolean) => void;

  // Derived visibility for map markers
  markerVisibility: MarkerVisibility;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  // Accessibility Preferences
  const [standardMobility, setStandardMobility] = useState(false);
  const [caneCrutches, setCaneCrutches] = useState(true);
  const [wheelchairUser, setWheelchairUser] = useState(true);

  // Route Options
  const [avoidStairs, setAvoidStairs] = useState(true);
  const [preferElevators, setPreferElevators] = useState(true);
  const [showRamps, setShowRamps] = useState(true);
  const [minimizeOutdoorPaths, setMinimizeOutdoorPaths] = useState(true);
  const [entrances, setEntrances] = useState(true);

  // Derive marker visibility from settings
  const markerVisibility: MarkerVisibility = {
    // These control what's rendered on the map (not routing constraints)
    showElevators: true,
    showRamps: showRamps,
    showEntrances: entrances,
    showWheelchairAccess: true,
  };

  return (
    <SettingsContext.Provider
      value={{
        standardMobility,
        setStandardMobility,
        caneCrutches,
        setCaneCrutches,
        wheelchairUser,
        setWheelchairUser,
        avoidStairs,
        setAvoidStairs,
        preferElevators,
        setPreferElevators,
        showRamps,
        setShowRamps,
        minimizeOutdoorPaths,
        setMinimizeOutdoorPaths,
        entrances,
        setEntrances,
        markerVisibility,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}


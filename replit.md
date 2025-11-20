# Nav-CU - Expo React Native App

## Overview
This is an Expo React Native application created with `create-expo-app`. The app runs on web, iOS, and Android platforms, featuring a tab-based navigation system with multiple screens including Settings, Navigation, and Reports.

## Project Setup
- **Framework**: Expo SDK 54
- **Language**: TypeScript
- **Routing**: expo-router (file-based routing)
- **UI Libraries**: React Native, React Navigation
- **Animations**: react-native-reanimated
- **Development Server**: Metro bundler for native, Webpack for web

## Project Structure
```
/app - Main application code with file-based routing
  /(tabs) - Tab-based screens (Settings, Navigation, Reports)
  _layout.tsx - Root layout
/components - Reusable UI components
  /ui - UI-specific components (icons, symbols)
/constants - App constants (theme, colors, fonts)
/hooks - Custom React hooks
/assets - Images and static assets
```

## Running in Replit
The app is configured to run on port 5000 with proper Replit environment settings:

**Development Server**: 
```bash
EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0 npx expo start --web --port 5000
```

The server automatically:
- Binds to port 5000 for web preview
- Configures Metro bundler for development
- Enables React Compiler
- Supports hot module reloading

## Key Features
- Tab-based navigation with custom icons
- Theme support (light/dark mode)
- Haptic feedback on tab interactions
- Parallax scroll views
- Responsive design for web and mobile

## Recent Changes
- 2025-11-20: Initial Replit import and configuration
  - Installed npm dependencies (965 packages)
  - Configured Expo web server on port 5000 with proper Replit environment variables
  - Created Metro config for bundler configuration
  - Configured deployment for static web export (npx expo export --platform web)
  - Verified app runs successfully in Replit environment with full navigation functionality
  - All three tab screens (Settings, Navigation, Reports) tested and working

## Dependencies
All dependencies are managed via npm and defined in package.json. Key packages:
- expo (~54.0.24)
- react (19.1.0)
- react-native (0.81.5)
- expo-router (~6.0.15)
- react-navigation packages

## Development Notes
- The app uses Expo's new architecture with React Compiler enabled
- Web output is configured as static in app.json
- TypeScript is enabled with strict type checking
- The webpack dev server automatically accepts proxied requests from Replit
- Hot module reloading is enabled for rapid development

## Deployment
Configured for static site deployment using Expo's export command:
- Build command: `npx expo export --platform web`
- Public directory: `dist`
- Deployment target: Static site hosting

## Known Issues
- Some packages show engine warnings for Node.js 20.19.4 (currently running 20.19.3), but these are non-blocking
- Deprecated warnings for rimraf and glob packages (from dependencies)
- One deprecation warning for props.pointerEvents (should use style.pointerEvents)

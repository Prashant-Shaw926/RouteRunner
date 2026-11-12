#!/usr/bin/env bash
# Run ONCE from the parent folder of this project's contents.
# 1) Create a fresh Expo TS app, 2) overlay this scaffold, 3) install deps with SDK-compatible versions.
set -e
npx create-expo-app@latest routerunner-app --template blank-typescript
cp -R app src __tests__ docs README.md DECISIONS.md FEATURES.md TESTING.md jest.config.js routerunner-app/ 2>/dev/null || true
cd routerunner-app
npx expo install expo-router expo-linking expo-constants expo-status-bar react-native-safe-area-context react-native-screens @react-native-async-storage/async-storage expo-crypto
npm install zustand
npm install -D jest jest-expo @types/jest
# in package.json set:  "main": "expo-router/entry"  and  "scripts": { "test": "jest" }
# in app.json add:      "scheme": "routerunner", "plugins": ["expo-router"]
echo "Done. Run: npx expo start"

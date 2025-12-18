# Simple Solution for Expo Web + GitHub Pages

## The Problem
You were getting "Unmatched Route" at `https://ziaali455.github.io/nav-cu/` because there was no route handler for the root `/` path.

## The Simple Solution

### 1. Created Root Index Route
**File: `app/index.tsx`**
```tsx
import { Redirect } from 'expo-router';

export default function Index() {
  return <Redirect href="/settings" />;
}
```

This handles the base URL and redirects to `/settings`.

### 2. Updated Root Layout
**File: `app/_layout.tsx`**
Changed from:
```tsx
export const unstable_settings = {
  anchor: '(tabs)',
};
```

To:
```tsx
export const unstable_settings = {
  initialRouteName: 'index',
};
```

This tells Expo Router to use `index.tsx` as the entry point.

### 3. Simple Workflow
**File: `.github/workflows/deploy.yml`**

The workflow is straightforward:
1. Build with `npx expo export --platform web`
2. Fix asset paths (Expo generates `/_expo` but GitHub Pages needs `/nav-cu/_expo`)
3. Create `404.html` from `index.html` for client-side routing
4. Deploy using official GitHub Actions

## Why This Works

1. **Expo handles routing**: The `baseUrl: "/nav-cu"` in `app.json` tells Expo Router to handle the subdirectory
2. **Root route exists**: `app/index.tsx` handles the base URL
3. **Assets are fixed**: The workflow fixes script/asset paths for GitHub Pages
4. **Client-side routing**: The `404.html` fallback enables direct navigation to any route

## GitHub Pages Settings

✅ **Yes, it's OK to deploy from GitHub Actions!**

Go to: https://github.com/ziaali455/nav-cu/settings/pages
- Set **Source** to **"GitHub Actions"**

This is the modern, recommended way to deploy to GitHub Pages.

## How It Works

1. User visits `https://ziaali455.github.io/nav-cu/`
2. GitHub serves `dist/index.html`
3. JavaScript loads and Expo Router sees the root `/` route
4. `app/index.tsx` redirects to `/settings`
5. Expo Router (with `baseUrl`) navigates to `/nav-cu/settings`
6. Done! ✅

## File Structure

```
app/
├── _layout.tsx          # Root layout with initialRouteName
├── index.tsx            # NEW: Root route that redirects
├── modal.tsx
└── (tabs)/
    ├── _layout.tsx      # Tab layout
    ├── index.tsx        # Tab index (redirects to settings)
    ├── settings.tsx
    ├── navigation.tsx
    ├── reports.tsx
    └── explore.tsx
```

## That's It!

This is the simplest solution for Expo Router + GitHub Pages:
- ✅ One root `index.tsx` file
- ✅ Simple workflow that fixes asset paths
- ✅ GitHub Actions deployment
- ✅ No complex routing hacks

The key insight: Expo Router with `baseUrl` handles subdirectory routing automatically, we just needed a root route to handle the base URL.



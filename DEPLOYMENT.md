# GitHub Pages Deployment Guide

## Current Setup

This project is configured to deploy to GitHub Pages automatically using GitHub Actions.

### Configuration Files

1. **app.json** - Contains `baseUrl: "/nav-cu"` for proper routing on GitHub Pages
2. **.github/workflows/deploy.yml** - GitHub Actions workflow that builds and deploys

### How It Works

1. When you push to the `main` branch, GitHub Actions automatically:
   - Installs dependencies
   - Builds the Expo web app (`npx expo export --platform web`)
   - Fixes asset paths for GitHub Pages subdirectory hosting
   - Creates a 404.html for client-side routing
   - Deploys to GitHub Pages

### GitHub Pages Settings

**IMPORTANT**: You need to configure GitHub Pages settings in your repository:

1. Go to your repository on GitHub: `https://github.com/ziaali455/nav-cu`
2. Click **Settings** → **Pages** (in the left sidebar)
3. Under **Source**, select:
   - **Source**: GitHub Actions (NOT "Deploy from a branch")
4. Save the settings

### Deployment URL

Once configured, your app will be available at:
**https://ziaali455.github.io/nav-cu/**

### Manual Deployment

If you need to manually trigger a deployment:

```bash
# Build locally to test
npx expo export --platform web
npx serve dist

# Or trigger the workflow manually from GitHub:
# Go to Actions → Deploy to GitHub Pages → Run workflow
```

### Troubleshooting

**Issue**: Pages not updating after push
- Check the Actions tab for workflow run status
- Ensure GitHub Pages source is set to "GitHub Actions"
- Wait 1-2 minutes for deployment to complete

**Issue**: 404 errors or blank page
- Verify `baseUrl: "/nav-cu"` is set in app.json
- Check browser console for asset loading errors
- Ensure workflow completed successfully

**Issue**: Assets not loading
- The workflow automatically fixes asset paths
- Check that the sed commands in the workflow are working
- Verify dist folder structure matches expected paths

### Local Testing

To test the production build locally:

```bash
# Build for web
npx expo export --platform web

# Serve the dist folder
npx serve dist

# Open http://localhost:3000 in your browser
```

Note: Local testing won't have the `/nav-cu` base path, so some routes may behave differently than on GitHub Pages.

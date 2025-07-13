# PWA Update Guide for Development

## Quick Update Methods (In Order of Ease)

### 1. **Automatic Updates (Now Implemented)**
- The app checks for updates ONLY when you open or return to the app
- No background checking - completely battery and bandwidth friendly
- When an update is detected, you'll see a green notification: "App Updated!"
- Updates will apply automatically in the background

### 2. **Manual Cache Busting**
- **For immediate updates during development:**
  1. Change the cache version in `public/service-worker.js`
  2. Update: `const CACHE_NAME = 'dohardshit-v4';` to `v5`, `v6`, etc.
  3. This forces all cached files to refresh

### 3. **Browser Developer Tools Method**
- Open DevTools (F12)
- Go to **Application** tab
- Click **Service Workers** on the left
- Click **Update** button next to your service worker
- Check **Update on reload** checkbox
- Refresh the page

### 4. **Clear Storage Method**
- Open DevTools (F12)
- Go to **Application** tab
- Click **Storage** on the left
- Click **Clear site data** button
- Refresh the page

### 5. **Phone-Specific Methods**

#### iPhone:
- Settings > Safari > Advanced > Website Data > Find your app > Delete
- Or: Settings > General > iPhone Storage > Find your PWA > Delete

#### Android:
- Settings > Apps > Find your PWA > Storage > Clear Cache/Data
- Or: Chrome > Settings > Site Settings > Storage > Find your site > Clear

## What I've Implemented

### Service Worker Improvements:
1. **Network-first strategy** for HTML/JS/CSS files (gets updates immediately)
2. **Cache-first strategy** for assets (images, etc.)
3. **Automatic cache cleanup** when versions change
4. **Immediate takeover** of new service worker versions

### App-Level Updates:
1. **Event-based update detection** (only when app opens/returns to focus)
2. **User notifications** when updates are available
3. **Automatic background updates**

## Development Workflow

1. **Make your changes** to any file
2. **Bump the cache version** in `service-worker.js` (v4 → v5)
3. **Deploy/refresh** your server
4. **Switch away and back to the app** (or close and reopen)
5. **See the update notification** appear

## Troubleshooting

If updates still don't work:
1. Check browser console for service worker errors
2. Verify the cache version was actually changed
3. Try the DevTools method above
4. As last resort: uninstall and reinstall the PWA

## For Production

The automatic update system will work seamlessly for users:
- Updates check ONLY when they open or return to the app
- Zero background activity - no battery or bandwidth drain
- Very low bandwidth usage - only checks when actively using app
- Users get notified when updates are available
- No manual intervention needed 
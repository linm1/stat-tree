# Deployment Guide

## Issues Fixed

### 1. Missing Dependencies
- **Problem**: `npm install` hadn't been run - Vite was not installed
- **Fix**: Installed all dependencies via `npm install`

### 2. React Version Mismatch
- **Problem**: React 18.2.0 was incompatible with react-dom 19.2.4
- **Fix**: Updated `package.json` to use React 18.2.0 for both packages

### 3. Incorrect Google AI Package
- **Problem**: Using `@google/genai` instead of the correct package
- **Fix**: Changed to `@google/generative-ai` with updated imports

### 4. API Usage Issues
- **Problem**: ChatPanel was using outdated Google GenAI API syntax
- **Fix**: Updated to use the current `GoogleGenerativeAI` API with proper method calls

### 5. Missing Environment Configuration
- **Problem**: No `.env` file or Vercel configuration
- **Fix**: Created `.env`, `.env.example`, and `vercel.json` files

## Current Status

✅ **Dev server running**: http://localhost:3000
✅ **TypeScript**: No errors
✅ **Build**: Successful (dist folder created)
✅ **Ready for Vercel deployment**

## Deploy to Vercel - Step by Step

### Method 1: Vercel CLI (Recommended)

1. **Install Vercel CLI globally**:
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy from project directory**:
   ```bash
   vercel
   ```

   Follow the prompts:
   - Set up and deploy? **Y**
   - Which scope? Select your account
   - Link to existing project? **N** (first time)
   - Project name? Press Enter to use current directory name
   - In which directory is your code located? **.**
   - Want to modify settings? **N**

4. **Add environment variable** (after first deploy):
   ```bash
   vercel env add VITE_GEMINI_API_KEY
   ```

   Or via Vercel dashboard:
   - Go to your project → Settings → Environment Variables
   - Add `VITE_GEMINI_API_KEY` = your API key
   - Select all environments (Production, Preview, Development)

5. **Redeploy to apply environment variables**:
   ```bash
   vercel --prod
   ```

### Method 2: GitHub + Vercel Dashboard

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "feat: SAS Clinical Trial Decision Tree app ready for deployment"
   git push
   ```

2. **Import to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New..." → "Project"
   - Import your GitHub repository
   - Vercel auto-detects Vite configuration
   - Click "Deploy"

3. **Configure environment variables**:
   - After deployment, go to Project → Settings → Environment Variables
   - Add: `VITE_GEMINI_API_KEY`
   - Value: Your Google Gemini API key
   - Environment: All (Production, Preview, Development)
   - Save

4. **Trigger redeploy**:
   - Go to Deployments tab
   - Click on latest deployment → "..." → "Redeploy"

## Vercel Configuration

The `vercel.json` file is already configured:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "env": {
    "VITE_GEMINI_API_KEY": "@gemini-api-key"
  }
}
```

## Environment Variables

### Required for AI Features (Optional)

- `VITE_GEMINI_API_KEY`: Google Gemini API key

**Get your API key**: https://aistudio.google.com/app/apikey

### Note
The app works without the API key - users will see a message to configure it if they try to use the AI chat feature.

## Post-Deployment Checklist

- [ ] Application loads without errors
- [ ] Interactive decision tree navigation works
- [ ] Map view displays correctly with Tldraw
- [ ] Code examples render properly
- [ ] AI chat shows appropriate message (working or config needed)
- [ ] Responsive design works on mobile
- [ ] All navigation buttons functional

## Troubleshooting

### Build Fails on Vercel

1. Check Node.js version (should be 18+)
2. Verify all dependencies are in `package.json`
3. Check build logs for specific errors

### Blank Page After Deployment

1. Check browser console for errors
2. Verify environment variables are set correctly
3. Check that `index.html` is being served from root
4. Ensure all imports use correct paths (relative imports)

### AI Chat Not Working

1. Verify `VITE_GEMINI_API_KEY` is set in Vercel
2. Check API key is valid at Google AI Studio
3. Check browser console for API errors
4. Ensure quota limits haven't been exceeded

## Performance Notes

The current bundle size is ~1.2MB due to Tldraw. Consider these optimizations if needed:

1. Code splitting for Tldraw (lazy load map view)
2. Remove Tldraw if not essential
3. Use dynamic imports for heavy components

## Support

For issues, check:
- [Vercel Documentation](https://vercel.com/docs)
- [Vite Documentation](https://vite.dev/)
- [Tldraw Documentation](https://tldraw.dev/)

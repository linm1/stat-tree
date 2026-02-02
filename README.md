# SAS Clinical Trial Decision Tree

An interactive decision tree application for selecting appropriate SAS statistical procedures in clinical trial analysis.

## Features

- **Interactive Decision Flow**: Step-by-step guidance for selecting the right statistical test
- **Visual Map View**: Tldraw-powered infinite canvas showing the entire decision tree hierarchy
- **AI Programming Assistant**: Gemini-powered chat for SAS code help and statistical guidance
- **SAS Code Examples**: Ready-to-use code snippets for each analysis scenario
- **Responsive Design**: Works on desktop and mobile devices

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Configuration

### AI Features (Optional)

To enable the AI Programming Assistant:

1. Get a Google Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a `.env` file in the project root (copy from `.env.example`)
3. Add your API key:

```
VITE_GEMINI_API_KEY=your_api_key_here
```

The app works without an API key - the AI chat feature will just show a configuration message.

## Deployment on Vercel

### Option 1: Vercel CLI

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

3. Add environment variable in Vercel dashboard:
   - Go to your project settings
   - Navigate to Environment Variables
   - Add `VITE_GEMINI_API_KEY` with your API key

### Option 2: Vercel Dashboard

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com)
3. Click "Import Project"
4. Select your repository
5. Vercel will auto-detect Vite configuration
6. Add environment variable:
   - Name: `VITE_GEMINI_API_KEY`
   - Value: Your Gemini API key
7. Click Deploy

The `vercel.json` file is already configured with the correct build settings.

## Project Structure

```
stat-tree/
├── components/
│   ├── ChatPanel.tsx      # AI chat assistant
│   └── SASCard.tsx        # Code example cards
├── data.ts                # Decision tree data
├── types.ts               # TypeScript interfaces
├── App.tsx                # Main application
├── index.tsx              # Entry point
├── index.html             # HTML template
├── vite.config.ts         # Vite configuration
└── vercel.json            # Vercel deployment config
```

## Technology Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tldraw** - Infinite canvas for map view
- **Lucide React** - Icons
- **Google Generative AI** - AI chat features
- **Tailwind CSS** - Styling

## License

MIT

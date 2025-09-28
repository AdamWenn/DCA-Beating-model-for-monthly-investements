# Buy-and-Hold Strategy Dashboard

A React application with beautiful animations and interactive charts for analyzing buy-and-hold investment strategies.

## 🚀 Features

- **Three View Modes**: Story, Plan, and Flow
- **Interactive Charts**: Powered by Recharts with customizable animations
- **CSV Data Import**: Upload and analyze your own trading data
- **Beautiful Animations**: Framer Motion powered animations
- **Aurora Backgrounds**: Stunning glassmorphism UI effects
- **Responsive Design**: Tailwind CSS for all screen sizes

## 🛠️ Tech Stack

- **React 19** with TypeScript
- **Vite** for fast development
- **Tailwind CSS v4** for styling
- **Framer Motion** for animations
- **Recharts** for data visualization
- **PapaParse** for CSV processing

## 📦 Installation & Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 🎯 Usage

1. **Story Mode**: Immersive narrative view with animated headlines and editorial content
2. **Plan Mode**: Clean dashboard with metrics and performance data
3. **Flow Mode**: Scrollytelling walkthrough with purpose-built animations

Upload your CSV file with columns: `date`, `close`, `signal` to see your data visualized.

## 📁 Project Structure

```
react_app/
├── src/
│   ├── webbbis.tsx         # Main React component
│   ├── main.tsx            # App entry point
│   └── index.css           # Tailwind CSS imports
├── index.html              # HTML template
├── package.json            # Dependencies
├── vite.config.ts          # Vite configuration
├── tailwind.config.js      # Tailwind configuration
└── postcss.config.js       # PostCSS configuration
```

## 🎨 Component Features

The main component (`webbbis.tsx`) includes:
- AnimatedHeadline with word-by-word animations
- EvidenceChart with static display (no moving animations)
- Three distinct modes with different layouts
- Aurora background effects and grain texture
- Metric chips and pull quotes for editorial feel

## 🔧 Configuration

- **Tailwind CSS v4** with PostCSS integration
- **Vite 4.x** for Node.js 20.13 compatibility
- **TypeScript** with strict mode enabled
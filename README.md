# Graceful Journey Chat

A conversation management platform built for structured AI interactions using a branching system that lets you explore multiple conversation paths.

## Getting Started

### Prerequisites

- Node.js (version 18 or higher)
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd graceful-journey-chat
```

2. Install dependencies:
```bash
npm install
```

### Running the Project

#### Development Mode
Start the development server with hot reload:
```bash
npm run dev
```
The application will be available at `http://localhost:5173`

#### Production Build
Build the project for production:
```bash
npm run build
```

#### Preview Production Build
Preview the production build locally:
```bash
npm run preview
```

### API Key Setup

API keys are configured through the application interface:
1. Launch the application
2. Click the API key settings button in the interface
3. Enter your RedPill AI and/or OpenRouter API keys
4. Keys are securely stored in browser localStorage

## Technical Details

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```

## Features (Work in Progress)

### Hierarchical Summaries

**Status: WIP - Future Task**

The application will support hierarchical summaries for:
- **Bind Branch**: Automatic generation of nested summaries that bind related conversation branches together, creating a structured overview of related topics and their relationships.
- **Idea**: Hierarchical organization of ideas within conversations, allowing for multi-level categorization and summary generation of conceptual threads.

### Merging Branches

**Status: WIP - Future Task**

Branch merging functionality will allow users to:
- Combine multiple conversation branches into a unified thread
- Resolve conflicts between divergent conversation paths
- Maintain conversation history and context during merge operations
- Create consolidated summaries from merged branches

## Acknowledgements

The beautiful liquid glass effect used in this application is based on the work of [lucasromerodb](https://github.com/lucasromerodb). You can find the original repository here: [liquid-glass-effect-macos](https://github.com/lucasromerodb/liquid-glass-effect-macos).

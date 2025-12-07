# webview-navigation-engine Monorepo

A TurboRepo monorepo containing the `webview-navigation-engine` package and a sample Vue 3 application.

## 🏗️ Project Structure

```
webview-navigation-engine/
├── apps/
│   └── sample/              # Vue 3 + Vite sample app
├── packages/
│   └── webview-navigation-engine/  # Core navigation engine package
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.json
```

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### Installation

```bash
pnpm install
```

### Development

Run all packages in development mode:

```bash
pnpm dev
```

Run specific package:

```bash
# Run sample app
cd apps/sample
pnpm dev

# Build engine package
cd packages/webview-navigation-engine
pnpm build
```

### Build

Build all packages:

```bash
pnpm build
```

### Lint & Format

```bash
# Lint all packages
pnpm lint

# Format all files
pnpm format
```

## 📦 Packages

### `webview-navigation-engine`

Core navigation engine package with:

- ✅ Custom navigation engine
- ✅ Flow-based navigation (state machine)
- ✅ Popup priority handling
- ✅ Fullscreen close priority
- ✅ Custom history stack
- ✅ SessionStorage restore
- ✅ Multiple flows at once
- ✅ Framework adapters (Vue 3, React)

See [packages/webview-navigation-engine/README.md](./packages/webview-navigation-engine/README.md) for detailed documentation.

### `sample`

Vue 3 sample application demonstrating the navigation engine usage.

## 🛠️ Tech Stack

- **Monorepo**: TurboRepo
- **Package Manager**: pnpm
- **Build Tool**: Rollup (engine), Vite (sample app)
- **Language**: TypeScript
- **Frameworks**: Vue 3 (sample app)
- **Code Quality**: ESLint, Prettier

## 📝 License

MIT

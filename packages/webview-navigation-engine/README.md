# webview-navigation-engine

A fully controllable navigation system designed for WebView environments that require app-like back navigation, flow-based routing, and popup priority handling.

## Features

- ✅ Custom navigation engine
- ✅ Flow-based navigation (state machine)
- ✅ Popup priority handling
- ✅ Fullscreen close priority
- ✅ Custom history stack
- ✅ SessionStorage restore
- ✅ Multiple flows at once
- ✅ Framework adapters (Vue 3, React)

## Installation

```bash
npm install webview-navigation-engine
# or
pnpm add webview-navigation-engine
# or
yarn add webview-navigation-engine
```

## Usage

### Core API

```typescript
import { NavigationEngine, NavigationPriority } from "webview-navigation-engine";

const engine = new NavigationEngine();

// Navigate
engine.navigate("/home");
engine.navigate("/profile", { 
  priority: NavigationPriority.POPUP,
  state: { userId: 123 }
});

// Navigation controls
engine.back();
engine.forward();
engine.canGoBack();
engine.canGoForward();

// Get current state
const current = engine.getCurrent();
const history = engine.getHistory();
```

### Vue 3 Adapter

```typescript
import { useNavigationEngine } from "webview-navigation-engine/vue";

export default {
  setup() {
    const { currentEntry, navigate, back, canGoBack } = useNavigationEngine();
    
    return { currentEntry, navigate, back, canGoBack };
  }
}
```

### React Adapter

```typescript
import { useNavigationEngine } from "webview-navigation-engine/react";

function MyComponent() {
  const { currentEntry, navigate, back, canGoBack } = useNavigationEngine();
  
  return (
    <div>
      <p>Current: {currentEntry?.route}</p>
      <button onClick={() => navigate("/home")}>Home</button>
      <button onClick={back} disabled={!canGoBack()}>Back</button>
    </div>
  );
}
```

## License

MIT


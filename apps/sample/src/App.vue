<template>
  <div class="app">
    <header class="header">
      <h1>WebView Navigation Engine</h1>
      <div class="nav-info">
        <p>Current Route: {{ currentRoute }}</p>
        <p>History Length: {{ historyLength }}</p>
      </div>
    </header>

    <main class="main">
      <div class="controls">
        <button @click="handleBack" :disabled="!canGoBack">← Back</button>
        <button @click="handleForward" :disabled="!canGoForward">Forward →</button>
        <button @click="handleClear">Clear History</button>
      </div>

      <div class="routes">
        <h2>Navigation</h2>
        <div class="route-buttons">
          <button @click="navigate('/home')">Home</button>
          <button @click="navigate('/about')">About</button>
          <button @click="navigate('/profile')">Profile</button>
        </div>
      </div>

      <div class="routes">
        <h2>Popups</h2>
        <div class="route-buttons">
          <button
            @click="navigate('/popup1', { priority: NavigationPriority.POPUP })"
            class="popup"
          >
            Popup 1
          </button>
          <button
            @click="navigate('/popup2', { priority: NavigationPriority.POPUP })"
            class="popup"
          >
            Popup 2
          </button>
        </div>
      </div>

      <div class="routes">
        <h2>Fullscreen</h2>
        <div class="route-buttons">
          <button
            @click="navigate('/fullscreen', { priority: NavigationPriority.FULLSCREEN })"
            class="fullscreen"
          >
            Open Fullscreen
          </button>
        </div>
      </div>

      <div class="current-view">
        <h2>Current View</h2>
        <div class="view-content">
          <component :is="currentView" />
        </div>
      </div>

      <div class="history">
        <h2>History Stack</h2>
        <div class="history-list">
          <div
            v-for="(entry, index) in history"
            :key="entry.id"
            class="history-item"
            :class="{ active: index === currentIndex }"
          >
            <span class="index">{{ index }}</span>
            <span class="route">{{ entry.route }}</span>
            <span class="priority">{{ getPriorityLabel(entry.priority) }}</span>
            <span class="timestamp">{{ formatTime(entry.timestamp) }}</span>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, h } from "vue";
import { useNavigationEngine, NavigationPriority } from "webview-navigation-engine/vue";

const {
  currentEntry,
  navigate: navigateEngine,
  back,
  forward,
  canGoBack,
  canGoForward,
  getHistory,
  clearHistory,
} = useNavigationEngine();

const currentRoute = computed(() => currentEntry.value?.route || "/");
const history = computed(() => getHistory());
const currentIndex = computed(() => {
  const current = currentEntry.value;
  if (!current) return -1;
  return history.value.findIndex((entry) => entry.id === current.id);
});
const historyLength = computed(() => history.value.length);

const navigate = (route: string, options?: { priority?: NavigationPriority }) => {
  navigateEngine(route, options);
};

const handleBack = () => {
  back();
};

const handleForward = () => {
  forward();
};

const handleClear = () => {
  clearHistory();
};

const getPriorityLabel = (priority: NavigationPriority) => {
  switch (priority) {
    case NavigationPriority.NORMAL:
      return "NORMAL";
    case NavigationPriority.POPUP:
      return "POPUP";
    case NavigationPriority.FULLSCREEN:
      return "FULLSCREEN";
    default:
      return "UNKNOWN";
  }
};

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString();
};

const currentView = computed(() => {
  const route = currentRoute.value;
  if (route === "/home") {
    return h("div", { class: "view home" }, "🏠 Home Page");
  }
  if (route === "/about") {
    return h("div", { class: "view about" }, "ℹ️ About Page");
  }
  if (route === "/profile") {
    return h("div", { class: "view profile" }, "👤 Profile Page");
  }
  if (route === "/popup1") {
    return h("div", { class: "view popup" }, "📋 Popup 1 Content");
  }
  if (route === "/popup2") {
    return h("div", { class: "view popup" }, "📋 Popup 2 Content");
  }
  if (route === "/fullscreen") {
    return h("div", { class: "view fullscreen" }, "🔲 Fullscreen Modal");
  }
  return h("div", { class: "view default" }, "No view matched");
});
</script>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  background: #2c3e50;
  color: white;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header h1 {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.nav-info {
  display: flex;
  gap: 2rem;
  font-size: 0.9rem;
  opacity: 0.9;
}

.main {
  flex: 1;
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.controls {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
}

.controls button {
  padding: 0.75rem 1.5rem;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.2s;
}

.controls button:hover:not(:disabled) {
  background: #2980b9;
}

.controls button:disabled {
  background: #95a5a6;
  cursor: not-allowed;
}

.routes {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 2rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.routes h2 {
  margin-bottom: 1rem;
  color: #2c3e50;
}

.route-buttons {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.route-buttons button {
  padding: 0.75rem 1.5rem;
  background: #27ae60;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.2s;
}

.route-buttons button:hover {
  background: #229954;
}

.route-buttons button.popup {
  background: #f39c12;
}

.route-buttons button.popup:hover {
  background: #e67e22;
}

.route-buttons button.fullscreen {
  background: #e74c3c;
}

.route-buttons button.fullscreen:hover {
  background: #c0392b;
}

.current-view {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  margin-bottom: 2rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.current-view h2 {
  margin-bottom: 1rem;
  color: #2c3e50;
}

.view-content {
  padding: 2rem;
  background: #ecf0f1;
  border-radius: 4px;
  min-height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.history {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.history h2 {
  margin-bottom: 1rem;
  color: #2c3e50;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.history-item {
  display: grid;
  grid-template-columns: 40px 1fr 100px 120px;
  gap: 1rem;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 4px;
  font-size: 0.9rem;
  transition: background 0.2s;
}

.history-item.active {
  background: #d5e8f7;
  border: 2px solid #3498db;
}

.history-item .index {
  font-weight: bold;
  color: #7f8c8d;
}

.history-item .route {
  font-family: monospace;
  color: #2c3e50;
}

.history-item .priority {
  font-size: 0.8rem;
  color: #7f8c8d;
}

.history-item .timestamp {
  font-size: 0.8rem;
  color: #95a5a6;
}
</style>


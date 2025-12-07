import type {
  NavigationEntry,
  NavigationOptions,
  NavigationPriority,
  NavigationListener,
  FlowConfig,
  NavigationEngineConfig,
} from "./types";

/**
 * Core navigation engine for WebView environments
 * Supports flow-based navigation, priority handling, and custom history stack
 */
export class NavigationEngine {
  private history: NavigationEntry[] = [];
  private currentIndex: number = -1;
  private listeners: Set<NavigationListener> = new Set();
  private flows: Map<string, FlowConfig> = new Map();
  private config: Required<NavigationEngineConfig>;

  constructor(config: NavigationEngineConfig = {}) {
    this.config = {
      enableSessionStorage: config.enableSessionStorage ?? true,
      sessionStorageKey: config.sessionStorageKey ?? "nav-engine-history",
      defaultPriority: config.defaultPriority ?? NavigationPriority.NORMAL,
    };

    if (this.config.enableSessionStorage && typeof window !== "undefined") {
      this.restoreFromSessionStorage();
    }
  }

  /**
   * Navigate to a new route
   */
  navigate(route: string, options: NavigationOptions = {}): void {
    const priority = options.priority ?? this.config.defaultPriority;
    const entry: NavigationEntry = {
      id: this.generateId(),
      route,
      state: options.state,
      priority,
      timestamp: Date.now(),
      flowId: options.flowId,
    };

    if (options.replace && this.history.length > 0) {
      this.history[this.currentIndex] = entry;
    } else if (options.skipHistory) {
      // Just notify listeners without adding to history
      this.notifyListeners(entry);
      return;
    } else {
      // Remove future entries if we're not at the end
      if (this.currentIndex < this.history.length - 1) {
        this.history = this.history.slice(0, this.currentIndex + 1);
      }
      this.history.push(entry);
      this.currentIndex = this.history.length - 1;
    }

    this.notifyListeners(entry);
    this.saveToSessionStorage();
  }

  /**
   * Navigate back in history
   */
  back(): boolean {
    if (this.currentIndex <= 0) {
      return false;
    }

    // Handle priority-based navigation
    const current = this.history[this.currentIndex];
    if (current.priority === NavigationPriority.FULLSCREEN) {
      // Always allow closing fullscreen
      this.currentIndex--;
      const entry = this.history[this.currentIndex];
      this.notifyListeners(entry);
      this.saveToSessionStorage();
      return true;
    }

    if (current.priority === NavigationPriority.POPUP) {
      // Check if we should skip popup or close it
      let targetIndex = this.currentIndex - 1;
      while (
        targetIndex >= 0 &&
        this.history[targetIndex].priority === NavigationPriority.POPUP
      ) {
        targetIndex--;
      }

      if (targetIndex < 0) {
        return false;
      }

      this.currentIndex = targetIndex;
      const entry = this.history[this.currentIndex];
      this.notifyListeners(entry);
      this.saveToSessionStorage();
      return true;
    }

    // Normal navigation
    this.currentIndex--;
    const entry = this.history[this.currentIndex];
    this.notifyListeners(entry);
    this.saveToSessionStorage();
    return true;
  }

  /**
   * Navigate forward in history
   */
  forward(): boolean {
    if (this.currentIndex >= this.history.length - 1) {
      return false;
    }

    this.currentIndex++;
    const entry = this.history[this.currentIndex];
    this.notifyListeners(entry);
    this.saveToSessionStorage();
    return true;
  }

  /**
   * Get current navigation entry
   */
  getCurrent(): NavigationEntry | null {
    if (this.currentIndex < 0 || this.currentIndex >= this.history.length) {
      return null;
    }
    return this.history[this.currentIndex];
  }

  /**
   * Get all history entries
   */
  getHistory(): readonly NavigationEntry[] {
    return [...this.history];
  }

  /**
   * Check if can go back
   */
  canGoBack(): boolean {
    if (this.currentIndex <= 0) {
      return false;
    }

    const current = this.history[this.currentIndex];
    if (current.priority === NavigationPriority.FULLSCREEN) {
      return true;
    }

    if (current.priority === NavigationPriority.POPUP) {
      let targetIndex = this.currentIndex - 1;
      while (
        targetIndex >= 0 &&
        this.history[targetIndex].priority === NavigationPriority.POPUP
      ) {
        targetIndex--;
      }
      return targetIndex >= 0;
    }

    return this.currentIndex > 0;
  }

  /**
   * Check if can go forward
   */
  canGoForward(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  /**
   * Register a flow configuration
   */
  registerFlow(config: FlowConfig): void {
    this.flows.set(config.id, config);
  }

  /**
   * Navigate within a flow
   */
  navigateFlow(flowId: string, state: string, options: Omit<NavigationOptions, "flowId"> = {}): void {
    const flow = this.flows.get(flowId);
    if (!flow) {
      throw new Error(`Flow ${flowId} not found`);
    }

    if (!flow.states[state]) {
      throw new Error(`State ${state} not found in flow ${flowId}`);
    }

    const route = `${flowId}:${state}`;
    this.navigate(route, { ...options, flowId });
  }

  /**
   * Add navigation listener
   */
  addListener(listener: NavigationListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Clear all history
   */
  clearHistory(): void {
    this.history = [];
    this.currentIndex = -1;
    this.saveToSessionStorage();
  }

  /**
   * Remove entries by flow ID
   */
  removeFlowEntries(flowId: string): void {
    this.history = this.history.filter((entry) => entry.flowId !== flowId);
    if (this.currentIndex >= this.history.length) {
      this.currentIndex = this.history.length - 1;
    }
    this.saveToSessionStorage();
  }

  private notifyListeners(entry: NavigationEntry): void {
    this.listeners.forEach((listener) => {
      try {
        listener(entry);
      } catch (error) {
        console.error("Error in navigation listener:", error);
      }
    });
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private saveToSessionStorage(): void {
    if (!this.config.enableSessionStorage || typeof window === "undefined") {
      return;
    }

    try {
      const data = {
        history: this.history,
        currentIndex: this.currentIndex,
      };
      window.sessionStorage.setItem(this.config.sessionStorageKey, JSON.stringify(data));
    } catch (error) {
      console.warn("Failed to save navigation state to sessionStorage:", error);
    }
  }

  private restoreFromSessionStorage(): void {
    if (!this.config.enableSessionStorage || typeof window === "undefined") {
      return;
    }

    try {
      const data = window.sessionStorage.getItem(this.config.sessionStorageKey);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed.history) && typeof parsed.currentIndex === "number") {
          this.history = parsed.history;
          this.currentIndex = parsed.currentIndex;
        }
      }
    } catch (error) {
      console.warn("Failed to restore navigation state from sessionStorage:", error);
    }
  }
}


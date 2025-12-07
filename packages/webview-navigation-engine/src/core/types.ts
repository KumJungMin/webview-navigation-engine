/**
 * Navigation state priority levels
 */
export enum NavigationPriority {
  NORMAL = 0,
  POPUP = 1,
  FULLSCREEN = 2,
}

/**
 * Navigation entry in the history stack
 */
export interface NavigationEntry {
  id: string;
  route: string;
  state?: Record<string, unknown>;
  priority: NavigationPriority;
  timestamp: number;
  flowId?: string;
}

/**
 * Navigation options
 */
export interface NavigationOptions {
  replace?: boolean;
  state?: Record<string, unknown>;
  priority?: NavigationPriority;
  flowId?: string;
  skipHistory?: boolean;
}

/**
 * Flow configuration
 */
export interface FlowConfig {
  id: string;
  initialState: string;
  states: Record<string, {
    next?: string[];
    prev?: string[];
    onEnter?: () => void;
    onExit?: () => void;
  }>;
}

/**
 * Navigation event listener
 */
export type NavigationListener = (entry: NavigationEntry) => void;

/**
 * Navigation engine configuration
 */
export interface NavigationEngineConfig {
  enableSessionStorage?: boolean;
  sessionStorageKey?: string;
  defaultPriority?: NavigationPriority;
}


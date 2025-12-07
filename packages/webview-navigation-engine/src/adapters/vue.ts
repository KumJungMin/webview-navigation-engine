import { ref, type Ref, onUnmounted } from "vue";
import { NavigationEngine, NavigationPriority, type NavigationEntry, type NavigationOptions } from "../core";

/**
 * Vue 3 composable for NavigationEngine
 */
export function useNavigationEngine(config?: Parameters<typeof NavigationEngine.prototype.constructor>[0]) {
  const engine = new NavigationEngine(config);
  const currentEntry: Ref<NavigationEntry | null> = ref(engine.getCurrent());

  // Listen to navigation changes
  const unsubscribe = engine.addListener((entry) => {
    currentEntry.value = entry;
  });

  // Cleanup on unmount
  onUnmounted(() => {
    unsubscribe();
  });

  return {
    engine,
    currentEntry,
    navigate: (route: string, options?: NavigationOptions) => engine.navigate(route, options),
    back: () => engine.back(),
    forward: () => engine.forward(),
    canGoBack: () => engine.canGoBack(),
    canGoForward: () => engine.canGoForward(),
    getCurrent: () => engine.getCurrent(),
    getHistory: () => engine.getHistory(),
    clearHistory: () => engine.clearHistory(),
    registerFlow: (config: Parameters<typeof engine.registerFlow>[0]) => engine.registerFlow(config),
    navigateFlow: (
      flowId: string,
      state: string,
      options?: Omit<NavigationOptions, "flowId">
    ) => engine.navigateFlow(flowId, state, options),
    removeFlowEntries: (flowId: string) => engine.removeFlowEntries(flowId),
    NavigationPriority,
  };
}


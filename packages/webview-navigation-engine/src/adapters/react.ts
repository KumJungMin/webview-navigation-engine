import { useState, useEffect, useCallback } from "react";
import { NavigationEngine, NavigationPriority, type NavigationEntry, type NavigationOptions } from "../core";

/**
 * React hook for NavigationEngine
 */
export function useNavigationEngine(config?: Parameters<typeof NavigationEngine.prototype.constructor>[0]) {
  const [engine] = useState(() => new NavigationEngine(config));
  const [currentEntry, setCurrentEntry] = useState<NavigationEntry | null>(engine.getCurrent());

  useEffect(() => {
    const unsubscribe = engine.addListener((entry) => {
      setCurrentEntry(entry);
    });

    return unsubscribe;
  }, [engine]);

  const navigate = useCallback(
    (route: string, options?: NavigationOptions) => {
      engine.navigate(route, options);
    },
    [engine]
  );

  const back = useCallback(() => {
    return engine.back();
  }, [engine]);

  const forward = useCallback(() => {
    return engine.forward();
  }, [engine]);

  const canGoBack = useCallback(() => {
    return engine.canGoBack();
  }, [engine]);

  const canGoForward = useCallback(() => {
    return engine.canGoForward();
  }, [engine]);

  const getCurrent = useCallback(() => {
    return engine.getCurrent();
  }, [engine]);

  const getHistory = useCallback(() => {
    return engine.getHistory();
  }, [engine]);

  const clearHistory = useCallback(() => {
    engine.clearHistory();
  }, [engine]);

  const registerFlow = useCallback(
    (config: Parameters<typeof engine.registerFlow>[0]) => {
      engine.registerFlow(config);
    },
    [engine]
  );

  const navigateFlow = useCallback(
    (flowId: string, state: string, options?: Omit<NavigationOptions, "flowId">) => {
      engine.navigateFlow(flowId, state, options);
    },
    [engine]
  );

  const removeFlowEntries = useCallback(
    (flowId: string) => {
      engine.removeFlowEntries(flowId);
    },
    [engine]
  );

  return {
    engine,
    currentEntry,
    navigate,
    back,
    forward,
    canGoBack,
    canGoForward,
    getCurrent,
    getHistory,
    clearHistory,
    registerFlow,
    navigateFlow,
    removeFlowEntries,
    NavigationPriority,
  };
}


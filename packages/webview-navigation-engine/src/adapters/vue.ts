/**
 * src/adapters/vue.ts
 */
import type { Router } from "vue-router";
import { navigationEngine, type PageId, type FlowDefinition } from "../core/NavigationEngine";

export interface VueNavigationConfig {
  mainPage: PageId;
  flows?: FlowDefinition[];
}

export function setupNavigationWithVue(router: Router, config: VueNavigationConfig) {
  const { mainPage, flows = [] } = config;
  const pageToPath = new Map<PageId, string>();
  const pathToPage = new Map<string, PageId>();

  // 1. 라우트 매핑
  router.getRoutes().forEach((route) => {
    if (route.name && route.path) {
      const pageId = route.name as PageId;
      pageToPath.set(pageId, route.path);
      pathToPage.set(route.path, pageId);
    }
  });

  // 2. 엔진 초기화
  const currentPath = router.currentRoute.value.path;
  const initialPageId = pathToPage.get(currentPath);
  navigationEngine.setup({ mainPage, flows }, initialPageId);

  // --------------------------------------------------------
  // 브라우저 뒤로가기(popstate) 감지 및 처리
  // --------------------------------------------------------
  let isPopStateProcessing = false;

  window.addEventListener("popstate", () => {
    isPopStateProcessing = true;

    // 현재 상태 기억
    const prevState = navigationEngine.getState();

    // 엔진에게 "뒤로가기" 요청
    navigationEngine.handleBack();

    // 처리 후 상태 확인
    const nextState = navigationEngine.getState();

    // [중요] 엔진이 이동을 막음 (Main Page 등) -> 브라우저 URL 복구
    if (prevState.current === nextState.current) {
      const currentPath = pageToPath.get(nextState.current!);
      if (currentPath) {
        // 뒤로가기 취소 효과 (다시 앞으로 밀어넣음)
        router.push(currentPath);
      }
    }

    // 비동기 틱 후 플래그 해제
    setTimeout(() => {
      isPopStateProcessing = false;
    }, 0);
  });

  // --------------------------------------------------------
  // 엔진 상태 구독 -> 라우터 반영
  // --------------------------------------------------------
  let prevStackLength = navigationEngine.getState().historyStack.length;

  navigationEngine.subscribe((state) => {
    const pageId = state.current;
    if (!pageId) return;

    const targetPath = pageToPath.get(pageId);
    if (!targetPath) {
      console.warn(`[VueAdapter] Missing path for pageId: ${pageId}`);
      return;
    }

    const currentRoutePath = router.currentRoute.value.path;

    // Case 1: 브라우저 뒤로가기로 인한 변경 시
    if (isPopStateProcessing) {
      // 이미 브라우저는 targetPath에 있을 확률이 높음.
      // URL 파라미터나 상태 동기화를 위해 필요 시 replace
      if (currentRoutePath !== targetPath) {
        router.replace(targetPath);
      }
      prevStackLength = state.historyStack.length;
      return;
    }

    // Case 2: 앱 내 이동 (버튼 클릭 등)
    if (currentRoutePath !== targetPath) {
      if (state.historyStack.length > prevStackLength) {
        // 스택 증가 -> push
        router.push(targetPath);
      } else {
        // 스택 감소/유지 -> replace (앱 내 뒤로가기 느낌)
        router.replace(targetPath);
      }
    }

    prevStackLength = state.historyStack.length;
  });

  /** 앱 내 네비게이션 함수 */
  function navigate(pageId: PageId, method: "push" | "replace" = "push") {
    navigationEngine.navigateTo(pageId, { method });
  }

  /** 커스텀 헤더 뒤로가기 버튼용 */
  function goBack() {
    navigationEngine.handleBack();
  }

  return {
    engine: navigationEngine,
    navigate,
    goBack,
  };
}

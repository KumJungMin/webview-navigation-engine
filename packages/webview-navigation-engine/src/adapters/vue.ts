/**
 * [Vue Adapter]
 * NavigationEngine(순수 로직)과 Vue Router(URL/UI)를 연결하는 어댑터입니다.
 *
 * # 핵심 역할:
 * 1. 라우트 매핑: PageId(엔진) <-> URL Path(라우터) 변환
 * 2. 브라우저 뒤로가기 감지: `popstate` 이벤트를 가로채서 엔진의 `handleBack` 실행
 * 3. 엔진 상태 반영: 엔진의 스택 변화(push/pop)를 분석하여 라우터의 `push/replace` 실행
 */

import type { Router } from "vue-router";
import { navigationEngine, type PageId, type FlowDefinition } from "../core/NavigationEngine";

export interface VueNavigationConfig {
  mainPage: PageId; // 시작 페이지 ID (보통 'Home' 등)
  flows?: FlowDefinition[]; // 사용할 플로우 정의
}

/**
 * Vue Router 인스턴스와 네비게이션 설정을 받아 엔진을 초기화하고 연결합니다.
 */
export function setupNavigationWithVue(router: Router, config: VueNavigationConfig) {
  const { mainPage, flows = [] } = config;

  // --------------------------------------------------------
  // 1. 라우트 매핑 (Mapping)
  // 엔진은 'PageId'만 알고, 라우터는 'Path'를 압니다. 둘을 서로 변환할 수 있어야 합니다.
  // --------------------------------------------------------
  const pageToPath = new Map<PageId, string>();
  const pathToPage = new Map<string, PageId>();

  router.getRoutes().forEach((route) => {
    // route.name을 PageId로 사용한다고 가정
    if (route.name && route.path) {
      const pageId = route.name as PageId;
      pageToPath.set(pageId, route.path);
      pathToPage.set(route.path, pageId);
    }
  });

  // --------------------------------------------------------
  // 2. 엔진 초기화 (Setup): 현재 브라우저 URL에 해당하는 페이지로 엔진을 시작합니다.
  // --------------------------------------------------------
  const currentPath = router.currentRoute.value.path;
  const initialPageId = pathToPage.get(currentPath);

  // 엔진에게 시작 페이지와 플로우 정보를 전달하여 초기화합니다.
  navigationEngine.setup({ mainPage, flows }, initialPageId);

  // --------------------------------------------------------
  // 3. 브라우저 뒤로가기 핸들링 (Browser -> Engine)
  // 사용자가 브라우저 뒤로가기 버튼을 눌렀을 때의 동작을 정의합니다.
  // --------------------------------------------------------
  let isPopStateProcessing = false; // 현재 popstate 처리 중인지 확인하는 플래그

  window.addEventListener("popstate", () => {
    isPopStateProcessing = true;

    // A. 현재(이동 전 논리적) 상태 기억
    const prevState = navigationEngine.getState();

    // B. 엔진에게 "뒤로가기 처리해줘" 요청
    // (이때 엔진 내부 스택이 변경되거나, Main 페이지라서 변경이 안 될 수도 있음)
    navigationEngine.handleBack();

    // C. 처리 후 상태 확인
    const nextState = navigationEngine.getState();

    // D. [중요] 엔진이 이동을 막은 경우 (Blocking)
    // 브라우저는 이미 URL이 뒤로 가버렸지만, 엔진은 "Main이라 못 나간다"고 판단하여 state.current가 그대로인 상황.
    if (prevState.current === nextState.current) {
      const currentPath = pageToPath.get(nextState.current!);
      if (currentPath) {
        // "뒤로 간 척" 했던 브라우저를 다시 강제로 앞으로(현재 페이지로) 밀어넣어 원상복구 시킵니다.
        // 사용자 입장에서는 뒤로가기가 안 먹히는 것처럼 보입니다.
        router.push(currentPath);
      }
    }

    // E. 이벤트 루프 틱 이후 플래그 해제
    // (engine.subscribe가 동기적으로 실행되므로, 처리가 끝난 뒤 false로 변경)
    setTimeout(() => {
      isPopStateProcessing = false;
    }, 0);
  });

  // --------------------------------------------------------
  // 4. 엔진 상태 구독 (Engine -> Router)
  // 엔진의 상태가 변하면(navigateTo, handleBack 등) 라우터를 그에 맞게 이동시킵니다.
  // --------------------------------------------------------

  // 스택 길이 변화를 추적하여 push/replace 여부를 결정합니다.
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

    // Case 1: 브라우저 뒤로가기(popstate)에 의해 트리거된 변경인 경우
    if (isPopStateProcessing) {
      // 이미 브라우저는 물리적으로 targetPath에 도달해 있습니다.
      // 굳이 다시 이동할 필요는 없지만, URL 파라미터 동기화 등을 위해 replace로 덮어쓸 수 있습니다.
      if (currentRoutePath !== targetPath) {
        router.replace(targetPath);
      }
      // 스택 길이만 동기화하고 종료
      prevStackLength = state.historyStack.length;
      return;
    }

    // Case 2: 앱 내 로직(버튼 클릭, navigate 함수 호출)에 의한 변경인 경우
    if (currentRoutePath !== targetPath) {
      if (state.historyStack.length > prevStackLength) {
        // [스택 증가] -> 앞으로 가는 동작이므로 router.push (히스토리 쌓임)
        router.push(targetPath);
      } else {
        // [스택 감소/유지] -> 뒤로가기 동작이므로 router.replace
        // *핵심*: 앱 내 뒤로가기 버튼을 눌렀을 때 replace를 사용하면, 브라우저의 '앞으로 가기' 버튼을 비활성화시키는 효과를 낼 수 있어 "앱 같은" 느낌을 줍니다.
        router.replace(targetPath);
      }
    }

    // 다음 비교를 위해 현재 길이 저장
    prevStackLength = state.historyStack.length;
  });

  /**
   * [Helper] 앱 코드에서 사용할 네비게이션 함수
   * router.push 대신 이 함수를 사용해야 엔진과 동기화됩니다.
   */
  function navigate(pageId: PageId, method: "push" | "replace" = "push") {
    navigationEngine.navigateTo(pageId, { method });
  }

  /**
   * [Helper] 커스텀 헤더의 뒤로가기 버튼용 함수
   */
  function goBack() {
    navigationEngine.handleBack();
  }

  return {
    engine: navigationEngine,
    navigate,
    goBack,
  };
}

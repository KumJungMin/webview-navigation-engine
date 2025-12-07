/**
 * =============================================================================
 * [NavigationEngine]
 * "앱처럼 동작하는 네비게이션"을 구현하기 위한 순수 로직 코어입니다.
 *
 * # 설계 목적:
 * 1. UI(React/Vue)와 비즈니스 로직(Flow 규칙)의 분리.
 * 2. 브라우저 히스토리와 별개로 "논리적 히스토리 스택"을 직접 관리.
 * 3. 복잡한 요구사항(플로우 역순 보장, 메인 뒤로가기 방어, 오버레이 우선 닫기) 중앙 처리.
 *
 * # 동작 원리:
 * - 이 엔진은 단순히 상태(State)만 관리합니다.
 * - 실제 화면 이동(URL 변경)은 이 엔진을 구독(subscribe)하는 Adapter가 담당합니다.
 * =============================================================================
 */

/**
 * PageId:
 * - 앱 내의 고유한 페이지 식별자입니다.
 * - Vue의 route.name, React의 path 상수 등을 매핑해서 사용합니다.
 */
export type PageId = string;

/**
 * FlowDefinition:
 * - 결제, 회원가입 등 "순서가 정해진 단계(Step)"를 정의합니다.
 * - 예: ['Input', 'Detail', 'Confirm']
 * - 이 배열에 정의된 순서대로만 이동하며, 뒤로가기 시에도 역순을 따릅니다.
 */
export interface FlowDefinition {
  name: string;
  steps: PageId[];
}

/**
 * NavigationEngineConfig:
 * - 초기 설정 값. 메인 페이지와 앱 내의 모든 플로우를 정의합니다.
 */
export interface NavigationEngineConfig {
  mainPage: PageId;
  flows?: FlowDefinition[];
}

/**
 * Overlay:
 * - 모달, 팝업, 바텀시트 등 "뒤로가기 버튼으로 닫아야 하는 UI" 요소입니다.
 * - 엔진은 UI를 직접 제어하지 않고, onBack 콜백만 호출해줍니다.
 */
export interface Overlay {
  id: string;
  onBack: () => void;
}

/**
 * NavState:
 * - Adapter(Vue/React)가 구독하여 화면을 그릴 때 사용하는 상태 스냅샷입니다.
 */
export interface NavState {
  current: PageId | null; // 현재 보여줘야 할 페이지 ID
  historyStack: PageId[]; // 엔진이 관리하는 논리적 페이지 스택
  overlayStack: Overlay[]; // 떠 있는 오버레이 목록 (LIFO 구조)
}

/**
 * ActiveFlowContext:
 * - 현재 사용자가 "특정 Flow(예: 주문)"를 진행 중일 때 생성되는 실행 컨텍스트입니다.
 */
interface ActiveFlowContext {
  name: string; // Flow 이름
  steps: PageId[]; // Flow 단계 배열
  currentStepIndex: number; // 현재 단계 인덱스 (0, 1, 2...)
  entryPageId: PageId | null; // 이 Flow에 진입하기 직전 페이지 (Main 등)
}

type NavListener = (state: NavState) => void;

/**
 * -----------------------------------------------------------------------------
 * Class: NavigationEngine
 * -----------------------------------------------------------------------------
 */
export class NavigationEngine {
  // 설정 정보
  private mainPage: PageId | null = null;
  private flows: FlowDefinition[] = [];

  // 상태 데이터
  private historyStack: PageId[] = []; // 논리적 방문 기록 (Array Stack)
  private overlayStack: Overlay[] = []; // 오버레이 스택
  private activeFlow: ActiveFlowContext | null = null; // 현재 진행 중인 플로우 정보

  // 구독자 관리
  private listeners = new Set<NavListener>();
  private isInitialized = false;

  // ------------------------------------------------------
  // Public API
  // ------------------------------------------------------
  /**
   * setup: 엔진 초기화
   * - 앱 시작 시 한 번 호출합니다.
   * - 브라우저 URL을 통해 결정된 initialPage를 스택의 시작점으로 잡습니다.
   */
  setup(config: NavigationEngineConfig, initialPage?: PageId) {
    this.mainPage = config.mainPage;
    this.flows = config.flows ?? [];

    const firstPage = initialPage ?? this.mainPage;
    if (!firstPage) throw new Error("NavigationEngine: mainPage required.");

    this.historyStack = [firstPage];
    this.activeFlow = this.createFlowContextForPage(firstPage, null, "push"); // 초기 페이지가 Flow에 속해있을 수 있기에 컨텍스트 생성

    this.isInitialized = true;
    this.notify();
  }

  /**
   * getState: 현재 상태 반환
   * - 불변성을 위해 배열은 복사해서 반환합니다.
   */
  getState(): NavState {
    return {
      current: this.getCurrentPage(),
      historyStack: [...this.historyStack],
      overlayStack: [...this.overlayStack],
    };
  }

  /**
   * subscribe: 상태 변경 구독
   * - Adapter가 이 메서드를 통해 상태 변화를 감지하고 라우터를 이동시킵니다.
   */
  subscribe(listener: NavListener): () => void {
    this.listeners.add(listener);
    listener(this.getState()); // 구독 즉시 현재 상태 전달
    return () => this.listeners.delete(listener);
  }

  /**
   * navigateTo: 페이지 이동 요청
   * @param pageId 이동할 페이지 ID
   * @param options.method
   *  - 'push': 스택에 쌓음 (일반적인 이동)
   *  - 'replace': 현재 스택의 Top을 교체 (리다이렉트 등)
   */
  navigateTo(pageId: PageId, options?: { method?: "push" | "replace" }) {
    this.checkInitialized();

    const method = options?.method ?? "push";
    const prevPage = this.getCurrentPage();
    const isLastReplaceNeeded = method === "replace" && this.historyStack.length > 0;

    if (isLastReplaceNeeded) {
      this.historyStack[this.historyStack.length - 1] = pageId;
    } else {
      this.historyStack.push(pageId);
    }

    // 이동한 페이지에 맞춰 Flow 컨텍스트를 재계산
    this.activeFlow = this.createFlowContextForPage(pageId, prevPage, method);
    this.notify();
  }

  /**
   * openOverlay: 모달/팝업 열기
   * - 스택에 쌓아두고, 뒤로가기 시 이 스택부터 pop 합니다.
   */
  openOverlay(overlay: Overlay) {
    this.overlayStack.push(overlay);
    this.notify();
  }

  /**
   * closeOverlay: 모달/팝업 닫기
   * - id 지정 시 해당 오버레이 제거, 미지정 시 최상단 제거
   */
  closeOverlay(id?: string) {
    if (id) {
      this.overlayStack = this.overlayStack.filter((o) => o.id !== id);
    } else {
      this.overlayStack.pop();
    }
    this.notify();
  }

  /**
   * exitFlow: 플로우 종료 및 초기화
   *
   * [기능 설명]
   * 현재 진행 중인 플로우의 중간 단계를 모두 없애고 "첫 페이지" 상태로 만듭니다.
   * 이때, "어디서 진입했는지(entryPageId)" 정보는 유지하여
   * 초기화된 첫 페이지에서 뒤로가기를 누르면 다시 진입 페이지(Main)로 나갈 수 있게 합니다.
   *
   * [스택 변화 예시]
   * 전: [Main(진입), Input(플로우 첫페이지), Detail, Confirm]
   * 후: [Main, Input]
   */
  exitFlow(flowName?: string) {
    this.checkInitialized();
    if (!this.activeFlow) return;

    // 특정 Flow 이름이 지정된 경우, 현재 Flow와 일치하는지 확인
    const isContainFlow = flowName && this.activeFlow.name !== flowName;
    if (isContainFlow) return;

    const firstStep = this.activeFlow.steps[0];

    while (this.historyStack.length > 0) {
      // 스택 정리 (Clean up):
      // 스택의 위에서부터 현재 Flow에 속한 페이지들을 모두 제거.
      const top = this.historyStack[this.historyStack.length - 1];
      if (this.activeFlow.steps.includes(top)) {
        this.historyStack.pop();
      } else {
        // Flow에 속하지 않는 페이지(예: Main)를 만나면 정지
        break;
      }
    }

    // 첫 스텝을 다시 쌓아 [진입페이지, 첫스텝] 형태로 만듦
    this.historyStack.push(firstStep);

    // Flow 컨텍스트 리셋. 단, entryPageId는 유지됨
    this.activeFlow = { ...this.activeFlow, currentStepIndex: 0 };

    this.notify();
  }

  /**
   * handleBack: 뒤로가기 통합 핸들러
   *
   * [처리 우선순위]
   * 1. Overlay (팝업) -> 닫기
   * 2. Flow 내부 (Step 이동) -> 이전 단계로
   * 3. Main Page -> 차단 (앱 종료 방지 등)
   * 4. 일반 페이지 -> 이전 페이지로 Pop
   */
  handleBack() {
    this.checkInitialized();

    // 1. Overlay 처리
    // 가장 최근에 열린 오버레이가 있다면 그것만 닫고 종료
    const topOverlay = this.overlayStack.pop();
    if (topOverlay) {
      topOverlay.onBack();
      this.notify();
      return;
    }

    const current = this.getCurrentPage();
    if (!current) return;

    // 2. Flow 내부 로직 처리 (별도 메서드 위임)
    // Flow 내에서 처리되었다면(true), 여기서 종료
    if (this.tryHandleFlowBack(current)) {
      this.notify();
      return;
    }

    // 3. Main Page 방어 로직
    // Main에서는 뒤로가기를 해도 스택을 줄이지 않음 (이동 차단)
    // -> Adapter에서 이를 감지하여 브라우저 URL을 다시 복구(Forward) 시켜야 함
    if (current === this.mainPage) {
      return;
    }

    // 4. 일반 페이지 이동
    // 위의 케이스에 해당하지 않으면 단순히 스택 하나를 제거하여 이전으로 이동
    if (this.historyStack.length > 1) {
      this.historyStack.pop();

      const newCurrent = this.getCurrentPage();
      // 이동한 위치에 맞춰 ActiveFlow 재계산 (Flow 밖으로 나갔을 수도 있으므로)
      this.activeFlow = newCurrent
        ? this.createFlowContextForPage(newCurrent, null, "replace")
        : null;

      this.notify();
    }
  }

  // ------------------------------------------------------
  // Internal Helpers
  // ------------------------------------------------------
  /** 현재 스택의 최상단(Top) 페이지 ID 반환 */
  private getCurrentPage(): PageId | null {
    if (this.historyStack.length === 0) return null;
    return this.historyStack[this.historyStack.length - 1];
  }

  /** 특정 페이지 ID가 속한 Flow 정의를 찾음 */
  private findFlowByPage(pageId: PageId | null): FlowDefinition | null {
    if (!pageId) return null;
    return this.flows.find((flow) => flow.steps.includes(pageId)) ?? null;
  }

  /**
   * 페이지 이동 시 호출되어 "현재 내가 Flow 안에 있는가?"를 판단하고 Context를 생성
   */
  private createFlowContextForPage(
    pageId: PageId,
    prevPage: PageId | null,
    method: "push" | "replace"
  ): ActiveFlowContext | null {
    const flow = this.findFlowByPage(pageId);
    // Flow에 속하지 않은 일반 페이지
    if (!flow) return null;

    const index = flow.steps.indexOf(pageId);

    // Case A: 이미 같은 Flow를 진행 중일 때 (단계 이동)
    const isSameFlow = this.activeFlow && this.activeFlow.name === flow.name;
    if (isSameFlow) {
      return { ...this.activeFlow, steps: flow.steps, currentStepIndex: index };
    }

    // Case B: 새로운 Flow 진입
    // push로 진입했다면 이전 페이지(prevPage)가 곧 진입점(entryPage)이 됨
    const entryPageId = method === "push" ? prevPage : null;
    return {
      name: flow.name,
      steps: flow.steps,
      currentStepIndex: index,
      entryPageId,
    };
  }

  /**
   * Flow 내부에서의 뒤로가기 처리 로직
   * 리턴값: 처리를 했으면 true, 아니면 false
   */
  private tryHandleFlowBack(current: PageId): boolean {
    const ctx = this.activeFlow;

    // 현재 페이지가 활성 Flow의 단계가 아니면 무시
    if (!ctx || !ctx.steps.includes(current)) return false;

    const idx = ctx.steps.indexOf(current);
    if (idx < 0) return false;

    // Case 1: Flow 중간 단계 (예: Detail -> Input)
    // 이전 단계로 돌아가야 하므로 스택을 Pop 합니다.
    if (idx > 0) {
      this.historyStack.pop();
      this.activeFlow = { ...ctx, currentStepIndex: idx - 1 };
      return true;
    }

    // Case 2: Flow 첫 단계 (예: Input)
    if (idx === 0) {
      // 2-A. 진입 페이지(Entry)가 기록되어 있는 경우 -> Main으로 탈출
      // [Main, Input] 상태에서 pop -> [Main]
      if (ctx.entryPageId) {
        this.historyStack.pop();
        this.activeFlow = null; // Flow 종료
        return true;
      }
      // 2-B. 진입 페이지 정보가 없는 경우 (새로고침 직후 등)
      // Main에서의 동작처럼 막거나, 현상 유지를 합니다.
      return true;
    }

    return false;
  }

  private notify() {
    const snapshot = this.getState();
    this.listeners.forEach((fn) => fn(snapshot));
  }

  private checkInitialized() {
    if (!this.isInitialized) throw new Error("NavigationEngine not setup.");
  }
}

export const navigationEngine = new NavigationEngine();

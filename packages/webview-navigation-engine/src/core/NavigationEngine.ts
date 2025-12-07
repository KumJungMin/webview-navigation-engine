/**
 * src/core/NavigationEngine.ts
 */

export type PageId = string;

export interface FlowDefinition {
  name: string;
  steps: PageId[];
}

export interface NavigationEngineConfig {
  mainPage: PageId;
  flows?: FlowDefinition[];
}

export interface Overlay {
  id: string;
  onBack: () => void;
}

export interface NavState {
  current: PageId | null;
  historyStack: PageId[];
  overlayStack: Overlay[];
}

interface ActiveFlowContext {
  name: string;
  steps: PageId[];
  currentStepIndex: number;
  entryPageId: PageId | null;
  lockFirstStepBack: boolean;
}

type NavListener = (state: NavState) => void;

export class NavigationEngine {
  private mainPage: PageId | null = null;
  private flows: FlowDefinition[] = [];
  private historyStack: PageId[] = [];
  private overlayStack: Overlay[] = [];
  private activeFlow: ActiveFlowContext | null = null;
  private listeners = new Set<NavListener>();
  private isInitialized = false;

  // ------------------------------------------------------
  // Public API
  // ------------------------------------------------------

  setup(config: NavigationEngineConfig, initialPage?: PageId) {
    this.mainPage = config.mainPage;
    this.flows = config.flows ?? [];

    const firstPage = initialPage ?? this.mainPage;
    if (!firstPage) throw new Error("NavigationEngine: mainPage required.");

    this.historyStack = [firstPage];
    this.activeFlow = this.createFlowContextForPage(firstPage, null, "push");
    this.isInitialized = true;
    this.notify();
  }

  getState(): NavState {
    return {
      current: this.getCurrentPage(),
      historyStack: [...this.historyStack],
      overlayStack: [...this.overlayStack],
    };
  }

  subscribe(listener: NavListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  navigateTo(pageId: PageId, options?: { method?: "push" | "replace" }) {
    this.ensureInitialized();
    const method = options?.method ?? "push";
    const prevPage = this.getCurrentPage();

    if (method === "replace" && this.historyStack.length > 0) {
      this.historyStack[this.historyStack.length - 1] = pageId;
    } else {
      this.historyStack.push(pageId);
    }

    this.activeFlow = this.createFlowContextForPage(pageId, prevPage, method);
    this.notify();
  }

  openOverlay(overlay: Overlay) {
    this.overlayStack.push(overlay);
    this.notify();
  }

  closeOverlay(id?: string) {
    if (id) {
      this.overlayStack = this.overlayStack.filter((o) => o.id !== id);
    } else {
      this.overlayStack.pop();
    }
    this.notify();
  }

  /**
   * exitFlow:
   * 플로우를 초기화하고 첫 페이지로 이동합니다.
   * - entryPageId를 유지하여, 초기화 후 뒤로가기 시 진입 페이지(Main)로 돌아갑니다.
   */
  exitFlow(flowName?: string) {
    this.ensureInitialized();
    if (!this.activeFlow) return;
    if (flowName && this.activeFlow.name !== flowName) return;

    const firstStep = this.activeFlow.steps[0];

    // 스택 정리: 현재 Flow에 속한 페이지들을 스택에서 제거
    // 예: [Main, Input, Detail] -> [Main]
    while (this.historyStack.length > 0) {
      const top = this.historyStack[this.historyStack.length - 1];
      if (this.activeFlow.steps.includes(top)) {
        this.historyStack.pop();
      } else {
        break;
      }
    }

    // 첫 스텝 다시 푸시 -> [Main, Input]
    this.historyStack.push(firstStep);

    // 컨텍스트 리셋 (entryPageId 유지)
    this.activeFlow = {
      ...this.activeFlow,
      currentStepIndex: 0,
      lockFirstStepBack: false, // 뒤로가기 잠금 해제 (Main으로 갈 수 있게)
    };

    this.notify();
  }

  /**
   * handleBack:
   * 뒤로가기 로직의 핵심 진입점
   */
  handleBack() {
    this.ensureInitialized();

    // 1. Overlay 우선 닫기
    const topOverlay = this.overlayStack.pop();
    if (topOverlay) {
      topOverlay.onBack();
      this.notify();
      return;
    }

    const current = this.getCurrentPage();
    if (!current) return;

    // 2. Flow 내부 로직
    if (this.tryHandleFlowBack(current)) {
      this.notify();
      return;
    }

    // 3. Main Page 방어 (이동하지 않음 -> Adapter가 URL 복구)
    if (current === this.mainPage) {
      // console.log("Blocked back on Main Page");
      return;
    }

    // 4. 일반 페이지 Pop
    if (this.historyStack.length > 1) {
      this.historyStack.pop();

      const newCurrent = this.getCurrentPage();
      // 일반 이동 시 activeFlow 재계산 (Flow 밖으로 나가는 경우 등 고려)
      this.activeFlow = newCurrent
        ? this.createFlowContextForPage(newCurrent, null, "replace")
        : null;

      this.notify();
    }
  }

  // ------------------------------------------------------
  // Internal Helpers
  // ------------------------------------------------------

  private getCurrentPage(): PageId | null {
    if (this.historyStack.length === 0) return null;
    return this.historyStack[this.historyStack.length - 1];
  }

  private findFlowByPage(pageId: PageId | null): FlowDefinition | null {
    if (!pageId) return null;
    return this.flows.find((flow) => flow.steps.includes(pageId)) ?? null;
  }

  private createFlowContextForPage(
    pageId: PageId,
    prevPage: PageId | null,
    method: "push" | "replace"
  ): ActiveFlowContext | null {
    const flow = this.findFlowByPage(pageId);
    if (!flow) return null;

    const index = flow.steps.indexOf(pageId);

    // Flow 유지
    if (this.activeFlow && this.activeFlow.name === flow.name) {
      return { ...this.activeFlow, steps: flow.steps, currentStepIndex: index };
    }

    // 새 Flow 진입
    const entryPageId = method === "push" ? prevPage : null;
    return {
      name: flow.name,
      steps: flow.steps,
      currentStepIndex: index,
      entryPageId,
      lockFirstStepBack: false,
    };
  }

  private tryHandleFlowBack(current: PageId): boolean {
    const ctx = this.activeFlow;
    if (!ctx || !ctx.steps.includes(current)) return false;

    const idx = ctx.steps.indexOf(current);
    if (idx < 0) return false;

    // Case 1: Flow 중간 (Detail -> Input)
    if (idx > 0) {
      this.historyStack.pop(); // Stack Pop 필수
      this.activeFlow = { ...ctx, currentStepIndex: idx - 1 };
      return true;
    }

    // Case 2: Flow 첫 페이지 (Input)
    if (idx === 0) {
      if (ctx.lockFirstStepBack) return true; // 막힘

      // 진입 페이지가 있다면 거기로 복귀
      if (ctx.entryPageId) {
        this.historyStack.pop(); // [Main, Input] -> [Main]
        this.activeFlow = null; // Flow 종료
        return true;
      }

      return true; // 갈 곳 없으면 현상 유지
    }

    return false;
  }

  private notify() {
    const snapshot = this.getState();
    this.listeners.forEach((fn) => fn(snapshot));
  }

  private ensureInitialized() {
    if (!this.isInitialized) throw new Error("NavigationEngine not setup.");
  }
}

export const navigationEngine = new NavigationEngine();

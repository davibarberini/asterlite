export type TutorialTargetId =
  | 'submenu-toggle'
  | 'nav-upgrades'
  | 'upgrade-affordable';

export type TutorialFlowId = 'first-upgrade';

export type TutorialStep = {
  id: string;
  targetId: TutorialTargetId;
  padding: number;
};

export type TutorialFlow = {
  id: TutorialFlowId;
  steps: TutorialStep[];
};

const storageKey = 'asteridle.tutorial.completedFlows';
const svgNamespace = 'http://www.w3.org/2000/svg';

export class TutorialGuideController {
  private readonly root: HTMLElement;
  private readonly svg: SVGSVGElement;
  private readonly maskRect: SVGRectElement;
  private readonly shadeRect: SVGRectElement;
  private readonly hole: SVGCircleElement;
  private readonly pulse: HTMLDivElement;
  private activeFlow: TutorialFlow | null = null;
  private activeStepIndex = 0;
  private animationFrame: number | null = null;
  private target: HTMLElement | null = null;

  constructor(private readonly mountRoot: HTMLElement = document.body) {
    this.root = document.createElement('div');
    this.root.className = 'tutorial-guide is-hidden';
    this.root.setAttribute('aria-hidden', 'true');

    this.svg = document.createElementNS(svgNamespace, 'svg');
    this.svg.classList.add('tutorial-guide__shade');
    this.svg.setAttribute('aria-hidden', 'true');

    const defs = document.createElementNS(svgNamespace, 'defs');
    const mask = document.createElementNS(svgNamespace, 'mask');
    mask.setAttribute('id', 'tutorial-guide-mask');
    mask.setAttribute('maskUnits', 'userSpaceOnUse');

    this.maskRect = document.createElementNS(svgNamespace, 'rect');
    this.maskRect.setAttribute('fill', 'white');
    this.hole = document.createElementNS(svgNamespace, 'circle');
    this.hole.setAttribute('fill', 'black');
    mask.append(this.maskRect, this.hole);
    defs.append(mask);

    this.shadeRect = document.createElementNS(svgNamespace, 'rect');
    this.shadeRect.setAttribute('fill', 'rgba(0, 0, 0, 0.68)');
    this.shadeRect.setAttribute('mask', 'url(#tutorial-guide-mask)');
    this.svg.append(defs, this.shadeRect);

    this.pulse = document.createElement('div');
    this.pulse.className = 'tutorial-guide__pulse';
    this.root.append(this.svg, this.pulse);
    this.root.addEventListener('pointerdown', this.handlePointerDown, { capture: true });
    this.mountRoot.append(this.root);
  }

  destroy(): void {
    this.stopTrackingTarget();
    this.root.removeEventListener('pointerdown', this.handlePointerDown, { capture: true });
    this.root.remove();
  }

  isActive(): boolean {
    return this.activeFlow !== null;
  }

  hasCompleted(flowId: TutorialFlowId): boolean {
    return this.getCompletedFlowIds().includes(flowId);
  }

  start(flow: TutorialFlow): void {
    if (this.activeFlow || this.hasCompleted(flow.id) || flow.steps.length <= 0) {
      return;
    }

    this.activeFlow = flow;
    this.activeStepIndex = 0;
    this.root.classList.remove('is-hidden');
    this.root.setAttribute('aria-hidden', 'false');
    this.trackTarget();
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (!this.activeFlow) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    if (!this.target || !this.isPointerInsideCurrentHole(event)) {
      return;
    }

    const target = this.target;
    this.advance();
    target.click();
  };

  private advance(): void {
    if (!this.activeFlow) {
      return;
    }

    this.activeStepIndex += 1;
    if (this.activeStepIndex < this.activeFlow.steps.length) {
      this.target = null;
      return;
    }

    const completedFlowId = this.activeFlow.id;
    this.activeFlow = null;
    this.target = null;
    this.root.classList.add('is-hidden');
    this.root.setAttribute('aria-hidden', 'true');
    this.saveCompletedFlow(completedFlowId);
  }

  private trackTarget(): void {
    this.stopTrackingTarget();

    const update = (): void => {
      this.updateTargetHighlight();
      if (this.activeFlow) {
        this.animationFrame = window.requestAnimationFrame(update);
      }
    };
    update();
  }

  private stopTrackingTarget(): void {
    if (this.animationFrame !== null) {
      window.cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  private updateTargetHighlight(): void {
    const step = this.getActiveStep();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    this.maskRect.setAttribute('width', viewportWidth.toString());
    this.maskRect.setAttribute('height', viewportHeight.toString());
    this.shadeRect.setAttribute('width', viewportWidth.toString());
    this.shadeRect.setAttribute('height', viewportHeight.toString());
    this.svg.setAttribute('viewBox', `0 0 ${viewportWidth} ${viewportHeight}`);

    if (!step) {
      return;
    }

    this.target = this.findTarget(step.targetId);
    if (!this.target) {
      this.root.classList.add('is-waiting');
      return;
    }

    this.root.classList.remove('is-waiting');
    const circle = this.getTargetCircle(this.target, step.padding);
    this.hole.setAttribute('cx', circle.x.toString());
    this.hole.setAttribute('cy', circle.y.toString());
    this.hole.setAttribute('r', circle.radius.toString());
    this.pulse.style.left = `${circle.x - circle.radius}px`;
    this.pulse.style.top = `${circle.y - circle.radius}px`;
    this.pulse.style.width = `${circle.radius * 2}px`;
    this.pulse.style.height = `${circle.radius * 2}px`;
  }

  private getActiveStep(): TutorialStep | null {
    return this.activeFlow?.steps[this.activeStepIndex] ?? null;
  }

  private findTarget(targetId: TutorialTargetId): HTMLElement | null {
    const element = document.querySelector<HTMLElement>(`[data-tutorial-target="${targetId}"]`);
    if (!element || !this.isElementTargetable(element)) {
      return null;
    }
    return element;
  }

  private isElementTargetable(element: HTMLElement): boolean {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 0 &&
      rect.height > 0 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.pointerEvents !== 'none';
  }

  private getTargetCircle(target: HTMLElement, padding: number): { x: number; y: number; radius: number } {
    const rect = target.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      radius: Math.max(rect.width, rect.height) / 2 + padding
    };
  }

  private isPointerInsideCurrentHole(event: PointerEvent): boolean {
    const step = this.getActiveStep();
    if (!step || !this.target) {
      return false;
    }

    const circle = this.getTargetCircle(this.target, step.padding);
    return Math.hypot(event.clientX - circle.x, event.clientY - circle.y) <= circle.radius;
  }

  private getCompletedFlowIds(): TutorialFlowId[] {
    try {
      const parsed: unknown = JSON.parse(window.localStorage.getItem(storageKey) ?? '[]');
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.filter((id): id is TutorialFlowId => id === 'first-upgrade');
    } catch {
      return [];
    }
  }

  private saveCompletedFlow(flowId: TutorialFlowId): void {
    try {
      const completed = new Set<TutorialFlowId>(this.getCompletedFlowIds());
      completed.add(flowId);
      window.localStorage.setItem(storageKey, JSON.stringify([...completed]));
    } catch {
      // Tutorial completion is best-effort; gameplay should never depend on it.
    }
  }
}

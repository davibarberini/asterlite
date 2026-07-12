export type TutorialTargetId =
  | 'submenu-toggle'
  | 'nav-upgrades'
  | 'upgrade-affordable'
  | 'nav-map'
  | 'zone-node-unlocked'
  | 'nav-skills';

export type TutorialFlowId = 'first-upgrade' | 'zone-travel' | 'first-skill-point';

export type TutorialStep = {
  id: string;
  targetId: TutorialTargetId;
  padding: number;
  shape?: 'circle' | 'rect';
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
  private readonly circleHole: SVGCircleElement;
  private readonly rectHole: SVGRectElement;
  private readonly pulse: HTMLDivElement;
  private activeFlow: TutorialFlow | null = null;
  private activeStepIndex = 0;
  private animationFrame: number | null = null;
  private target: HTMLElement | null = null;
  private targetSelector: string | null = null;
  private missingTargetSince: number | null = null;

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
    this.circleHole = document.createElementNS(svgNamespace, 'circle');
    this.circleHole.setAttribute('fill', 'black');
    this.rectHole = document.createElementNS(svgNamespace, 'rect');
    this.rectHole.setAttribute('fill', 'black');
    this.rectHole.setAttribute('rx', '8');
    mask.append(this.maskRect, this.circleHole, this.rectHole);
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
    this.missingTargetSince = null;
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
    const targetSelector = this.targetSelector;
    this.advance();
    this.clickTargetAfterOverlayUpdate(target, targetSelector);
  };

  private advance(): void {
    if (!this.activeFlow) {
      return;
    }

    this.activeStepIndex += 1;
    this.missingTargetSince = null;
    this.targetSelector = null;
    if (this.activeStepIndex < this.activeFlow.steps.length) {
      this.target = null;
      return;
    }

    const completedFlowId = this.activeFlow.id;
    this.activeFlow = null;
    this.target = null;
    this.missingTargetSince = null;
    this.targetSelector = null;
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
      this.circleHole.style.display = 'none';
      this.rectHole.style.display = 'none';
      this.missingTargetSince ??= performance.now();
      if (performance.now() - this.missingTargetSince > 1400) {
        this.cancelActiveFlow();
      }
      return;
    }

    this.root.classList.remove('is-waiting');
    this.missingTargetSince = null;
    this.targetSelector = this.getTargetSelector(step.targetId);
    const highlight = this.getTargetHighlight(this.target, step);
    this.circleHole.style.display = highlight.shape === 'circle' ? '' : 'none';
    this.rectHole.style.display = highlight.shape === 'rect' ? '' : 'none';
    this.pulse.classList.toggle('tutorial-guide__pulse--rect', highlight.shape === 'rect');

    if (highlight.shape === 'circle') {
      this.circleHole.setAttribute('cx', highlight.x.toString());
      this.circleHole.setAttribute('cy', highlight.y.toString());
      this.circleHole.setAttribute('r', highlight.radius.toString());
      this.pulse.style.left = `${highlight.x - highlight.radius}px`;
      this.pulse.style.top = `${highlight.y - highlight.radius}px`;
      this.pulse.style.width = `${highlight.radius * 2}px`;
      this.pulse.style.height = `${highlight.radius * 2}px`;
      return;
    }

    this.rectHole.setAttribute('x', highlight.x.toString());
    this.rectHole.setAttribute('y', highlight.y.toString());
    this.rectHole.setAttribute('width', highlight.width.toString());
    this.rectHole.setAttribute('height', highlight.height.toString());
    this.pulse.style.left = `${highlight.x}px`;
    this.pulse.style.top = `${highlight.y}px`;
    this.pulse.style.width = `${highlight.width}px`;
    this.pulse.style.height = `${highlight.height}px`;
  }

  private getActiveStep(): TutorialStep | null {
    return this.activeFlow?.steps[this.activeStepIndex] ?? null;
  }

  private findTarget(targetId: TutorialTargetId): HTMLElement | null {
    const element = document.querySelector<HTMLElement>(this.getTargetSelector(targetId));
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

  private getTargetHighlight(
    target: HTMLElement,
    step: TutorialStep
  ): { shape: 'circle'; x: number; y: number; radius: number } | { shape: 'rect'; x: number; y: number; width: number; height: number } {
    const rect = target.getBoundingClientRect();
    if (step.shape === 'rect') {
      return {
        shape: 'rect',
        x: rect.left - step.padding,
        y: rect.top - step.padding,
        width: rect.width + step.padding * 2,
        height: rect.height + step.padding * 2
      };
    }

    return {
      shape: 'circle',
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
      radius: Math.max(rect.width, rect.height) / 2 + step.padding
    };
  }

  private isPointerInsideCurrentHole(event: PointerEvent): boolean {
    const step = this.getActiveStep();
    if (!step || !this.target) {
      return false;
    }

    const highlight = this.getTargetHighlight(this.target, step);
    if (highlight.shape === 'circle') {
      return Math.hypot(event.clientX - highlight.x, event.clientY - highlight.y) <= highlight.radius;
    }

    return event.clientX >= highlight.x &&
      event.clientX <= highlight.x + highlight.width &&
      event.clientY >= highlight.y &&
      event.clientY <= highlight.y + highlight.height;
  }

  private getCompletedFlowIds(): TutorialFlowId[] {
    try {
      const parsed: unknown = JSON.parse(window.localStorage.getItem(storageKey) ?? '[]');
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.filter(
        (id): id is TutorialFlowId => id === 'first-upgrade' || id === 'zone-travel' || id === 'first-skill-point'
      );
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

  private cancelActiveFlow(): void {
    this.activeFlow = null;
    this.target = null;
    this.missingTargetSince = null;
    this.targetSelector = null;
    this.root.classList.add('is-hidden');
    this.root.setAttribute('aria-hidden', 'true');
  }

  private clickTargetAfterOverlayUpdate(target: HTMLElement, targetSelector: string | null): void {
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        const nextTarget = document.contains(target)
          ? target
          : (targetSelector ? document.querySelector<HTMLElement>(targetSelector) : null);
        if (!nextTarget || nextTarget.getAttribute('aria-hidden') === 'true' || !this.isElementTargetable(nextTarget)) {
          return;
        }
        nextTarget.click();
      }, 0);
    });
  }

  private getTargetSelector(targetId: TutorialTargetId): string {
    return `[data-tutorial-target="${targetId}"]`;
  }
}

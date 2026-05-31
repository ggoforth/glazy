// types/glazy.d.ts
export type ColorInput = number | string;
export type Shape = 'ring' | 'bar' | 'old-fashioned' | 'cruller';
export type Topping = 'sprinkles' | 'nuts' | 'coconut' | 'none';
export type FrostFinish = 'glaze' | 'frosting' | 'plain' | 'none';

export interface BehaviorSpin { enabled?: boolean; speed?: number; direction?: 1 | -1; }
export interface BehaviorOsc { enabled?: boolean; amplitude?: number; speed?: number; }
export interface BehaviorLean { enabled?: boolean; strength?: number; ease?: number; source?: 'window' | 'element'; }
export interface MotionOptions {
  spin?: boolean | BehaviorSpin;
  wobble?: boolean | BehaviorOsc;
  bob?: boolean | BehaviorOsc;
  lean?: boolean | BehaviorLean;
}

export interface DonutOptions {
  three?: unknown;
  shape?: Shape;
  preset?: string;
  dough?: ColorInput;
  frost?: ColorInput;
  frostFinish?: FrostFinish;
  frostRoughness?: number;
  frostClearcoat?: number;
  glazeTextureScale?: number;
  doughRoughness?: number;
  doughGrain?: number;
  crust?: boolean | number;
  fillLight?: ColorInput;
  topping?: Topping;
  sprinkleColors?: ColorInput[];
  nutColors?: ColorInput[];
  coconutColors?: ColorInput[];
  toppingCount?: number;
  zoom?: number;
  motion?: MotionOptions;
  spinSpeed?: number;
  wobble?: boolean;
  mouseLean?: boolean;
  reducedMotion?: 'auto' | boolean;
  pixelRatioCap?: number;
  seed?: number | null;
  materials?: Record<string, unknown>;
}

export class DonutRenderer {
  constructor(target: Element | string, options?: DonutOptions);
  readonly ok: boolean;
  setOptions(patch: DonutOptions): void;
  screenshot(): string | null;
  destroy(): void;
}

export function autoInit(selector?: string, options?: DonutOptions): DonutRenderer[];
export const presets: Record<string, DonutOptions>;
export const version: string;

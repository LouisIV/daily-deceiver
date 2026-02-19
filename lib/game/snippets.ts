import type { LayoutType } from "./types";
import { LAYOUTS } from "./types";

export function getLayout(index: number): LayoutType {
  return LAYOUTS[index % LAYOUTS.length];
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

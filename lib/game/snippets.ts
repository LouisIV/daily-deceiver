import type { LayoutType, Snippet } from "./types";
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

const MIN_REALS = 2; // Minimum real snippets required in any game

export function selectRoundsWithMinReals(
  snippets: Snippet[],
  total: number,
  getLayoutFn: (index: number) => LayoutType
): (Snippet & { layout: LayoutType })[] {
  // Separate reals and fakes
  const reals = snippets.filter((s) => s.real);
  const fakes = snippets.filter((s) => !s.real);
  
  // Calculate how many we need
  const minRealsToTake = Math.min(MIN_REALS, reals.length, total);
  const remainingSlots = total - minRealsToTake;
  
  // Take minimum required reals first
  const selectedReals = shuffle(reals).slice(0, minRealsToTake);
  
  // Fill remaining slots with random mix of remaining reals and fakes
  const remainingReals = reals.filter((r) => !selectedReals.includes(r));
  const remainingPool = shuffle([...remainingReals, ...fakes]);
  const fillCount = Math.min(remainingSlots, remainingPool.length);
  const selectedFill = remainingPool.slice(0, fillCount);
  
  // Combine and shuffle final selection
  const finalSelection = shuffle([...selectedReals, ...selectedFill]);
  
  // Add layouts
  return finalSelection.map((snippet, index) => ({
    ...snippet,
    layout: getLayoutFn(index),
  }));
}

/**
 * Preload an image in the background
 * Returns a promise that resolves when the image is loaded
 */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to preload image: ${src}`));
    img.src = src;
  });
}

/**
 * Preload multiple images in parallel
 */
export function preloadImages(srcs: string[]): Promise<void> {
  return Promise.all(srcs.map(preloadImage)).then(() => undefined);
}

export type Rectangle = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function bitmapToRectangles(bitmap: Uint8Array, width: number, height: number): Rectangle[] {
  const rectangles: Rectangle[] = [];
  const visited = new Uint8Array(bitmap.length);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (bitmap[idx] === 1 && visited[idx] === 0) {
        // Find maximal rectangle starting at (x, y)
        let rectWidth = 0;
        while (x + rectWidth < width && bitmap[y * width + (x + rectWidth)] === 1 && visited[y * width + (x + rectWidth)] === 0) {
          rectWidth++;
        }
        
        let rectHeight = 1;
        outer: while (y + rectHeight < height) {
          for (let dx = 0; dx < rectWidth; dx++) {
            if (bitmap[(y + rectHeight) * width + (x + dx)] === 0 || visited[(y + rectHeight) * width + (x + dx)] === 1) {
              break outer;
            }
          }
          rectHeight++;
        }
        
        // Mark as visited
        for (let dy = 0; dy < rectHeight; dy++) {
          for (let dx = 0; dx < rectWidth; dx++) {
            visited[(y + dy) * width + (x + dx)] = 1;
          }
        }
        
        rectangles.push({ x, y, width: rectWidth, height: rectHeight });
      }
    }
  }
  
  return rectangles;
}

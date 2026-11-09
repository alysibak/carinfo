/**
 * Taking from the camera's picture what the VIN readers read: the part inside
 * the guide on screen, at the camera's full resolution, made larger. The whole
 * frame gave the barcode reader a small, distant barcode and the character
 * reader a page of everything else. (Readying its pixels: vinPixels.)
 */

/**
 * How the camera's picture sits in the box it is shown in: scaled to fill
 * it and cut at the sides or top (object-cover). Null before it has a picture.
 */
function coverFit(video: { videoWidth: number; videoHeight: number }, shown: DOMRect) {
  const { videoWidth: vw, videoHeight: vh } = video;
  if (!vw || !vh || !shown.width || !shown.height) return null;
  const scale = Math.max(shown.width / vw, shown.height / vh);
  return {
    vw,
    vh,
    scale,
    left: shown.left + (shown.width - vw * scale) / 2,
    top: shown.top + (shown.height - vh * scale) / 2,
  };
}

/** Where on the camera's own picture a box drawn over the video sits. */
export function guideCrop(
  video: { videoWidth: number; videoHeight: number },
  shown: DOMRect,
  guide: DOMRect,
  /** A margin round the box, as a share of its size: a VIN at its edge is still read. */
  margin = 0.12,
): { x: number; y: number; width: number; height: number } | null {
  const fit = coverFit(video, shown);
  if (!fit) return null;
  const left = (guide.left - fit.left) / fit.scale;
  const top = (guide.top - fit.top) / fit.scale;
  const width = guide.width / fit.scale;
  const height = guide.height / fit.scale;
  // Each edge moved out by the margin, then kept inside the picture.
  const x = Math.max(0, left - width * margin);
  const y = Math.max(0, top - height * margin);
  const right = Math.min(fit.vw, left + width * (1 + margin));
  const bottom = Math.min(fit.vh, top + height * (1 + margin));
  if (right <= x || bottom <= y) return null;
  return { x, y, width: right - x, height: bottom - y };
}

/**
 * Where a point on screen falls on the camera's own picture, as shares of
 * its width and height (what a camera is told to focus on). Null off it.
 */
export function videoPoint(
  video: { videoWidth: number; videoHeight: number },
  shown: DOMRect,
  clientX: number,
  clientY: number,
): { x: number; y: number } | null {
  const fit = coverFit(video, shown);
  if (!fit) return null;
  const x = (clientX - fit.left) / fit.scale / fit.vw;
  const y = (clientY - fit.top) / fit.scale / fit.vh;
  if (x < 0 || x > 1 || y < 0 || y > 1) return null;
  return { x, y };
}

/** How large a picture is, whatever kind it is. */
function sizeOf(source: CanvasImageSource): { width: number; height: number } {
  if (source instanceof HTMLVideoElement) {
    return { width: source.videoWidth, height: source.videoHeight };
  }
  const { width, height } = source as {
    width: number | SVGAnimatedLength;
    height: number | SVGAnimatedLength;
  };
  return {
    width: typeof width === 'number' ? width : width.baseVal.value,
    height: typeof height === 'number' ? height : height.baseVal.value,
  };
}

/**
 * A region of an image drawn onto a canvas of the given width; turned about
 * its middle where `slant` is given, so print rising to the right at that
 * many degrees comes out level. Turned as it is drawn from the picture
 * itself, at its full size: turning pixels already made smaller blurred
 * small print past reading.
 */
export function drawRegion(
  source: CanvasImageSource,
  region: { x: number; y: number; width: number; height: number },
  width: number,
  canvas: HTMLCanvasElement = document.createElement('canvas'),
  slant = 0,
): HTMLCanvasElement {
  const height = Math.max(1, Math.round((region.height / region.width) * width));
  canvas.width = Math.round(width);
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return canvas;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(
    source,
    region.x,
    region.y,
    region.width,
    region.height,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  if (!slant) return canvas;
  // Over the region as it is (which fills any corner the turn brings in from
  // beyond the picture), the region turned: only as much of the picture as the
  // turn needs is drawn.
  const radians = (slant * Math.PI) / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  const middleX = region.x + region.width / 2;
  const middleY = region.y + region.height / 2;
  const reachX = (region.width * cos + region.height * sin) / 2;
  const reachY = (region.width * sin + region.height * cos) / 2;
  const size = sizeOf(source);
  const left = Math.max(0, middleX - reachX);
  const top = Math.max(0, middleY - reachY);
  const right = Math.min(size.width, middleX + reachX);
  const bottom = Math.min(size.height, middleY + reachY);
  const scale = canvas.width / region.width;
  context.save();
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate(radians);
  context.scale(scale, scale);
  context.drawImage(
    source,
    left,
    top,
    right - left,
    bottom - top,
    left - middleX,
    top - middleY,
    right - left,
    bottom - top,
  );
  context.restore();
  return canvas;
}

/** A canvas's pixels, to hand to the readers (see vinWork). */
export function pixelsOf(canvas: HTMLCanvasElement): ImageData {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('No canvas to read');
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

const BLOCK_SIZES = [40, 24, 16, 10, 6, 4, 2];
const REVEAL_DURATION = 700;
const STEP_DURATION = REVEAL_DURATION / BLOCK_SIZES.length;

const buffer = document.createElement('canvas');

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

export async function loadImage(url) {
  const image = new Image();
  image.src = url;
  await image.decode();
  return image;
}

function drawPixelated(canvas, image, blockSize) {
  buffer.width = Math.max(1, Math.round(canvas.width / blockSize));
  buffer.height = Math.max(1, Math.round(canvas.height / blockSize));

  const bufferContext = buffer.getContext('2d');
  bufferContext.filter = 'url(#posterize)';
  bufferContext.drawImage(image, 0, 0, buffer.width, buffer.height);

  const context = canvas.getContext('2d');
  context.imageSmoothingEnabled = false;
  context.drawImage(buffer, 0, 0, canvas.width, canvas.height);
}

function drawSharp(canvas, image) {
  const context = canvas.getContext('2d');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
}

export async function revealPoster(canvas, image, { signal }) {
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.round(canvas.clientWidth * scale);
  canvas.height = Math.round(canvas.clientHeight * scale);

  const start = await nextFrame();
  for (const [step, blockSize] of BLOCK_SIZES.entries()) {
    drawPixelated(canvas, image, blockSize * scale);
    let now = await nextFrame();
    while (now - start < (step + 1) * STEP_DURATION) {
      if (signal.aborted) {
        return;
      }
      now = await nextFrame();
    }
  }

  drawSharp(canvas, image);
}

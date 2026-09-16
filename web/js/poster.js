const BLOCK_SIZES = [40, 24, 16, 10, 6, 4, 2];
const STEP_DURATION = 80;

const buffer = document.createElement('canvas');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function loadImage(url) {
  const image = new Image();
  image.src = url;
  await image.decode();
  return image;
}

function drawPixelated(canvas, image, blockSize) {
  buffer.width = Math.max(1, Math.round(canvas.width / blockSize));
  buffer.height = Math.max(1, Math.round(canvas.height / blockSize));
  buffer.getContext('2d').drawImage(image, 0, 0, buffer.width, buffer.height);

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

export async function revealPoster(canvas, image, { animate, signal }) {
  const scale = window.devicePixelRatio || 1;
  canvas.width = Math.round(canvas.clientWidth * scale);
  canvas.height = Math.round(canvas.clientHeight * scale);

  if (animate) {
    canvas.classList.add('is-revealing');
    for (const blockSize of BLOCK_SIZES) {
      drawPixelated(canvas, image, blockSize * scale);
      await wait(STEP_DURATION);
      if (signal.aborted) {
        return;
      }
    }
    canvas.classList.remove('is-revealing');
  }

  drawSharp(canvas, image);
}

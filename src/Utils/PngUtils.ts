export function handlePNGSequenceUpload(event: Event): { url: string; name: string }[] {
  const input = event.target as HTMLInputElement;
  if (!input.files) return [];

  const files = Array.from(input.files);

  // Sort the PNG sequence based on numeric order in the filename
  const pngSequence = files
    .sort((a, b) => {
      const numA = parseInt(a.name.match(/\d+/)?.[0] || "0", 10);
      const numB = parseInt(b.name.match(/\d+/)?.[0] || "0", 10);
      return numA - numB;
    })
    .map((file, index) => ({
      url: URL.createObjectURL(file),
      name: `Capture${index + 1}`,
    }));

  return pngSequence;
}

export function handleTopOverlayUpload(event: Event): { url: string; name: string } | null {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return null;

  const file = input.files[0];
  const overlayTopSrc = URL.createObjectURL(file);
  const overlayTopFileName = file.name;

  return { url: overlayTopSrc, name: overlayTopFileName };
}

export function handleBottomOverlayUpload(event: Event): { url: string; name: string } | null {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return null;

  const file = input.files[0];
  const overlayBottomSrc = URL.createObjectURL(file);
  const overlayBottomFileName = file.name;

  return { url: overlayBottomSrc, name: overlayBottomFileName };
}
export function handleAudioUpload(event: Event): { audioSrc: string; audioFileName: string } | null {
  const target = event.target as HTMLInputElement;
  if (!target.files || target.files.length === 0) return null;

  const file = target.files[0];
  const audioSrc = URL.createObjectURL(file);
  const audioFileName = file.name;

  return { audioSrc, audioFileName };
}


// VideoUtils.ts

// Define the types for the function arguments
type ImageElement = HTMLImageElement;
type CanvasElement = HTMLCanvasElement;
type Context2D = CanvasRenderingContext2D | null;

// Function to preload images
export async function preloadImages(
  pngSequence: Array<{ url: string }>,
  overlayTopSrc?: string,
  overlayBottomSrc?: string
) {
  const preloadedImages = await Promise.all(
    pngSequence.map((frame) => loadImage(frame.url))
  );

  const overlayTopImg = overlayTopSrc ? await loadImage(overlayTopSrc) : null;
  const overlayBottomImg = overlayBottomSrc ? await loadImage(overlayBottomSrc) : null;

  return { preloadedImages, overlayTopImg, overlayBottomImg };
}

// Helper function to load an image
export function loadImage(src: string): Promise<ImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}


// Function to start the video rendering process from a PNG sequence
export async function downloadVideoFromPNGSequence(
  canvas: HTMLCanvasElement,
  pngSequence: Array<{ url: string }>,
  overlayTopSrc?: string,
  overlayBottomSrc?: string,
  framerate = 60,
  audioSrc?: string,
  videoBitrate = 10000000 // 10 Mbps
): Promise<Blob> {
  const preloadedImages = await preloadImages(pngSequence, overlayTopSrc, overlayBottomSrc);
  const frames = await preloadFrames(preloadedImages.preloadedImages, preloadedImages.overlayTopImg, preloadedImages.overlayBottomImg, canvas);

  return new Promise((resolve, reject) => {
    const handleAsync = async () => {
      try {
        const audioContext = new AudioContext();
        const audioResponse = await fetch(audioSrc!);
        const audioData = await audioResponse.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(audioData);

        // Create a MediaStream for video and audio
        const videoStream = canvas.captureStream(framerate);
        const audioSource = audioContext.createBufferSource();
        audioSource.buffer = audioBuffer;

        const destination = audioContext.createMediaStreamDestination();
        audioSource.connect(destination);
        audioSource.start();

        const combinedStream = new MediaStream([
          ...videoStream.getVideoTracks(),
          ...destination.stream.getAudioTracks(),
        ]);

        // Record the combined stream (video + audio)
        const mediaRecorder = new MediaRecorder(combinedStream, {
          videoBitsPerSecond: videoBitrate,
          mimeType: "video/webm",
        });

        const chunks: BlobPart[] = [];
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunks.push(event.data);
        };
        mediaRecorder.onstop = () => {
          resolve(new Blob(chunks, { type: "video/webm" }));
        };
        mediaRecorder.onerror = reject;

        mediaRecorder.start();
        playFramesWithAudio(canvas, frames, framerate, mediaRecorder);
      } catch (error) {
        reject(error);
      }
    };
    handleAsync();
  });
}

// Helper function to play frames and synchronize with MediaRecorder
function playFramesWithAudio(
  canvas: HTMLCanvasElement,
  frames: ImageData[],
  framerate: number,
  mediaRecorder: MediaRecorder
) {
  const visibleCtx = canvas.getContext("2d");
  if (!visibleCtx) {
    mediaRecorder.stop();
    throw new Error("Failed to get canvas context");
  }

  // Frame capture timing
  let i = 0;
  const frameDuration = 1000 / framerate;

  const renderNextFrame = () => {
    if (i >= frames.length) {
      mediaRecorder.stop();
      return;
    }

    visibleCtx.putImageData(frames[i++], 0, 0);
    setTimeout(renderNextFrame, frameDuration);  // Capture the next frame at fixed interval
  };

  // Start frame capture loop
  renderNextFrame();
}


function playFrames(
  canvas: HTMLCanvasElement,
  frames: ImageData[],
  framerate: number,
  resolve: (blob: Blob) => void,
  reject: (reason?: any) => void
): void {
  const visibleCtx = canvas.getContext("2d");
  if (!visibleCtx) {
    reject("Failed to get canvas context");
    return;
  }

  const videoStream = canvas.captureStream(framerate);
  const mediaRecorder = new MediaRecorder(videoStream, {
    videoBitsPerSecond: 10000000,
    mimeType: "video/webm",
  });

  const chunks: BlobPart[] = [];
  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };
  mediaRecorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
  mediaRecorder.onerror = reject;

  mediaRecorder.start();

  // Frame capture timing
  let i = 0;
  const renderNextFrame = () => {
    if (i >= frames.length) {
      mediaRecorder.stop();
      return;
    }
    
    visibleCtx.putImageData(frames[i++], 0, 0);
    setTimeout(renderNextFrame, 1000 / framerate);  // Capture the next frame at fixed interval
  };

  // Start frame capture loop
  renderNextFrame();
}



async function preloadFrames(
  preloadedImages: HTMLImageElement[],
  overlayTopImg: HTMLImageElement | null,
  overlayBottomImg: HTMLImageElement | null,
  canvas: HTMLCanvasElement
): Promise<ImageData[]> {
  const offscreenCanvas = document.createElement("canvas");
  const offscreenCtx = offscreenCanvas.getContext("2d");

  if (!offscreenCtx) throw new Error("Failed to get offscreen canvas context");

  // Set the canvas size based on the first image
  const firstImage = preloadedImages[0];
  const { width, height } = firstImage;
  offscreenCanvas.width = width;
  offscreenCanvas.height = height;
  canvas.width = width;
  canvas.height = height;

  const frames: ImageData[] = [];

  for (const image of preloadedImages) {
    offscreenCtx.clearRect(0, 0, width, height);

    if (overlayBottomImg) offscreenCtx.drawImage(overlayBottomImg, 0, 0, width, height);
    offscreenCtx.drawImage(image, 0, 0, width, height);
    if (overlayTopImg) offscreenCtx.drawImage(overlayTopImg, 0, 0, width, height);

    frames.push(offscreenCtx.getImageData(0, 0, width, height));
  }

  return frames;
}


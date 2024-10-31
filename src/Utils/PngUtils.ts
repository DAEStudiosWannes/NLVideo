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
  audioSrc?:string,
  videoBitrate = 10000000 // 10 Mbps
): Promise<Blob> {
  // Helper function to handle async processing
  const createVideo = async (resolve: (blob: Blob) => void, reject: (reason?: any) => void) => {
    try {
      if (!pngSequence.length) {
        alert("No PNG sequence uploaded.");
        return;
      }

      // Preload all images and overlays
      const { preloadedImages, overlayTopImg, overlayBottomImg } = await preloadImages(pngSequence, overlayTopSrc, overlayBottomSrc);

      const visibleCtx = canvas.getContext("2d");
      const offscreenCanvas = document.createElement("canvas");
      const offscreenCtx = offscreenCanvas.getContext("2d");

      // Set the canvas size based on the first image's aspect ratio
      const firstImage = preloadedImages[0];
      offscreenCanvas.width = canvas.width = 1920;
      offscreenCanvas.height = canvas.height = (canvas.width / firstImage.width) * firstImage.height;

      // Start capturing the canvas to create a video
      const videoStream = canvas.captureStream(framerate);
      const mediaRecorder = new MediaRecorder(videoStream, {
        videoBitsPerSecond: videoBitrate,
        mimeType: "video/webm",
      });
      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        resolve(blob); // Resolve with the created Blob
      };

      mediaRecorder.onerror = (error) => {
        reject(error); // Reject on any errors
      };

      mediaRecorder.start();

      const frameDuration = 1000 / framerate;
      let lastFrameTime = performance.now();

      const renderFrame = (i: number) => {
        if (i >= preloadedImages.length) {
          mediaRecorder.stop();
          return;
        }

        const now = performance.now();
        const elapsed = now - lastFrameTime;

        if (elapsed >= frameDuration) {
          lastFrameTime = now;

          offscreenCtx?.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);

          // Draw bottom overlay if it exists
          if (overlayBottomImg) {
            offscreenCtx?.drawImage(
              overlayBottomImg,
              0,
              0,
              offscreenCanvas.width,
              offscreenCanvas.height
            );
          }

          // Draw the main PNG frame to the offscreen canvas
          const image = preloadedImages[i];
          offscreenCtx?.drawImage(
            image,
            0,
            0,
            offscreenCanvas.width,
            offscreenCanvas.height
          );

          // Draw top overlay if it exists
          if (overlayTopImg) {
            offscreenCtx?.drawImage(
              overlayTopImg,
              0,
              0,
              offscreenCanvas.width,
              offscreenCanvas.height
            );
          }

          // Now, draw the offscreen canvas to the visible canvas
          visibleCtx?.clearRect(0, 0, canvas.width, canvas.height);
          visibleCtx?.drawImage(
            offscreenCanvas,
            0,
            0,
            canvas.width,
            canvas.height
          );

          // Proceed to the next frame
          requestAnimationFrame(() => renderFrame(i + 1));
        } else {
          requestAnimationFrame(() => renderFrame(i));
        }
      };

      // Start rendering frames
      renderFrame(0);
    } catch (error) {
      reject(error); // Reject if any errors occur
    }
  };

  // Return the Promise, passing the `createVideo` function
  return new Promise((resolve, reject) => createVideo(resolve, reject));
}


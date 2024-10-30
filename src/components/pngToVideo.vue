<template>
  <canvas ref="canvas" class="video-canvas"></canvas>
  <!-- Progress Bar or Percentage Display -->
  <div v-if="renderingProgress > 0" class="progress-container">
    <div class="progress-bar" :style="{ width: `${renderingProgress}%` }"></div>
    <p>{{ renderingProgress }}% rendered</p>
  </div>
  <div class="video-container">
    <div v-if="showUploadSection" class="upload-section">
      <div class="upload-instructions">
        <p>Upload a PNG sequence and their overlays</p>
      </div>
      <div class="upload-buttons">

        <div>
          <label for="png-sequence-upload">Upload PNG Sequence:</label>
          <input
            id="png-sequence-upload"
            type="file"
            @change="handlePNGSequenceUpload"
            accept="image/png"
            multiple
          />
          <span v-if="pngSequenceFileNames.length"
            >{{ pngSequenceFileNames.length }} frames uploaded</span
          >
        </div>
        <div>
          <label for="overlay-top-upload">Upload Top Overlay PNG:</label>
          <input
            id="overlay-top-upload"
            type="file"
            @change="handleTopOverlayUpload"
            accept="image/png"
          />
          <span v-if="overlayTopFileName">{{ overlayTopFileName }}</span>
        </div>
        <div>
          <label for="overlay-bottom-upload">Upload Bottom Overlay PNG:</label>
          <input
            id="overlay-bottom-upload"
            type="file"
            @change="handleBottomOverlayUpload"
            accept="image/png"
          />
          <span v-if="overlayBottomFileName">{{ overlayBottomFileName }}</span>
        </div>
        <div>
          <label for="audio-upload">Upload Audio:</label>
          <input
            id="audio-upload"
            type="file"
            @change="handleAudioUpload"
            accept="audio/*"
          />
          <span v-if="audioFileName">{{ audioFileName }}</span>
        </div>
        <div>
          <label for="framerate">Set Framerate (default 60):</label>
          <input
            id="framerate"
            type="number"
            v-model="framerate"
            min="1"
            placeholder="60"
          />
        </div>
      </div>
      <button @click="downloadVideoFromPNGSequence" class="play-button">
        Download Video with Overlays
      </button>
    </div>
  </div>
</template>

<script>
export default {
  data() {

    return {
      ffmpeg: null,
      pngSequence: [],
      preloadedImages: [],
      overlayTopImg: null,
      overlayBottomImg: null,
      pngSequenceFileNames: [],
      overlayTopSrc: null,
      overlayBottomSrc: null,
      overlayTopFileName: "",
      overlayBottomFileName: "",
      audioSrc: null,
      audioFileName: "",
      renderingProgress: 0,
      showUploadSection: true,
      framerate: 60,
    };
  },
  methods: {
    handlePNGSequenceUpload(event) {
      const files = Array.from(event.target.files);

      // Sort the PNG sequence based on numeric order in the filename
      this.pngSequence = files
        .sort((a, b) => {
          const numA = parseInt(a.name.match(/\d+/)[0], 10);
          const numB = parseInt(b.name.match(/\d+/)[0], 10);
          return numA - numB;
        })
        .map((file, index) => ({
          url: URL.createObjectURL(file),
          name: `Capture${index + 1}`,
        }));

      this.pngSequenceFileNames = this.pngSequence.map((file) => file.name);
    },
    handleTopOverlayUpload(event) {
      const file = event.target.files[0];
      this.overlayTopSrc = URL.createObjectURL(file);
      this.overlayTopFileName = file.name;
    },
    handleBottomOverlayUpload(event) {
      const file = event.target.files[0];
      this.overlayBottomSrc = URL.createObjectURL(file);
      this.overlayBottomFileName = file.name;
    },
    handleAudioUpload(event) {
      const file = event.target.files[0];
      this.audioSrc = URL.createObjectURL(file);
      this.audioFileName = file.name;
    },
    async preloadImages() {
      this.preloadedImages = await Promise.all(
        this.pngSequence.map((frame) => this.loadImage(frame.url))
      );
      if (this.overlayTopSrc)
        this.overlayTopImg = await this.loadImage(this.overlayTopSrc);
      if (this.overlayBottomSrc)
        this.overlayBottomImg = await this.loadImage(this.overlayBottomSrc);
    },
    loadImage(src) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    },
    async downloadVideoFromPNGSequence() {
      if (!this.pngSequence.length) {
        alert("No PNG sequence uploaded.");
        return;
      }

      // Preload all PNG images
      await this.preloadImages();

      this.renderingProgress = 0;

      // Create an off-screen canvas for smoother rendering
      const offscreenCanvas = document.createElement("canvas");
      const offscreenCtx = offscreenCanvas.getContext("2d");

      const visibleCanvas = this.$refs.canvas;
      const visibleCtx = visibleCanvas.getContext("2d");

      // Set the canvas size based on the first image's aspect ratio
      const firstImage = this.preloadedImages[0];
      offscreenCanvas.width = visibleCanvas.width = 1920; // Example canvas width
      offscreenCanvas.height = visibleCanvas.height =
        (visibleCanvas.width / firstImage.width) * firstImage.height; // Maintain aspect ratio

      // Start capturing the canvas to create a video
      const videoStream = visibleCanvas.captureStream(this.framerate);
      const mediaRecorder = new MediaRecorder(videoStream, {
        videoBitsPerSecond: 10000000, // Set bitrate to 5 Mbps for higher quality
        mimeType: "video/webm",
      });
      this.chunks = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "rendered_video.webm";
        a.click();
        URL.revokeObjectURL(url);
      };

      mediaRecorder.start();

      const frameDuration = 1000 / this.framerate;
      let lastFrameTime = performance.now();

      const renderFrame = async (i) => {
        if (i >= this.preloadedImages.length) {
          // Stop recording once all frames are processed
          mediaRecorder.stop();
          return;
        }

        // Get the current time and calculate the elapsed time
        const now = performance.now();
        const elapsed = now - lastFrameTime;

        // Only proceed if enough time has passed based on the framerate
        if (elapsed >= frameDuration) {
          lastFrameTime = now;

          // Clear offscreen canvas
          offscreenCtx.clearRect(
            0,
            0,
            offscreenCanvas.width,
            offscreenCanvas.height
          );

          // Draw bottom overlay if it exists
          if (this.overlayBottomImg) {
            offscreenCtx.drawImage(
              this.overlayBottomImg,
              0,
              0,
              offscreenCanvas.width,
              offscreenCanvas.height
            );
          }

          // Draw the main PNG frame to the offscreen canvas
          const image = this.preloadedImages[i];
          offscreenCtx.drawImage(
            image,
            0,
            0,
            offscreenCanvas.width,
            offscreenCanvas.height
          );

          // Draw top overlay if it exists
          if (this.overlayTopImg) {
            offscreenCtx.drawImage(
              this.overlayTopImg,
              0,
              0,
              offscreenCanvas.width,
              offscreenCanvas.height
            );
          }

          // Now, draw the offscreen canvas to the visible canvas
          visibleCtx.clearRect(0, 0, visibleCanvas.width, visibleCanvas.height);
          visibleCtx.drawImage(
            offscreenCanvas,
            0,
            0,
            visibleCanvas.width,
            visibleCanvas.height
          );

          this.renderingProgress =
            ((i + 1) / this.preloadedImages.length) * 100;

          // Proceed to the next frame
          requestAnimationFrame(() => renderFrame(i + 1));
        } else {
          // Continue without rendering if not enough time has passed
          requestAnimationFrame(() => renderFrame(i));
        }
      };

      // Start rendering frames
      renderFrame(0);
    },
  },
};
</script>

<style>
.video-container {
  width: 100%;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
}
.upload-section {
  border: 1px solid #000;
  width: auto;
  padding: 50px;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
}
.upload-instructions {
  margin-bottom: 10px;
  text-align: center;
  font-size: 18px;
  font-weight: bold;
}
.upload-buttons {
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
}
.play-button {
  padding: 10px 20px;
  font-size: 18px;
  cursor: pointer;
  margin-top: 10px;
}
.video-canvas {
  display: none;
}
.progress-container {
  width: 100%;
  background-color: #f3f3f3;
  border: 1px solid #ccc;
  margin-top: 20px;
  text-align: center;
}
.progress-bar {
  height: 20px;
  background-color: #4caf50;
}
.progress-container p {
  margin-top: 5px;
  font-size: 14px;
  color: #333;
}
</style>

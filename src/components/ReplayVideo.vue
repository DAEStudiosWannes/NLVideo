<template>
  <canvas ref="canvas" class="video-canvas"></canvas>
  <!-- Progress Bar or Percentage Display -->
  <div v-if="renderingProgress > 0" class="progress-container">
    <div class="progress-bar" :style="{ width: `${renderingProgress}%` }"></div>
    <p>{{ renderingProgress }}% rendered</p>
  </div>
  <div class="video-container">
    <!-- Instructions and Upload Buttons -->
    <div v-if="showUploadSection" class="upload-section">
      <div class="upload-instructions">
        <div class="upload-logo"></div>

        <p>Upload een video and their overlays</p>
      </div>
      <div class="upload-buttons">
        <div>
          <label for="video-upload">Upload Video:</label>
          <input
            id="video-upload"
            type="file"
            @change="handleVideoUpload"
            accept="video/*"
          />
          <span v-if="videoFileName">{{ videoFileName }}</span>
        </div>
        <div>
          <label for="image-upload-1">Upload PNG Image 1:</label>
          <input
            id="image-upload-1"
            type="file"
            @change="handleImage1Upload"
            accept="image/png"
          />
          <span v-if="imageFileNames[0]">{{ imageFileNames[0] }}</span>
        </div>
        <div>
          <label for="image-upload-2">Upload PNG Image 2:</label>
          <input
            id="image-upload-2"
            type="file"
            @change="handleImage2Upload"
            accept="image/png"
          />
          <span v-if="imageFileNames[1]">{{ imageFileNames[1] }}</span>
        </div>
        <div>
          <label for="image-upload-3">Upload PNG Image 3:</label>
          <input
            id="image-upload-3"
            type="file"
            @change="handleImage3Upload"
            accept="image/png"
          />
          <span v-if="imageFileNames[2]">{{ imageFileNames[2] }}</span>
        </div>
        
      
      </div>
      <!-- Sound Upload -->

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
    </div>
    <!-- Video Duration Display -->
    <div v-if="videoDuration" class="video-duration">
      Video Duration: {{ videoDurationFormatted }}
    </div>
    <!-- Play Buttons Below Upload Section -->
    <div v-if="allUploaded && showUploadSection" class="play-buttons">
      <button @click="startPlayback(0)" class="play-button">
        Play Video with Overlay 1
      </button>
      <button @click="startPlayback(1)" class="play-button">
        Play Video with Overlay 2
      </button>
      <button @click="startPlayback(2)" class="play-button">
        Play Video with Overlay 3
      </button>
      

      <button @click="downloadAllVideosWithOverlays" class="play-button">
        Download Video with Overlays
      </button>
    </div>

    <!-- Video and Overlay Section -->
    <div v-if="!showUploadSection" class="video-wrapper" ref="videoWrapper">
      <video
        ref="videoPlayer"
        :src="videoSrc"
        @loadedmetadata="onVideoLoaded"
        @play="adjustImageSize"
        @ended="onVideoEnded"
        class="responsive-video"
        controls
        v-show="showVideo"
      ></video>
      <img
        ref="overlayImage"
        :src="currentOverlaySrc"
        alt="Overlay Image"
        :style="overlayStyle"
        v-show="showOverlay"
      />
      <button
        @click="toggleFullscreen"
        class="fullscreen-button"
        v-if="showVideo"
      >
        Toggle Fullscreen
      </button>
    </div>

    <!-- Main video player -->

    <video
      ref="mainVideoPlayer"
      :src="videoSrc"
      @loadedmetadata="onVideoLoaded"
      @play="adjustImageSize"
      @ended="onVideoEnded"
      class="responsive-video"
      controls
      v-show="showVideo"
    ></video>
    <!-- Lightbox container -->
    <div v-if="showLightbox" class="lightbox" @click="closeLightbox">
      <div class="lightbox-content" @click.stop>
        <video ref="videoPlayer" controls class="lightbox-video"></video>
        <img ref="overlayImage" alt="Overlay Image" :style="overlayStyle" />
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      videoSrc: null,
      videoFileName: "", // Holds the name of the uploaded video file
      audioSrc: null, // Holds the source of the uploaded audio file
      audioFileName: "", // Holds the name of the uploaded audio file
      imageSrcs: [null, null, null], // Array to store 3 PNG image sources
      imageFileNames: ["", "", ""], // Holds the names of the uploaded image files
      currentOverlayIndex: 0, // Tracks the current overlay being shown
      showOverlay: false,
      overlayStyle: {},
      showVideo: false, // Controls whether the video and overlays are shown
      showUploadSection: true, // Controls the visibility of the upload section and play buttons
      playAll: false, // Controls whether to play all overlays in sequence
      recording: false, // Indicates if the video is being recorded
      chunks: [], // Stores the recorded chunks
      showLightbox: false, // Controls whether the lightbox is visible
      renderingProgress: 0, // Tracks the progress of video rendering
      videoDuration: 0, // Store the duration of the uploaded video
    };
  },
  computed: {
    videoDurationFormatted() {
      const minutes = Math.floor(this.videoDuration / 60);
      const seconds = Math.floor(this.videoDuration % 60);
      return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
    },
    allUploaded() {
      return (
        this.videoSrc !== null && this.imageSrcs.some((src) => src !== null)
      );
    },
    currentOverlaySrc() {
      return this.imageSrcs[this.currentOverlayIndex];
    },
  },
  methods: {
    handleVideoUpload(event) {
      const file = event.target.files[0];
      if (file) {
        this.videoSrc = URL.createObjectURL(file);
        this.videoFileName = file.name;

        // Reset video duration and load the metadata to fetch the duration
        this.videoDuration = 0;

        this.$nextTick(() => {
          const videoElement = this.$refs.mainVideoPlayer;
          videoElement.addEventListener("loadedmetadata", () => {
            this.videoDuration = videoElement.duration;
          });
        });
      }
    },

    handleAudioUpload(event) {
      const file = event.target.files[0];
      if (file) {
        this.audioSrc = URL.createObjectURL(file);
        this.audioFileName = file.name;
      }
    },
    handleImage1Upload(event) {
      this.handleImageUpload(event, 0);
    },
    handleImage2Upload(event) {
      this.handleImageUpload(event, 1);
    },
    handleImage3Upload(event) {
      this.handleImageUpload(event, 2);
    },
    handleImage4Upload(event) {
      this.handleImageUpload(event, 3);
    },
    handleImage5Upload(event) {
      this.handleImageUpload(event, 4);
    },
    handleImageUpload(event, index) {
      const file = event.target.files[0];
      if (file) {
        this.imageSrcs[index] = URL.createObjectURL(file);
        this.imageFileNames[index] = file.name;
      }
    },
    onVideoLoaded() {
      this.adjustImageSize(); // Ensure image size is adjusted when video metadata is loaded
      window.addEventListener("resize", this.adjustImageSize);
    },
    adjustImageSize() {
      const videoElement = this.$refs.videoPlayer;
      const imageElement = this.$refs.overlayImage;

      if (videoElement && imageElement) {
        // Ensure the correct overlay image dimensions are used
        const currentImage = new Image();
        currentImage.src = this.currentOverlaySrc;

        currentImage.onload = () => {
          const videoAspectRatio =
            videoElement.videoWidth / videoElement.videoHeight;
          const imageAspectRatio = currentImage.width / currentImage.height;

          let width, height;

          if (imageAspectRatio > videoAspectRatio) {
            width = videoElement.clientWidth;
            height = width / imageAspectRatio;
          } else {
            height = videoElement.clientHeight;
            width = height * imageAspectRatio;
          }

          this.overlayStyle = {
            position: "absolute",
            top: "50%",
            left: "50%",
            width: `${width}px`,
            height: `${height}px`,
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
          };

          this.showOverlay = true; // Ensure the overlay is shown immediately
        };
      }
    },
    onVideoEnded() {
      if (
        this.playAll &&
        this.currentOverlayIndex < this.imageSrcs.length - 1
      ) {
        this.currentOverlayIndex++;
        this.$refs.videoPlayer.play();
      } else {
        this.resetToUploadScreen();
      }
    },
    startPlayback(index) {
      this.currentOverlayIndex = index;
      this.showLightbox = true;

      this.$nextTick(() => {
        const videoElement = this.$refs.videoPlayer;
        if (videoElement) {
          videoElement.src = this.videoSrc;
          const overlayImage = this.$refs.overlayImage;
          overlayImage.src = this.imageSrcs[index];
          this.adjustImageSize(); // Ensure overlay is adjusted and visible
          videoElement.play(); // Start video playback
        }
      });
    },
    closeLightbox() {
      this.showLightbox = false;
      const videoElement = this.$refs.videoPlayer;
      if (videoElement) {
        videoElement.pause(); // Pause the video when closing the lightbox
      }
    },
    playAllOverlays() {
      this.currentOverlayIndex = 0;
      this.playAll = true;
      this.showUploadSection = false;
      this.showVideo = true;

      this.$nextTick(() => {
        const videoElement = this.$refs.videoPlayer;
        if (videoElement) {
          this.adjustImageSize();
          videoElement.play();
        }
      });
    },
    resetToUploadScreen() {
      this.showVideo = false;
      this.showUploadSection = true;
      this.currentOverlayIndex = 0;
      this.playAll = false;
    },
    toggleFullscreen() {
      const videoWrapper = this.$refs.videoWrapper;
      if (!document.fullscreenElement) {
        if (videoWrapper.requestFullscreen) {
          videoWrapper.requestFullscreen();
        } else if (videoWrapper.mozRequestFullScreen) {
          /* Firefox */
          videoWrapper.mozRequestFullScreen();
        } else if (videoWrapper.webkitRequestFullscreen) {
          /* Chrome, Safari and Opera */
          videoWrapper.webkitRequestFullscreen();
        } else if (videoWrapper.msRequestFullscreen) {
          /* IE/Edge */
          videoWrapper.msRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    },
    async downloadAllVideosWithOverlays() {
      // Check if any overlay exists
      if (!this.imageSrcs.some((src) => src !== null)) {
        alert("No overlays available for any video.");
        return;
      }

      this.renderingProgress = 0;

      // Loop through each overlay and process the video
      for (let i = 0; i < this.imageSrcs.length; i++) {
        if (this.imageSrcs[i]) {
          await this.downloadVideoWithOverlay(i); // Wait for each video to finish processing before moving to the next
        }
      }
    },
    async downloadVideoWithOverlay(index) {
      this.currentOverlayIndex = index;

      if (!this.imageSrcs[this.currentOverlayIndex]) {
        alert(`No overlay available for video ${index + 1}.`);
        return;
      }

      this.renderingProgress = 0;

      return new Promise((resolve) => {
        this.$nextTick(async () => {
          const canvas = this.$refs.canvas;
          if (!canvas) {
            console.error("Canvas element not found");
            resolve();
            return;
          }

          const videoElement = this.showLightbox
            ? this.$refs.lightboxVideoPlayer
            : this.$refs.mainVideoPlayer;

          if (!videoElement) {
            console.error("Video element not found");
            resolve();
            return;
          }

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            console.error("Failed to get canvas context");
            resolve();
            return;
          }

          canvas.width = videoElement.videoWidth;
          canvas.height = videoElement.videoHeight;

          // Create an AudioContext if it doesn't exist
          if (!this.audioContext) {
            this.audioContext = new (window.AudioContext ||
              window.webkitAudioContext)();
          }

          // Reuse or create MediaElementSourceNode for the video
          if (!this.videoAudioSource) {
            this.videoAudioSource =
              this.audioContext.createMediaElementSource(videoElement);
          }

          const audioDestination =
            this.audioContext.createMediaStreamDestination();
          this.videoAudioSource.connect(audioDestination);

          // If an external audio file was uploaded, load and play it
          if (this.audioSrc) {
            const audioElement = new Audio(this.audioSrc);
            const externalAudioSource =
              this.audioContext.createMediaElementSource(audioElement);
            externalAudioSource.connect(audioDestination);

            // Sync the external audio with the video playback
            audioElement.currentTime = videoElement.currentTime;
            audioElement.play();
          }

          // Capture the video stream from the canvas
          const videoStream = canvas.captureStream(60); // Specify frame rate (e.g., 30 or 60 fps)

          // Add the mixed audio to the video stream
          audioDestination.stream
            .getAudioTracks()
            .forEach((track) => videoStream.addTrack(track));

          // Increase the bitrate and quality settings for MediaRecorder
          const options = {
            mimeType: "video/webm;codecs=vp9", // Ensure WebM VP9 codec for compatibility
            videoBitsPerSecond: 10000000, // 10 Mbps for video
            audioBitsPerSecond: 128000, // 128 kbps for audio
          };
          const mediaRecorder = new MediaRecorder(videoStream, options);
          this.chunks = [];

          mediaRecorder.ondataavailable = (event) => {
            this.chunks.push(event.data);
          };

          mediaRecorder.onstop = () => {
            const blob = new Blob(this.chunks, { type: "video/webm" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `video_with_overlay_${index + 1}.webm`; // Naming each file uniquely
            a.click();
            URL.revokeObjectURL(url);
            this.chunks = [];
            this.renderingProgress = 100; // Set to 100% when finished
            resolve(); // Resolve the promise to continue with the next video
          };

          // Start the recording
          mediaRecorder.start();

          videoElement.currentTime = 0;
          videoElement.play();

          const overlayImage = new Image();
          overlayImage.src = this.imageSrcs[index];

          overlayImage.onload = () => {
            const updateCanvas = () => {
              ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
              ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height); // Draw the video frame

              // Draw the overlay image
              const aspectRatio = overlayImage.width / overlayImage.height;
              let width = canvas.width;
              let height = canvas.height / aspectRatio;

              if (height > canvas.height) {
                height = canvas.height;
                width = height * aspectRatio;
              }

              ctx.drawImage(
                overlayImage,
                (canvas.width - width) / 2,
                (canvas.height - height) / 2,
                width,
                height
              );

              // Update progress based on the current time of the video
              this.renderingProgress =
                (videoElement.currentTime / videoElement.duration) * 100;

              if (videoElement.currentTime < videoElement.duration) {
                requestAnimationFrame(updateCanvas); // Sync with the next video frame
              }
            };

            videoElement.addEventListener("timeupdate", updateCanvas);

            videoElement.addEventListener("ended", () => {
              // Stop the recording once the video ends
              mediaRecorder.stop();
            });

            requestAnimationFrame(updateCanvas); // Start the rendering loop
          };
        });
      });
    },
  },
  beforeUnmount() {
    window.removeEventListener("resize", this.adjustImageSize);
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
.upload-logo {
  background-image: url("../../public/NationaleLoterijLogo.png");
  background-size: contain;
  background-repeat: no-repeat;
  height: 93px;
  width: 541px;

  margin-bottom: 20px;
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

.play-buttons {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.video-wrapper {
  position: relative;
  max-width: 100%;
  max-height: 100%;
}

.responsive-video {
  width: 100%;
  height: auto;
  max-height: 100vh;
  object-fit: contain;
}

.video-canvas {
  display: none;
}

img {
  pointer-events: none;
}

.fullscreen-button {
  position: absolute;
  bottom: 10px;
  right: 10px;
  padding: 5px 10px;
  font-size: 16px;
  z-index: 10;
}

.play-button {
  padding: 10px 20px;
  font-size: 18px;
  cursor: pointer;
  margin-top: 10px;
}
.lightbox {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.lightbox-content {
  position: relative;
  max-width: 80%;
  max-height: 80%;
}

.lightbox-video {
  width: 100%;
  height: auto;
}

img {
  pointer-events: none;
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

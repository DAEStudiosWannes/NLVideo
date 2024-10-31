<script lang="ts">
import { defineComponent, ref, computed } from "vue";
import ProcessSteps from "./ProcessSteps.vue";
import UploadFiles from "./UploadFiles.vue";
import DownloadFilesComponent from "./DownloadFilesComponent.vue";
import {
  handleBottomOverlayUpload,
  handlePNGSequenceUpload,
  handleTopOverlayUpload,
  downloadVideoFromPNGSequence,
  handleAudioUpload
} from "@/Utils/PngUtils";

export interface steps {
  url: string;
  name: string;
}

export default defineComponent({
  name: "RenderPage",
  components: {
    ProcessSteps,
    UploadFiles,
    DownloadFilesComponent
  },
  setup() {
    interface PngFile {
      url: string;
      name: string;
    }
    interface AudioFile {
      audioSrc: string; audioFileName: string
    }

    const progressArrayPNG = ref([
      { id: "01", name: "UploadPNG", href: "#", status: "current", canSkip: false },
      { id: "02", name: "UploadBackGround", href: "#", status: "upcoming", canSkip: true, },
      { id: "03", name: "UploadFront", href: "#", status: "", canSkip: true, },
      { id: "04", name: "UploadAudio", href: "#", status: "", canSkip: true, },
      { id: "05", name: "Render", href: "#", status: "", canSkip: true, },
    ]);

    const pngStep = ref<number>(1);
    const pngBackground = ref<PngFile>({ url: "", name: "" });
    const pngFront = ref<PngFile>({ url: "", name: "" });
    const Audio = ref<AudioFile>({ audioSrc: "", audioFileName: "" });
    const pngSequence = ref<PngFile[]>([]);
    const selectedImage = ref<PngFile | null>(null);
    const framerate = ref(60); // Set your desired framerate

    // Limit displayed frames to between 8 and 20
    const limitedFrames = computed(() => {
      const maxFrames = Math.min(pngSequence.value.length, 20);
      return pngSequence.value.slice(0, maxFrames >= 8 ? maxFrames : 8);
    });

    const toggleLightbox = (image: PngFile | null) => {
      selectedImage.value = image;
    };
    // Computed property to check if all necessary uploads are complete
    const isReadyToDownload = computed(() => {
      return (
        pngSequence.value.length > 0 &&

        pngStep.value === 5 // Check if all steps are complete
      );
    });

    return {
      isReadyToDownload,
      pngSequence,
      pngStep,
      pngBackground,
      pngFront,
      progressArrayPNG,
      limitedFrames,
      selectedImage,
      toggleLightbox,
      framerate,
      Audio
    };
  },
  methods: {
    updateStep(step: { name: string; href: string; status: string; id: number }) {
      const stepIndex = this.progressArrayPNG.findIndex((s) => s.id === step.id.toString());
      if (stepIndex !== -1) {
        this.progressArrayPNG.forEach((s, index) => {
          if (s.status != "skipped" && s.status != "complete") s.status = index === stepIndex ? "current" : index < stepIndex ? "skipped" : "upcoming";
        });
        this.pngStep = stepIndex + 1;
      }
      this.progressArrayPNG[stepIndex].status = "current";

    },
    UploadPNG(event: Event) {
      this.pngSequence = handlePNGSequenceUpload(event);
      this.progressArrayPNG[0].status = "complete";
      this.progressArrayPNG[1].status = "current";
      this.progressArrayPNG[2].status = "upcoming";
      this.pngStep = 2;
    },
    UploadBackground(event: Event) {
      const result = handleBottomOverlayUpload(event);
      if (result) {
        this.pngBackground = result;
      } else {
        console.error("Failed to upload background image");
      }
      this.progressArrayPNG[1].status = "complete";
      this.progressArrayPNG[2].status = "current";
      this.pngStep = 3;
    },
    UploadFront(event: Event) {
      const result = handleTopOverlayUpload(event);
      if (result) {
        this.pngFront = result;
      } else {
        console.error("Failed to upload front image");
      }
      this.progressArrayPNG[2].status = "complete";
      this.progressArrayPNG[3].status = "current";
      this.progressArrayPNG[4].status = "upcoming";
      this.pngStep = 4;
    },
    UploadAudio(event: Event) {
      const result = handleAudioUpload(event);
      if (result) {
        this.Audio = result;
      } else {
        console.error("Failed to upload Audio");
      }
      this.progressArrayPNG[3].status = "complete";
      this.progressArrayPNG[4].status = "current";
      this.pngStep = 5;
    },
    skipStep(step: number) {
      this.progressArrayPNG[step - 1].status = "skipped";
      this.progressArrayPNG[step].status = "current";
      this.pngStep = step + 1;
    },
    async DownloadVideo() {
      if (!this.isReadyToDownload) {
        alert("Please complete all steps before downloading the video.");
        return;
      }

      // Get the canvas reference
      const canvas = this.$refs.canvas as HTMLCanvasElement;

      // Generate video Blob
      const videoBlob = await downloadVideoFromPNGSequence(
        canvas,
        this.pngSequence,
        this.pngFront.url,
        this.pngBackground.url,
        this.framerate,
        this.Audio.audioSrc
      );

      // Create a download link
      const url = URL.createObjectURL(videoBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "rendered_video.webm"; // Suggested file name
      a.click();

      // Cleanup
      URL.revokeObjectURL(url);
    },
  },
});
</script>

<template>
  <div class="grid grid-cols-1 gap-4 max-w-10xl mt-20 mx-auto">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-5xl">
        <ProcessSteps :stepsArray="progressArrayPNG" @step-clicked="updateStep" />
        <UploadFiles v-if="pngStep === 1" title="PNG to Video"
          description="Upload your PNG's to the application to start the process. Select all png's from one folder"
          buttonText="Upload PNGs" filetype="image/png" @upload="UploadPNG" />
        <UploadFiles v-if="pngStep === 2" title="Background Image"
          description="Upload a background image that will be put behind the PNG sequence. Make sure it has the same aspect ratio as your PNG's"
          buttonText="Upload Image" filetype="image/png" :skipButton="true" @skip="skipStep(2)"
          @upload="UploadBackground" />
        <UploadFiles v-if="pngStep === 3" title="Visual infront"
          description="Upload an image that will be put in front of the PNG sequence. Make sure it has the same aspect ratio as your PNG's and has transparency"
          buttonText="Upload Image" filetype="image/png" :skipButton="true" @skip="skipStep(3)" @upload="UploadFront" />
        <UploadFiles v-if="pngStep === 4" title="Upload Audio" description="Upload audio that will be put in the video"
          buttonText="Upload Audio" :skipButton="true" filetype="audio/mp4, audio/wav'" @skip="skipStep(4)"
          @upload="UploadAudio" />
        <DownloadFilesComponent v-if="pngStep === 5" title="Render the video"
          description="Render the video to a .webm file" buttonText="Download Video" @upload="DownloadVideo" />

        <!-- Display multiple frames of PNG sequence if available -->
        <div v-if="pngSequence && pngSequence.length" class="mt-5 mb-12">
          <h4 class="text-sm font-semibold text-gray-700">Preview Frames</h4>
          <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
            <div v-for="(frame, index) in limitedFrames" :key="index"
              class="relative aspect-w-1 aspect-h-1 bg-gray-100 rounded-md overflow-hidden shadow-md cursor-pointer"
              @click="toggleLightbox(frame)">
              <!-- Background image stretched to cover container -->
              <img v-if="pngBackground.url" :src="pngBackground.url" class="absolute inset-0 w-full h-full"
                style="object-fit: fill;" alt="pngBackground" />
              <!-- PNG frame -->
              <img :src="frame.url" :alt="frame.name" class="relative w-full h-full object-contain" />
              <!-- Front overlay -->
              <img v-if="pngFront.url" :src="pngFront.url" class="absolute inset-0 w-full h-full "
                style="object-fit: fill;" alt="Front Overlay" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Lightbox Modal -->
    <div v-if="selectedImage" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80"
      @click="toggleLightbox(null)">
      <div class="relative w-full max-w-3xl mx-auto h-auto">
        <!-- Background image in lightbox -->
        <img v-if="pngBackground.url" :src="pngBackground.url" class="absolute inset-0 w-full h-full " style="object-fit: fill;"
          alt="pngBackground" />
        <!-- Selected PNG frame in lightbox -->
        <img :src="selectedImage.url" :alt="selectedImage.name" class="relative w-full h-auto object-contain z-10" />
        <!-- Front overlay in lightbox -->
        <img v-if="pngFront.url" :src="pngFront.url" class="absolute inset-0 w-full h-full z-20"
          style="object-fit: fill;" alt="Front Overlay" />
      </div>
    </div>
  </div>

  <!-- Canvas element used for rendering the video -->
  <canvas ref="canvas" style="display: none;"></canvas>
</template>

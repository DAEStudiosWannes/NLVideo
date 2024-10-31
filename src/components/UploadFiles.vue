<template>
    <div class="bg-white shadow sm:rounded-lg">
      <div class="px-4 py-5 sm:p-6">
        <h3 class="text-base font-semibold text-gray-900">{{ title }}</h3>
        <div class="mt-2 max-w-xl text-sm text-gray-500">
          <p>{{ description }}</p>
        </div>
        <div class="mt-5">
          <button
            type="button"
            @click="triggerFileInput"
            class="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
          >
            {{ buttonText }}
          </button>
          <button v-if="skipButton"
            type="button"
            @click="triggerSkip"
            class="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-indigo-600 shadow-sm hover:bg-indigo-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ml-2 border border-indigo-600"
          >
            skip
          </button>
          <input
            ref="fileInput"
            type="file"
            :accept="filetype"
            multiple
            @change="handleFileChange"
            style="display: none"
          />
        </div>
      </div>
    </div>
  </template>
  
  <script lang="ts">
  import { defineComponent, ref } from "vue";
  
  export default defineComponent({
    name: "UploadFiles",
    props: {
      title: String,
      description: String,
      buttonText: String,
      filetype:String,
      skipButton: {
        type: Boolean,
        default: false,
      },
    },
    setup(_, { emit }) {
      const fileInput = ref<HTMLInputElement | null>(null);
  
      const triggerFileInput = () => {
        fileInput.value?.click();
      };
  
      const handleFileChange = (event: Event) => {
        emit("upload", event); // Emit the event with the input change event as an argument
      };
      const triggerSkip = () => {
        emit("skip");
      };
  
      return {
        triggerFileInput,
        handleFileChange,
        triggerSkip,
        fileInput,
      };
    },
  });
  </script>
  
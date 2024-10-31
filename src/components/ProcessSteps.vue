<template>
  <nav aria-label="Progress">
    <ol role="list" class="divide-y divide-gray-300 rounded-md border border-gray-300 md:flex md:divide-y-0">
      <li v-for="(step, stepIdx) in steps" :key="step.name" class="relative md:flex md:flex-1">
        <a v-if="step.status === 'complete'" :href="step.href" class="group flex w-full items-center"
          @click.prevent="handleStepClick(step)">
          <span class="flex items-center px-6 py-4 text-sm font-medium">
            <span
              class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 group-hover:bg-indigo-800">
              <CheckIcon class="h-6 w-6 text-white" aria-hidden="true" />
            </span>
            <span class="ml-4 text-sm font-medium text-gray-900">
              {{ step.name }}
            </span>
          </span>
        </a>
        <a v-else-if="step.status === 'current'" :href="step.href"
          class="flex items-center px-6 py-4 text-sm font-medium" aria-current="step"
          @click.prevent="handleStepClick(step)">
          <span
            class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-indigo-600">
            <span class="text-indigo-600">{{ step.id }}</span>
          </span>
          <span class="ml-4 text-sm font-medium text-indigo-600">
            {{ step.name }}
          </span>
        </a>
        <a v-else-if="step.status === 'skipped'" :href="step.href"
          class="flex items-center px-6 py-4 text-sm font-medium" aria-current="step"
          @click.prevent="handleStepClick(step)">
          <span
            class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-orange-600">
            <span class="text-orange-600">{{ step.id }}</span>
          </span>
          <span class="ml-4 text-sm font-medium text-orange-600">
            {{ step.name }}
          </span>
        </a>
        <a v-else :href="step.href" class="group flex items-center" @click.prevent="handleStepClick(step)">
          <span class="flex items-center px-6 py-4 text-sm font-medium">
            <span
              class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 border-gray-300 group-hover:border-gray-400">
              <span class="text-gray-500 group-hover:text-gray-900">
                {{ step.id }}
              </span>
            </span>
            <span class="ml-4 text-sm font-medium text-gray-500 group-hover:text-gray-900">
              {{ step.name }}
            </span>
          </span>
        </a>
        <template v-if="stepIdx !== steps.length - 1">
          <!-- Arrow separator for lg screens and up -->
          <div class="absolute right-0 top-0 hidden h-full w-5 md:block" aria-hidden="true">
            <svg class="h-full w-full text-gray-300" viewBox="0 0 22 80" fill="none" preserveAspectRatio="none">
              <path d="M0 -2L20 40L0 82" vector-effect="non-scaling-stroke" stroke="currentcolor"
                stroke-linejoin="round" />
            </svg>
          </div>
        </template>
      </li>
    </ol>
  </nav>
</template>

<script lang="ts">
import { CheckIcon } from "@heroicons/vue/24/solid";
import { defineComponent, ref, watchEffect } from "vue";

export default defineComponent({
  name: "ProcessSteps",
  components: {
    CheckIcon,
  },
  props: {
    stepsArray: {
      type: Array as () => Array<{ name: string; href: string; status: string; id: number;canSkip:boolean }>,
      required: true,
    },
  },
  setup(props, { emit }) {
    // Initialize steps with the prop
    const steps = ref(props.stepsArray);

    // Watch for changes to stepsArray and update steps accordingly
    watchEffect(() => {
      steps.value = props.stepsArray;
    });

    // Emit the clicked step
    const handleStepClick = (step: { name: string; href: string; status: string; id: number }) => {
      console.log(steps.value)
      if (steps.value.find((s) => s.status=== "current")?.canSkip && step.status !="complete") {
        emit("step-clicked", step);
      }
      else if(step.status==="complete")alert("already completed")
      else alert("cannot skip this step");
    };

    return {
      CheckIcon,
      steps,
      handleStepClick,
    };
  },
});
</script>

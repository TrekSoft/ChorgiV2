<script setup lang="ts">
defineEmits<{ click: [] }>()
</script>

<template>
  <button
    @click="$emit('click')"
    class="w-full aspect-square rounded-3xl border-4 border-dashed border-amber-300 bg-amber-50 hover:bg-amber-100 hover:border-amber-400 flex flex-col items-center justify-center gap-3 transition-colors cursor-pointer"
  >
    <div class="w-1/2 aspect-square rounded-full bg-amber-200/70 flex items-center justify-center text-amber-600 font-light leading-none text-[5rem]">
      +
    </div>
    <span class="text-3xl font-bold text-amber-700">Add Child</span>
  </button>
</template>

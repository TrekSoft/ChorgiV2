<script setup>
import PhotoUpload from './PhotoUpload.vue'

defineProps({
  modelValue: { type: File, default: null },
  previewUrl: { type: String, default: null },
  label: { type: String, default: 'Photo' },
  optional: { type: Boolean, default: true },
})
const emit = defineEmits(['update:modelValue'])
</script>

<template>
  <PhotoUpload
    :model-value="modelValue"
    :preview-url="previewUrl"
    :label="label"
    :optional="optional"
    variant="inline"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>

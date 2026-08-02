<script setup lang="ts">
import PhotoUpload from './PhotoUpload.vue'

withDefaults(defineProps<{
  modelValue?: Blob | null
  previewUrl?: string | null
  label?: string
  optional?: boolean
}>(), {
  modelValue: null,
  previewUrl: null,
  label: 'Photo',
  optional: true,
})
const emit = defineEmits<{ 'update:modelValue': [value: Blob | null] }>()
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

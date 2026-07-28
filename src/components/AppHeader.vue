<script setup>
import { useRouter } from 'vue-router'
import AvatarMenu from './AvatarMenu.vue'
import logo from '../assets/logo.png'

const router = useRouter()
</script>

<template>
  <header class="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-amber-100 px-6 py-4 flex items-center justify-between">
    <button @click="router.push('/')" class="flex items-center gap-3 cursor-pointer">
      <img :src="logo" alt="Chorgi" class="w-16 h-16" />
      <span class="text-3xl font-bold text-amber-900">Chorgi</span>
    </button>
    <AvatarMenu />
  </header>
</template>

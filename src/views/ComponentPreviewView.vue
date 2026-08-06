<script setup lang="ts">
import { ref } from 'vue'
import { addHours, addMinutes } from 'date-fns'
import ChoreCard from '../components/ChoreCard.vue'
import ChoreForm from '../components/ChoreForm.vue'
import IconPicker from '../components/IconPicker.vue'
import PhotoUpload from '../components/PhotoUpload.vue'
import VideoUpload from '../components/VideoUpload.vue'
import PhotoLightbox from '../components/PhotoLightbox.vue'
import CountdownLabel from '../components/CountdownLabel.vue'
import ConfettiBurst from '../components/ConfettiBurst.vue'
import AddChildTile from '../components/AddChildTile.vue'
import { FORM_KIND, type FormKind, type ConfettiMode } from '../lib/constants'
import type { ChoreFormPayload, Child, Room } from '../types/firebase'

const dummyChildren = [
  { id: 'c1', name: 'Hadassah' },
  { id: 'c2', name: 'Samuel' },
  { id: 'c3', name: 'River' },
] as unknown as Child[]
const dummyRooms = [
  { id: 'r1', name: 'Kitchen' },
  { id: 'r2', name: 'Living Room' },
] as unknown as Room[]

const icon = ref('mdi:broom')
const photoFile = ref<Blob | null>(null)
const videoFile = ref<Blob | null>(null)

const lightboxOpen = ref(false)
const confettiRef = ref<{ fire: (mode?: ConfettiMode) => void } | null>(null)

const formKind = ref<FormKind>(FORM_KIND.RECURRING_CHORE)

function onFormSubmit(data: ChoreFormPayload) {
  console.log('form submit', data)
  alert('Submitted! Check the console for the payload.')
}

function onUnassign() {
  alert('Unassign clicked!')
}
</script>

<template>
  <div class="min-h-screen bg-amber-50 p-6 flex flex-col gap-10 max-w-3xl mx-auto">
    <h1 class="text-3xl font-bold text-amber-900">Phase 4 Component Preview</h1>

    <section class="flex flex-col gap-3">
      <h2 class="text-xl font-bold text-amber-800">ChoreCard</h2>
      <ChoreCard
        name="Feed the dog"
        icon-name="mdi:dog"
        :deadline="addHours(new Date(), 3)"
      />
      <ChoreCard
        name="Take out trash"
        icon-name="mdi:trash-can"
        :deadline="addMinutes(new Date(), -30)"
        overdue
      />
      <ChoreCard
        name="Clean room"
        icon-name="mdi:bed"
        completed
        late
      />
      <ChoreCard
        name="Wash dishes"
        icon-name="mdi:silverware-clean"
        claimed-by-name="Samuel"
        claimed-by-photo="https://api.dicebear.com/7.x/avataaars/svg?seed=Samuel"
        disabled
        variant="task"
      />
      <ChoreCard
        name="Mow the lawn"
        icon-name="mdi:grass"
        :bonus-cents="500"
        variant="task"
      />
      <ChoreCard name="Vacuum stairs (missed yesterday)" icon-name="mdi:vacuum" missed />
      <ChoreCard
        name="Feed the cat"
        icon-name="mdi:cat"
        :deadline="addHours(new Date(), 2)"
        can-unassign
        @unassign="onUnassign"
      />
      <ChoreCard
        name="Water plants"
        icon-name="mdi:flower"
        claimed-by-name="River"
        claimed-by-photo="https://api.dicebear.com/7.x/avataaars/svg?seed=River"
        can-unassign
        variant="task"
        @unassign="onUnassign"
      />
    </section>

    <section class="flex flex-col gap-3">
      <h2 class="text-xl font-bold text-amber-800">CountdownLabel</h2>
      <div class="flex gap-4">
        <CountdownLabel :deadline="addHours(new Date(), 5)" />
        <CountdownLabel :deadline="addMinutes(new Date(), -10)" />
      </div>
    </section>

    <section class="flex flex-col gap-3">
      <h2 class="text-xl font-bold text-amber-800">ConfettiBurst</h2>
      <ConfettiBurst ref="confettiRef" />
      <div class="flex gap-2">
        <button @click="confettiRef?.fire('confetti')" class="bg-amber-500 text-white font-bold py-2 px-4 rounded-xl cursor-pointer">Confetti</button>
        <button @click="confettiRef?.fire('coins')" class="bg-amber-500 text-white font-bold py-2 px-4 rounded-xl cursor-pointer">Coins</button>
        <button @click="confettiRef?.fire('fireworks')" class="bg-amber-500 text-white font-bold py-2 px-4 rounded-xl cursor-pointer">Fireworks</button>
      </div>
    </section>

    <section class="flex flex-col gap-3">
      <h2 class="text-xl font-bold text-amber-800">IconPicker</h2>
      <IconPicker v-model="icon" />
    </section>

    <section class="flex flex-col gap-3">
      <h2 class="text-xl font-bold text-amber-800">PhotoUpload</h2>
      <PhotoUpload v-model="photoFile" label="Chore photo" />
    </section>

    <section class="flex flex-col gap-3">
      <h2 class="text-xl font-bold text-amber-800">VideoUpload</h2>
      <VideoUpload v-model="videoFile" label="Chore video" />
    </section>

    <section class="flex flex-col gap-3">
      <h2 class="text-xl font-bold text-amber-800">PhotoLightbox</h2>
      <button @click="lightboxOpen = true" class="bg-amber-500 text-white font-bold py-2 px-4 rounded-xl self-start cursor-pointer">
        Open lightbox
      </button>
      <PhotoLightbox :open="lightboxOpen" src="/favicon.png" @close="lightboxOpen = false" />
    </section>

    <section class="flex flex-col gap-3">
      <h2 class="text-xl font-bold text-amber-800">AddChildTile (Phase 2, regression check)</h2>
      <div class="w-48">
        <AddChildTile @click="() => {}" />
      </div>
    </section>

    <section class="flex flex-col gap-3 bg-white rounded-2xl p-6 shadow">
      <h2 class="text-xl font-bold text-amber-800">ChoreForm</h2>
      <div class="flex gap-2 flex-wrap">
        <button
          v-for="k in ([FORM_KIND.RECURRING_CHORE, FORM_KIND.ONEOFF_CHORE, FORM_KIND.CLEANING_TASK] as FormKind[])"
          :key="k"
          @click="formKind = k"
          class="px-3 py-1.5 rounded-full border-2 font-medium cursor-pointer"
          :class="formKind === k ? 'border-amber-500 bg-amber-100' : 'border-amber-200'"
        >
          {{ k }}
        </button>
      </div>
      <ChoreForm
        :key="formKind"
        :kind="formKind"
        :children="dummyChildren"
        :rooms="dummyRooms"
        @submit="onFormSubmit"
        @cancel="() => {}"
      />
    </section>
  </div>
</template>

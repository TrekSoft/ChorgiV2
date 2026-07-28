<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { currentUser } from '../composables/useAuth'
import { pendingInvite, createFamily, claimInvite } from '../composables/useFamily'
import { uploadMemberPhoto } from '../lib/photo'
import PhotoPicker from '../components/PhotoPicker.vue'
import logo from '../assets/logo.png'

const router = useRouter()

const name = ref('')
const birthdate = ref('')
const photoFile = ref(null)
const pin = ref('')
const pinConfirm = ref('')
const saving = ref(false)
const error = ref('')

const isInvite = computed(() => !!pendingInvite.value)

const pinValid = computed(() => /^\d{4}$/.test(pin.value) && pin.value === pinConfirm.value)

async function submit() {
  error.value = ''
  if (!isInvite.value && !pinValid.value) {
    error.value = 'PIN must be 4 digits and both entries must match.'
    return
  }
  saving.value = true
  try {
    const uid = currentUser.value.uid
    const familyId = isInvite.value ? pendingInvite.value.familyId : uid
    let photoURL = null
    if (photoFile.value) {
      photoURL = await uploadMemberPhoto(familyId, uid, photoFile.value)
    }
    const profile = { name: name.value.trim(), birthdate: birthdate.value, photoURL }
    if (isInvite.value) {
      await claimInvite(profile)
    } else {
      await createFamily(profile, pin.value)
    }
    router.replace('/')
  } catch (e) {
    error.value = 'Something went wrong saving your profile. Please try again.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <main class="min-h-screen bg-amber-50 flex items-center justify-center p-6">
    <div class="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm flex flex-col items-center gap-6">
      <img :src="logo" alt="Chorgi logo" class="w-24 h-24" />
      <h1 class="text-2xl font-bold text-amber-900 text-center">
        {{ isInvite ? 'Join your family on Chorgi' : 'Set up your family on Chorgi' }}
      </h1>

      <form @submit.prevent="submit" class="w-full flex flex-col gap-4">
        <label class="flex flex-col gap-1">
          <span class="text-amber-800 font-medium">Your name</span>
          <input
            v-model="name"
            type="text"
            required
            class="border-2 border-amber-200 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500"
          />
        </label>

        <label class="flex flex-col gap-1">
          <span class="text-amber-800 font-medium">Your birthday</span>
          <input
            v-model="birthdate"
            type="date"
            required
            class="border-2 border-amber-200 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500"
          />
        </label>

        <PhotoPicker v-model="photoFile" label="Profile photo" />

        <template v-if="!isInvite">
          <label class="flex flex-col gap-1">
            <span class="text-amber-800 font-medium">Family PIN (4 digits)</span>
            <input
              v-model="pin"
              type="password"
              inputmode="numeric"
              maxlength="4"
              required
              class="border-2 border-amber-200 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500"
            />
          </label>
          <label class="flex flex-col gap-1">
            <span class="text-amber-800 font-medium">Confirm PIN</span>
            <input
              v-model="pinConfirm"
              type="password"
              inputmode="numeric"
              maxlength="4"
              required
              class="border-2 border-amber-200 rounded-xl px-4 py-3 focus:outline-none focus:border-amber-500"
            />
          </label>
          <p class="text-amber-600 text-sm">
            This PIN gates all admin actions (schedule, settings, sign-out) — keep it away from the kids.
          </p>
        </template>

        <p v-if="error" class="text-red-500 text-sm">{{ error }}</p>

        <button
          type="submit"
          :disabled="saving"
          class="w-full bg-amber-500 hover:bg-amber-600 text-white text-lg font-bold py-3 rounded-xl disabled:opacity-50"
        >
          {{ saving ? 'Saving…' : isInvite ? 'Join family' : 'Create family' }}
        </button>
      </form>
    </div>
  </main>
</template>

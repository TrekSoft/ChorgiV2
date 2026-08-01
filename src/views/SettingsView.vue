<script setup>
import { ref, watch } from 'vue'
import {
  member,
  familyId,
  family,
  updateOwnProfile,
  changeFamilyPin,
  inviteParent,
  revokeInvite,
  removeAuthorizedParent,
} from '../composables/useFamily'
import { updateMarkPenaltyCents } from '../composables/useAllowance'
import { currentUser } from '../composables/useAuth'
import { familyMembers } from '../composables/useFamilyMembers'
import { pendingInvites } from '../composables/usePendingInvites'
import { uploadMemberPhoto } from '../lib/photo'
import { DEFAULT_MARK_PENALTY_CENTS } from '../lib/constants'
import { dollarsToCents, formatCents } from '../lib/format'
import AppHeader from '../components/AppHeader.vue'
import PhotoPicker from '../components/PhotoPicker.vue'

const name = ref('')
const birthdate = ref('')
const photoFile = ref(null)
const profileSaving = ref(false)
const profileSaved = ref(false)

watch(
  member,
  (m) => {
    if (m) {
      name.value = m.name || ''
      birthdate.value = m.birthdate || ''
    }
  },
  { immediate: true },
)

async function saveProfile() {
  profileSaving.value = true
  profileSaved.value = false
  try {
    let photoURL = member.value?.photoURL || null
    if (photoFile.value) {
      photoURL = await uploadMemberPhoto(familyId.value, currentUser.value.uid, photoFile.value)
    }
    await updateOwnProfile({ name: name.value.trim(), birthdate: birthdate.value, photoURL })
    profileSaved.value = true
  } finally {
    profileSaving.value = false
  }
}

const newPin = ref('')
const newPinConfirm = ref('')
const pinSaving = ref(false)
const pinSaved = ref(false)
const pinError = ref('')

async function savePin() {
  pinError.value = ''
  pinSaved.value = false
  if (!/^\d{4}$/.test(newPin.value) || newPin.value !== newPinConfirm.value) {
    pinError.value = 'PIN must be 4 digits and both entries must match.'
    return
  }
  pinSaving.value = true
  try {
    await changeFamilyPin(newPin.value)
    newPin.value = ''
    newPinConfirm.value = ''
    pinSaved.value = true
  } finally {
    pinSaving.value = false
  }
}

const inviteEmail = ref('')
const inviting = ref(false)
const inviteSent = ref('')
const inviteError = ref('')

const markPenalty = ref('0.50')
const markPenaltySaving = ref(false)
const markPenaltySaved = ref(false)

watch(
  family,
  (f) => {
    if (f) {
      markPenalty.value = formatCents(f.markPenaltyCents ?? DEFAULT_MARK_PENALTY_CENTS)
    }
  },
  { immediate: true },
)

async function saveMarkPenalty() {
  markPenaltySaving.value = true
  markPenaltySaved.value = false
  try {
    await updateMarkPenaltyCents(dollarsToCents(markPenalty.value))
    markPenaltySaved.value = true
  } finally {
    markPenaltySaving.value = false
  }
}

async function sendInvite() {
  if (!inviteEmail.value.trim()) return
  inviting.value = true
  inviteSent.value = ''
  inviteError.value = ''
  try {
    const email = inviteEmail.value.trim()
    await inviteParent(email)
    inviteEmail.value = ''
    inviteSent.value = `${email} is now authorized — they can sign in at Chorgi to join your family.`
  } catch (e) {
    console.error('inviteParent failed', e)
    inviteError.value = 'Could not authorize that email. Please try again.'
  } finally {
    inviting.value = false
  }
}
</script>

<template>
  <div class="page-bg">
    <AppHeader />
    <main class="max-w-xl mx-auto p-4 sm:p-6 flex flex-col gap-8">
      <h1 class="heading-page">Settings</h1>

      <section class="card-shadow p-6 flex flex-col gap-4">
        <h2 class="heading-section">Your profile</h2>
        <label class="flex flex-col gap-1">
          <span class="form-label">Name</span>
          <input v-model="name" type="text" class="input-field" />
        </label>
        <label class="flex flex-col gap-1">
          <span class="form-label">Birthday</span>
          <input v-model="birthdate" type="date" class="input-field" />
        </label>
        <PhotoPicker v-model="photoFile" label="Profile photo" :preview-url="member?.photoURL" />
        <button
          @click="saveProfile"
          :disabled="profileSaving"
          class="btn-primary self-start"
        >
          {{ profileSaving ? 'Saving…' : 'Save profile' }}
        </button>
        <p v-if="profileSaved" class="text-success">Saved!</p>
      </section>

      <section class="card-shadow p-6 flex flex-col gap-4">
        <h2 class="heading-section">Family PIN</h2>
        <p class="text-amber-600 text-sm">This one PIN is shared by every parent on the account.</p>
        <label class="flex flex-col gap-1">
          <span class="form-label">New PIN</span>
          <input v-model="newPin" type="password" inputmode="numeric" maxlength="4" class="input-field" />
        </label>
        <label class="flex flex-col gap-1">
          <span class="form-label">Confirm new PIN</span>
          <input v-model="newPinConfirm" type="password" inputmode="numeric" maxlength="4" class="input-field" />
        </label>
        <p v-if="pinError" class="text-error">{{ pinError }}</p>
        <button
          @click="savePin"
          :disabled="pinSaving"
          class="btn-primary self-start"
        >
          {{ pinSaving ? 'Saving…' : 'Change PIN' }}
        </button>
        <p v-if="pinSaved" class="text-success">PIN updated!</p>
      </section>

      <section class="card-shadow p-6 flex flex-col gap-4">
        <h2 class="heading-section">Mark penalty</h2>
        <p class="text-amber-600 text-sm">Each mark deducts this amount from a child's allowance balance.</p>
        <label class="flex flex-col gap-1">
          <span class="form-label">Penalty per mark ($)</span>
          <input v-model="markPenalty" type="number" min="0" step="0.25" class="input-field" />
        </label>
        <button
          @click="saveMarkPenalty"
          :disabled="markPenaltySaving"
          class="btn-primary self-start"
        >
          {{ markPenaltySaving ? 'Saving…' : 'Save penalty' }}
        </button>
        <p v-if="markPenaltySaved" class="text-success">Saved!</p>
      </section>

      <section class="card-shadow p-6 flex flex-col gap-4">
        <h2 class="heading-section">Parents</h2>
        <ul class="flex flex-col gap-2">
          <li
            v-for="m in familyMembers"
            :key="m.id"
            class="flex items-center justify-between bg-amber-50 rounded-xl px-4 py-2"
          >
            <span class="text-amber-900 font-medium">
              {{ m.name }}
              <span v-if="m.id === familyId" class="text-amber-400 text-sm font-normal">(main parent)</span>
            </span>
            <button
              v-if="m.id !== currentUser.uid && m.id !== familyId"
              @click="removeAuthorizedParent(m.id)"
              class="btn-danger-text"
            >
              Remove
            </button>
          </li>
        </ul>

        <ul v-if="pendingInvites.length" class="flex flex-col gap-2">
          <li
            v-for="invite in pendingInvites"
            :key="invite.id"
            class="flex items-center justify-between bg-amber-50 rounded-xl px-4 py-2"
          >
            <span class="text-amber-700">{{ invite.email }} <span class="text-amber-400 text-sm">(authorized, not signed in yet)</span></span>
            <button
              @click="revokeInvite(invite.id)"
              class="btn-danger-text"
            >
              Revoke
            </button>
          </li>
        </ul>

        <div class="flex gap-2 pt-2">
          <input
            v-model="inviteEmail"
            type="email"
            placeholder="parent@example.com"
            class="input-field flex-1"
          />
          <button
            @click="sendInvite"
            :disabled="inviting"
            class="btn-primary"
          >
            Authorize
          </button>
        </div>
        <p v-if="inviteSent" class="text-success">{{ inviteSent }}</p>
        <p v-if="inviteError" class="text-error">{{ inviteError }}</p>
        <p class="text-amber-600 text-sm">
          No email is sent. They just need to sign in with this exact email at Chorgi and they'll automatically join your family.
        </p>
      </section>
    </main>
  </div>
</template>

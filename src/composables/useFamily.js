import { ref, watch } from 'vue'
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { currentUser } from './useAuth'
import { hashPin } from '../lib/pin'

export const familyId = ref(null)
export const family = ref(null)
export const member = ref(null)
export const familyLoading = ref(true)
export const needsOnboarding = ref(false)
export const pendingInvite = ref(null)

export function waitForFamilyReady() {
  if (!familyLoading.value) return Promise.resolve()
  return new Promise((resolve) => {
    const unwatch = watch(familyLoading, (loading) => {
      if (!loading) {
        unwatch()
        resolve()
      }
    })
  })
}

let unsubscribeFamily = null
let unsubscribeMember = null

function resetFamilyState() {
  unsubscribeFamily?.()
  unsubscribeMember?.()
  unsubscribeFamily = null
  unsubscribeMember = null
  familyId.value = null
  family.value = null
  member.value = null
  pendingInvite.value = null
  needsOnboarding.value = false
  familyLoading.value = true
}

function bindFamily(id) {
  familyId.value = id
  needsOnboarding.value = false
  unsubscribeFamily = onSnapshot(doc(db, 'families', id), (snap) => {
    family.value = snap.data()
    familyLoading.value = false
  })
  unsubscribeMember = onSnapshot(doc(db, 'families', id, 'members', currentUser.value.uid), (snap) => {
    member.value = snap.data()
  })
}

async function loadFamily(user) {
  familyLoading.value = true
  try {
    const indexSnap = await getDoc(doc(db, 'userIndex', user.uid))
    if (indexSnap.exists()) {
      bindFamily(indexSnap.data().familyId)
      return
    }
    const email = user.email.toLowerCase()
    const inviteSnap = await getDoc(doc(db, 'invites', email))
    if (inviteSnap.exists()) {
      pendingInvite.value = { email, familyId: inviteSnap.data().familyId }
    }
    needsOnboarding.value = true
  } catch (e) {
    console.error('Failed to load family for user', e)
    needsOnboarding.value = true
  } finally {
    if (!familyId.value) familyLoading.value = false
  }
}

watch(
  currentUser,
  (user) => {
    // undefined = Firebase hasn't reported auth state yet; wait for the real value
    if (user === undefined) return
    resetFamilyState()
    if (user) {
      loadFamily(user)
    } else {
      familyLoading.value = false
    }
  },
  { immediate: true },
)

export async function createFamily(profile, pin) {
  const uid = currentUser.value.uid
  const pinHash = await hashPin(pin, uid)
  const batch = writeBatch(db)
  batch.set(doc(db, 'families', uid), {
    pinHash,
    authorizedUids: [uid],
    weekStartsOn: 0,
    createdAt: serverTimestamp(),
  })
  batch.set(doc(db, 'families', uid, 'members', uid), {
    ...profile,
    createdAt: serverTimestamp(),
  })
  batch.set(doc(db, 'userIndex', uid), { familyId: uid })
  await batch.commit()
  bindFamily(uid)
}

export async function updateOwnProfile(profile) {
  const uid = currentUser.value.uid
  await updateDoc(doc(db, 'families', familyId.value, 'members', uid), { ...profile })
}

export async function changeFamilyPin(newPin) {
  const pinHash = await hashPin(newPin, familyId.value)
  await updateDoc(doc(db, 'families', familyId.value), { pinHash })
}

export async function inviteParent(email) {
  const normalizedEmail = email.trim().toLowerCase()
  const batch = writeBatch(db)
  batch.set(doc(db, 'invites', normalizedEmail), {
    familyId: familyId.value,
    createdAt: serverTimestamp(),
  })
  batch.set(doc(db, 'families', familyId.value, 'pendingInvites', normalizedEmail), {
    email: normalizedEmail,
    createdAt: serverTimestamp(),
  })
  await batch.commit()
}

export async function revokeInvite(email) {
  const batch = writeBatch(db)
  batch.delete(doc(db, 'invites', email))
  batch.delete(doc(db, 'families', familyId.value, 'pendingInvites', email))
  await batch.commit()
}

export async function removeAuthorizedParent(uid) {
  await updateDoc(doc(db, 'families', familyId.value), { authorizedUids: arrayRemove(uid) })
}

export async function claimInvite(profile) {
  const uid = currentUser.value.uid
  const { email, familyId: fid } = pendingInvite.value
  const batch = writeBatch(db)
  batch.update(doc(db, 'families', fid), { authorizedUids: arrayUnion(uid) })
  batch.set(doc(db, 'families', fid, 'members', uid), {
    ...profile,
    createdAt: serverTimestamp(),
  })
  batch.set(doc(db, 'userIndex', uid), { familyId: fid })
  batch.delete(doc(db, 'invites', email))
  batch.delete(doc(db, 'families', fid, 'pendingInvites', email))
  await batch.commit()
  bindFamily(fid)
}

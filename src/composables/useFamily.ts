import { ref, watch } from 'vue'
import type { User } from 'firebase/auth'
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
import { WEEK_START_SUNDAY } from '../lib/constants'
import type { Family, Member, MemberDoc } from '../types/firebase'
import { familyConverter, memberConverter } from '../types/firebase'

export const familyId = ref<string | null>(null)
export const family = ref<Family | null>(null)
export const member = ref<Member | null>(null)
export const familyLoading = ref(true)
export const needsOnboarding = ref(false)
export const pendingInvite = ref<{ email: string; familyId: string } | null>(null)
export const connectionError = ref(false)

export function clearConnectionError(): void {
  connectionError.value = false
}

export function waitForFamilyReady(): Promise<void> {
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

let unsubscribeFamily: (() => void) | null = null
let unsubscribeMember: (() => void) | null = null

function resetFamilyState(): void {
  unsubscribeFamily?.()
  unsubscribeMember?.()
  unsubscribeFamily = null
  unsubscribeMember = null
  familyId.value = null
  family.value = null
  member.value = null
  pendingInvite.value = null
  needsOnboarding.value = false
  connectionError.value = false
  familyLoading.value = false
}

function bindFamily(id: string): void {
  familyId.value = id
  needsOnboarding.value = false
  unsubscribeFamily = onSnapshot(
    doc(db, 'families', id).withConverter(familyConverter),
    (snap) => {
      family.value = snap.data() ?? null
      familyLoading.value = false
    },
    (err) => {
      console.error('Family snapshot error', err)
      // Stale userIndex pointing at a family this user is no longer authorized for:
      // delete the stale index and reload, which routes to onboarding / pending invite.
      unsubscribeFamily?.()
      unsubscribeFamily = null
      unsubscribeMember?.()
      unsubscribeMember = null
      familyId.value = null
      family.value = null
      member.value = null
      familyLoading.value = false
      const user = currentUser.value
      if (user) {
        deleteDoc(doc(db, 'userIndex', user.uid))
          .catch(() => {})
          .finally(() => loadFamily(user))
      } else {
        needsOnboarding.value = true
      }
    },
  )
  const uid = currentUser.value!.uid
  unsubscribeMember = onSnapshot(
    doc(db, 'families', id, 'members', uid).withConverter(memberConverter),
    (snap) => {
      member.value = snap.data() ?? null
    },
  )
}

async function loadFamily(user: User): Promise<void> {
  familyLoading.value = true
  try {
    const indexSnap = await getDoc(doc(db, 'userIndex', user.uid))
    if (indexSnap.exists()) {
      bindFamily(indexSnap.data()!.familyId)
      return
    }
    const email = user.email!.toLowerCase()
    const inviteSnap = await getDoc(doc(db, 'invites', email))
    if (inviteSnap.exists()) {
      pendingInvite.value = { email, familyId: inviteSnap.data()!.familyId }
    }
    needsOnboarding.value = true
  } catch (e) {
    console.error('Failed to load family for user', e)
    connectionError.value = true
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

export interface MemberProfile {
  name: string
  birthdate: string
  photoURL?: string | null
}

export async function createFamily(profile: MemberProfile, pin: string): Promise<void> {
  const uid = currentUser.value!.uid
  const pinHash = await hashPin(pin, uid)
  const batch = writeBatch(db)
  batch.set(doc(db, 'families', uid), {
    pinHash,
    authorizedUids: [uid],
    weekStartsOn: WEEK_START_SUNDAY,
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

export async function updateOwnProfile(profile: Partial<MemberDoc>): Promise<void> {
  const uid = currentUser.value!.uid
  await updateDoc(doc(db, 'families', familyId.value!, 'members', uid), { ...profile })
}

export async function changeFamilyPin(newPin: string): Promise<void> {
  const pinHash = await hashPin(newPin, familyId.value!)
  await updateDoc(doc(db, 'families', familyId.value!), { pinHash })
}

export async function inviteParent(email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase()
  const batch = writeBatch(db)
  batch.set(doc(db, 'invites', normalizedEmail), {
    familyId: familyId.value!,
    createdAt: serverTimestamp(),
  })
  batch.set(doc(db, 'families', familyId.value!, 'pendingInvites', normalizedEmail), {
    email: normalizedEmail,
    createdAt: serverTimestamp(),
  })
  await batch.commit()
}

export async function revokeInvite(email: string): Promise<void> {
  const batch = writeBatch(db)
  batch.delete(doc(db, 'invites', email))
  batch.delete(doc(db, 'families', familyId.value!, 'pendingInvites', email))
  await batch.commit()
}

export async function removeAuthorizedParent(uid: string): Promise<void> {
  const batch = writeBatch(db)
  batch.update(doc(db, 'families', familyId.value!), { authorizedUids: arrayRemove(uid) })
  batch.delete(doc(db, 'families', familyId.value!, 'members', uid))
  batch.delete(doc(db, 'userIndex', uid))
  await batch.commit()
}

export async function claimInvite(profile: MemberProfile): Promise<void> {
  const uid = currentUser.value!.uid
  const { email, familyId: fid } = pendingInvite.value!
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

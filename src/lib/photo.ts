import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import type { StorageReference } from 'firebase/storage'
import { storage } from './firebase'

export async function fileToResizedBlob(file: Blob, maxSize = 1024): Promise<Blob | null> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
}

export async function uploadFamilyPhoto(familyId: string, subPath: string, file: Blob): Promise<string> {
  const blob = await fileToResizedBlob(file)
  const path = `families/${familyId}/${subPath}/photo.jpg`
  const ref = storageRef(storage, path) as StorageReference
  await uploadBytes(ref, blob!, { contentType: 'image/jpeg' })
  return getDownloadURL(ref)
}

export function uploadMemberPhoto(familyId: string, memberUid: string, file: Blob): Promise<string> {
  return uploadFamilyPhoto(familyId, `members/${memberUid}`, file)
}

export function uploadChildPhoto(familyId: string, childId: string, file: Blob): Promise<string> {
  return uploadFamilyPhoto(familyId, `children/${childId}`, file)
}

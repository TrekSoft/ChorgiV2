import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from './firebase'

export async function fileToResizedBlob(file, maxSize = 512) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
}

export async function uploadFamilyPhoto(familyId, subPath, file) {
  const blob = await fileToResizedBlob(file)
  const path = `families/${familyId}/${subPath}/photo.jpg`
  await uploadBytes(storageRef(storage, path), blob, { contentType: 'image/jpeg' })
  return getDownloadURL(storageRef(storage, path))
}

export function uploadMemberPhoto(familyId, memberUid, file) {
  return uploadFamilyPhoto(familyId, `members/${memberUid}`, file)
}

export function uploadChildPhoto(familyId, childId, file) {
  return uploadFamilyPhoto(familyId, `children/${childId}`, file)
}

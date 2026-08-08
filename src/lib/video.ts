import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import type { StorageReference } from 'firebase/storage'
import { storage } from './firebase'

const EXT_BY_TYPE: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/webm': 'webm',
  'video/ogg': 'ogv',
}

function extensionForType(type: string): string {
  return EXT_BY_TYPE[type] || 'mp4'
}

/** Capture a poster frame from a video file and return it as a resized JPEG blob. */
export async function videoThumbnailBlob(file: Blob, maxSize = 1280): Promise<Blob | null> {
  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.src = url
  video.muted = true
  video.playsInline = true
  video.preload = 'metadata'
  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve()
      video.onerror = () => reject(new Error('Failed to load video'))
    })
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve()
      // seek slightly past the start to avoid an all-black first frame
      const target = Math.min(0.1, (video.duration || 0) / 2)
      if (Number.isFinite(target) && target > 0) video.currentTime = target
      else resolve()
    })
    const w = video.videoWidth
    const h = video.videoHeight
    if (!w || !h) return null
    const scale = Math.min(1, maxSize / Math.max(w, h))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(w * scale)
    canvas.height = Math.round(h * scale)
    canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height)
    return await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
  } catch {
    return null
  } finally {
    URL.revokeObjectURL(url)
  }
}

export interface UploadedVideo {
  videoURL: string
  videoThumbURL: string | null
}

const MAX_VIDEO_SIZE = 100 * 1024 * 1024

export async function uploadFamilyVideo(
  familyId: string,
  subPath: string,
  file: Blob,
): Promise<UploadedVideo> {
  const type = file.type || 'video/mp4'
  const ext = extensionForType(type)
  if (file.size > MAX_VIDEO_SIZE) {
    throw new Error(`Video is ${Math.round(file.size / 1024 / 1024)}MB — max is 100MB. Try a shorter clip.`)
  }
  console.debug('[uploadFamilyVideo] size=%d bytes type=%s', file.size, type)
  const videoRef = storageRef(storage, `families/${familyId}/${subPath}/video.${ext}`) as StorageReference
  await uploadBytes(videoRef, file, { contentType: type })
  const videoURL = await getDownloadURL(videoRef)

  const thumb = await videoThumbnailBlob(file)
  let videoThumbURL: string | null = null
  if (thumb) {
    const thumbRef = storageRef(storage, `families/${familyId}/${subPath}/video-thumb.jpg`) as StorageReference
    await uploadBytes(thumbRef, thumb, { contentType: 'image/jpeg' })
    videoThumbURL = await getDownloadURL(thumbRef)
  }

  return { videoURL, videoThumbURL }
}

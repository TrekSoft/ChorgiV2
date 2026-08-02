import { familyId, family } from './useFamily'
import { hashPin } from '../lib/pin'

export async function verifyPin(pin: string): Promise<boolean> {
  if (!familyId.value || !family.value) return false
  return (await hashPin(pin, familyId.value)) === family.value.pinHash
}

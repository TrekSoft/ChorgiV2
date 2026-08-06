import type {
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
  Timestamp,
} from 'firebase/firestore'
import type { ChoreKind } from '../lib/constants'
import type { FormKind } from '../lib/constants'

// ── Primitive type aliases ──────────────────────────────────────────────────

/** Firestore Timestamp or null (serverTimestamp() resolves to Timestamp on read) */
type MaybeTimestamp = Timestamp | null

/** 'HH:mm' time string format */
type TimeString = string

/** 'yyyy-MM-dd' date string format */
type DateString = string

/** 'yyyy-Www' week key format */
type WeekKeyString = string

// ── Firestore document interfaces (what lives in the database) ──────────────

export interface FamilyDoc {
  pinHash: string
  authorizedUids: string[]
  weekStartsOn: 0 | 1
  markPenaltyCents?: number
  timePeriods?: TimePeriod[]
  createdAt: MaybeTimestamp
}

export interface MemberDoc {
  name: string
  birthdate: DateString
  photoURL?: string | null
  createdAt: MaybeTimestamp
}

export interface ChildDoc {
  name: string
  birthdate: DateString
  photoURL?: string | null
  weeklyAllowanceCents: number
  allowanceBalanceCents: number
  allowanceLastAccruedDate: DateString | null
  marksCount: number
  order: number
  updatedAt?: MaybeTimestamp
}

export interface MarkDoc {
  childId: string
  delta: 1 | -1
  note?: string
  createdAt: MaybeTimestamp
}

export type RecurrenceType = 'daily' | 'weekdays' | 'oddDays' | 'evenDays' | 'dayOfMonth'

export interface RecurrencePattern {
  type: RecurrenceType
  days?: number[]
  day?: number
}

export interface TimeWindow {
  start?: TimeString | null
  end?: TimeString | null
}

export interface ChoreDoc {
  kind: ChoreKind
  name: string
  iconName?: string | null
  photoURL?: string | null
  assigneeIds: string[]
  weekly?: boolean
  recurrence?: RecurrencePattern | null
  timeWindow?: TimeWindow | null
  timePeriodId?: string | null
  date?: DateString
  bonusCents?: number
  roomId?: string
  order?: number
  active: boolean
  createdAt?: MaybeTimestamp
  updatedAt?: MaybeTimestamp
}

export interface TaskDoc {
  kind: 'cleaning'
  name: string
  iconName?: string | null
  photoURL?: string | null
  roomId: string
  order: number
  assigneeId?: string | null
  bonusCents?: number
  updatedAt?: MaybeTimestamp
}

export interface RoomDoc {
  name: string
  order: number
  updatedAt?: MaybeTimestamp
}

export interface CleaningDayDoc {
  roomIds: string[]
}

export interface CompletionDoc {
  completedAt: MaybeTimestamp
  late: boolean
}

export interface ClaimDoc {
  childId: string
  claimedAt: MaybeTimestamp
  completed: boolean
  completedAt?: MaybeTimestamp | null
}

export interface InviteDoc {
  email: string
  familyId: string
  createdAt: MaybeTimestamp
}

export interface PendingInviteDoc {
  email: string
  createdAt: MaybeTimestamp
}

export interface UserIndexDoc {
  familyId: string
}

export interface TimePeriod {
  id: string
  label: string
  start: TimeString
  end: TimeString
}

// ── App-level interfaces (Firestore doc + document id) ──────────────────────

export interface Family extends FamilyDoc {
  id: string
}

export interface Member extends MemberDoc {
  id: string
}

export interface Child extends ChildDoc {
  id: string
}

export interface Chore extends ChoreDoc {
  id: string
}

export interface Task extends TaskDoc {
  id: string
}

export interface Room extends RoomDoc {
  id: string
}

export interface CleaningDay extends CleaningDayDoc {
  id: string
}

export interface Completion extends CompletionDoc {
  id: string
}

export interface Claim extends ClaimDoc {
  id: string
}

export interface FamilyMember extends MemberDoc {
  id: string
}

export interface PendingInvite extends PendingInviteDoc {
  id: string
}

// ── UI-level types (form payloads, display entries) ─────────────────────────

/** Fields the ChoreForm reads from an existing Chore or Task for editing/prefill. */
export interface ChoreFormInitial {
  id?: string
  name?: string
  iconName?: string | null
  photoURL?: string | null
  assigneeIds?: string[]
  assigneeId?: string | null
  date?: string
  bonusCents?: number
  roomId?: string
  weekly?: boolean
  recurrence?: RecurrencePattern | null
  timeWindow?: TimeWindow | null
  timePeriodId?: string | null
}

/** Payload emitted by ChoreForm on submit — covers all three form kinds. */
export interface ChoreFormPayload {
  name: string
  iconName: string | null
  photoFile: Blob | null
  photoRemoved: boolean
  kind: ChoreKind
  assigneeIds?: string[]
  assigneeId?: string | null
  weekly?: boolean
  recurrence?: RecurrencePattern | null
  timeWindow?: TimeWindow | null
  timePeriodId?: string | null
  date?: string
  bonusCents?: number
  roomId?: string
}

/** Structural type for items that can be claimed (both Chore and Task satisfy this). */
export interface ClaimableItem {
  id: string
  name: string
  kind: ChoreKind
  iconName?: string | null
  photoURL?: string | null
  bonusCents?: number
  assigneeId?: string | null
}

/** A calendar day entry in CalendarTab. */
export interface ScheduleEntry {
  key: string
  kind: FormKind
  item: Chore
  assignees: Child[]
  assignedToAll: boolean
  claimable: boolean
  sortKey: string
}

/** An assigned chore entry in ChildView. */
export interface AssignedEntry {
  chore: Chore
  completed: boolean
  late: boolean
  overdue: boolean
  deadline: Date
}

// ── FirestoreDataConverter factory ──────────────────────────────────────────
//
// A generic converter that strips the `id` field before writing to Firestore
// and merges it back from the snapshot id on read. This is the standard pattern
// for collections where the doc id is not stored as a field.

function createConverter<T extends { id: string }>(): FirestoreDataConverter<T> {
  return {
    toFirestore(model: T): Record<string, unknown> {
      const { id: _id, ...data } = model
      return data
    },
    fromFirestore(snapshot: QueryDocumentSnapshot, _options: SnapshotOptions): T {
      return { id: snapshot.id, ...snapshot.data() } as T
    },
  }
}

// ── Converters for each collection ──────────────────────────────────────────

export const familyConverter = createConverter<Family>()
export const memberConverter = createConverter<Member>()
export const childConverter = createConverter<Child>()
export const choreConverter = createConverter<Chore>()
export const taskConverter = createConverter<Task>()
export const roomConverter = createConverter<Room>()
export const cleaningDayConverter = createConverter<CleaningDay>()
export const completionConverter = createConverter<Completion>()
export const claimConverter = createConverter<Claim>()
export const inviteConverter = createConverter<InviteDoc & { id: string }>()
export const pendingInviteConverter = createConverter<PendingInvite>()
export const userIndexConverter = createConverter<UserIndexDoc & { id: string }>()
export const markConverter = createConverter<MarkDoc & { id: string }>()

// ── Helper: typed collection/doc references ─────────────────────────────────
//
// These are NOT used directly — the converters are imported in composables
// and passed to collection()/doc() calls via withConverter().
// Kept here as the single source of truth for all collection converters.

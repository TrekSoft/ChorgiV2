import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import HomeView from './views/HomeView.vue'
import AuthView from './views/AuthView.vue'
import AuthFinishView from './views/AuthFinishView.vue'
import OnboardingView from './views/OnboardingView.vue'
import SettingsView from './views/SettingsView.vue'
import ScheduleView from './views/ScheduleView.vue'
import ReportsView from './views/ReportsView.vue'
import ChildView from './views/ChildView.vue'
import ParentView from './views/ParentView.vue'
import ComponentPreviewView from './views/ComponentPreviewView.vue'
import ConnectionErrorView from './views/ConnectionErrorView.vue'
import { currentUser, authReadyPromise } from './composables/useAuth'
import { needsOnboarding, waitForFamilyReady, connectionError } from './composables/useFamily'

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/auth', name: 'auth', component: AuthView },
  { path: '/auth/finish', name: 'auth-finish', component: AuthFinishView },
  { path: '/onboarding', name: 'onboarding', component: OnboardingView },
  { path: '/settings', name: 'settings', component: SettingsView },
  { path: '/schedule', name: 'schedule', component: ScheduleView },
  { path: '/reports', name: 'reports', component: ReportsView },
  { path: '/child/:id', name: 'child', component: ChildView },
  { path: '/parent', name: 'parent', component: ParentView },
  { path: '/dev/components', name: 'dev-components', component: ComponentPreviewView },
  { path: '/connection-error', name: 'connection-error', component: ConnectionErrorView },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to) {
    if (to.name === 'schedule') return false
    return { top: 0 }
  },
})

router.beforeEach(async (to) => {
  await authReadyPromise
  if (to.path.startsWith('/auth')) return true
  if (to.path === '/connection-error') return true
  if (!currentUser.value) return { path: '/auth' }
  await waitForFamilyReady()
  if (connectionError.value && to.path !== '/connection-error') return { path: '/connection-error' }
  if (needsOnboarding.value && to.path !== '/onboarding') return { path: '/onboarding' }
  if (!needsOnboarding.value && to.path === '/onboarding') return { path: '/' }
  return true
})

export default router

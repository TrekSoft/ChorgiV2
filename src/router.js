import { createRouter, createWebHistory } from 'vue-router'
import HomeView from './views/HomeView.vue'
import AuthView from './views/AuthView.vue'
import AuthFinishView from './views/AuthFinishView.vue'
import OnboardingView from './views/OnboardingView.vue'
import SettingsView from './views/SettingsView.vue'
import ScheduleView from './views/ScheduleView.vue'
import ReportsView from './views/ReportsView.vue'
import ChildView from './views/ChildView.vue'
import ComponentPreviewView from './views/ComponentPreviewView.vue'
import { currentUser, authReadyPromise } from './composables/useAuth'
import { needsOnboarding, waitForFamilyReady } from './composables/useFamily'

const routes = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/auth', name: 'auth', component: AuthView },
  { path: '/auth/finish', name: 'auth-finish', component: AuthFinishView },
  { path: '/onboarding', name: 'onboarding', component: OnboardingView },
  { path: '/settings', name: 'settings', component: SettingsView },
  { path: '/schedule', name: 'schedule', component: ScheduleView },
  { path: '/reports', name: 'reports', component: ReportsView },
  { path: '/child/:id', name: 'child', component: ChildView },
  { path: '/dev/components', name: 'dev-components', component: ComponentPreviewView },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  await authReadyPromise
  if (to.path.startsWith('/auth')) return true
  if (!currentUser.value) return { path: '/auth' }
  await waitForFamilyReady()
  if (needsOnboarding.value && to.path !== '/onboarding') return { path: '/onboarding' }
  if (!needsOnboarding.value && to.path === '/onboarding') return { path: '/' }
  return true
})

export default router

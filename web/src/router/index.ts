import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('../views/HomeView.vue') },
    { path: '/login', name: 'login', component: () => import('../views/LoginView.vue') },
    { path: '/register', name: 'register', component: () => import('../views/RegisterView.vue') },
    { path: '/campaigns', name: 'campaigns', component: () => import('../views/CampaignListView.vue') },
    { path: '/campaigns/:id', name: 'campaign-detail', component: () => import('../views/CampaignDetailView.vue') },
    {
      path: '/me',
      name: 'me',
      component: () => import('../views/MyActivityView.vue'),
      meta: { requiresAuth: true },
    },
    { path: '/creator', redirect: '/ops' },
    {
      path: '/ops',
      name: 'ops',
      component: () => import('../views/creator/CreatorHomeView.vue'),
      meta: { requiresAuth: true, roles: ['MANAGER', 'ADMIN'] },
    },
    {
      path: '/ops/campaigns/new',
      name: 'ops-new',
      component: () => import('../views/creator/CreatorCampaignFormView.vue'),
      meta: { requiresAuth: true, roles: ['MANAGER', 'ADMIN'] },
    },
    {
      path: '/ops/campaigns/:id',
      name: 'ops-campaign',
      component: () => import('../views/creator/CreatorCampaignManageView.vue'),
      meta: { requiresAuth: true, roles: ['MANAGER', 'ADMIN'] },
    },
    {
      path: '/admin',
      name: 'admin',
      component: () => import('../views/admin/AdminHomeView.vue'),
      meta: { requiresAuth: true, roles: ['ADMIN'] },
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.token) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (auth.token && !auth.user) {
    try {
      await auth.loadMe()
    } catch {
      auth.logout()
      return { name: 'login', query: { redirect: to.fullPath } }
    }
  }
  const roles = to.meta.roles as string[] | undefined
  if (roles?.length && auth.user && !roles.includes(auth.user.role)) {
    return { name: 'home' }
  }
  return true
})

export default router

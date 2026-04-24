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
      path: '/setup',
      name: 'setup',
      component: () => import('../views/AccountSetupView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/my-page',
      name: 'my-page',
      component: () => import('../views/MyPageView.vue'),
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

  // 1. [절대 1순위] 토큰은 있는데 유저 정보가 없으면 서버에서 로드
  if (auth.token && !auth.user) {
    try {
      await auth.loadMe()
    } catch {
      auth.logout()
      return { name: 'login', query: { redirect: to.fullPath } }
    }
  }

  // 2. [절대 2순위: Force Protocol] 로그인된 유저가 설정 페이지를 벗어나려 할 때 강제 제어
  const isSetupPath = to.path === '/setup' || to.name === 'setup'
  const isAuthPath = ['login', 'register'].includes(String(to.name))
  const isHomePath = to.path === '/' || to.name === 'home'
  
  // 프로필 정보가 하나라도 없고, 현재 '홈'도 아니고 '설정/인증' 페이지도 아닌 경우에만 강제 이동
  if (auth.token && auth.user && auth.isProfileIncomplete && !isSetupPath && !isAuthPath && !isHomePath) {
    return { name: 'setup' }
  }

  // 3. 페이지별 권한 확인 (설정 페이지 통과 후 또는 기존 유저)
  if (to.meta.requiresAuth && !auth.token) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  // 4. 권한(Role) 확인
  const roles = to.meta.roles as string[] | undefined
  if (roles?.length && auth.user && !roles.includes(auth.user.role)) {
    return { name: 'home' }
  }

  return true
})

export default router

import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import PDVView from '../views/PDVView.vue'
import DashboardView from '../views/DashboardView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'login',
      component: LoginView
    },
    {
      path: '/pdv',
      name: 'pdv',
      component: PDVView,
      meta: { requiresAuth: true }
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: DashboardView,
      meta: { requiresAuth: true, requiresAdmin: true }
    }
  ]
})

// Guarda de navegação
router.beforeEach((to, from, next) => {
  const isAuthenticated = localStorage.getItem('pdv_token')
  
  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/')
  } else if (to.meta.requiresAdmin) {
    const user = JSON.parse(localStorage.getItem('pdv_user') || '{}')
    if (user.tipo !== 'admin') {
      next('/pdv')
    } else {
      next()
    }
  } else {
    next()
  }
})

export default router
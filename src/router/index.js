import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '../views/Dashboard.vue'
import OrderAdminView from '../views/OrderAdmin.vue'
import OrderCustomerView from '../views/OrderCustomer.vue'
import LoginView from '../views/Login.vue'

const routes = [
  {
    path: '/',
    redirect: '/login',
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: {
      hideSidebar: true,
      guestOnly: true,
    },
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: DashboardView,
    meta: {
      requiresAdmin: true,
    },
  },
  {
    path: '/order',
    name: 'order',
    component: OrderCustomerView,
    meta: {
      requiresCustomer: true,
    },
  },
  {
    path: '/order-admin',
    name: 'order-admin',
    component: OrderAdminView,
    meta: {
      requiresAdmin: true,
    },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

const getStoredRole = () => {
  const token = localStorage.getItem('token')
  const role = localStorage.getItem('userRole')

  if (token && role === 'admin') return 'admin'
  if (role === 'customer') return 'customer'
  return null
}

router.beforeEach((to) => {
  const role = getStoredRole()
  const isAuthenticated = role === 'admin' || role === 'customer'

  if (to.path === '/') {
    if (role === 'admin') {
      return { name: 'dashboard' }
    }

    if (role === 'customer') {
      return { name: 'order' }
    }

    return { name: 'login' }
  }

  if (to.meta.requiresAdmin && role !== 'admin') {
    return role === 'customer' ? { name: 'order' } : { name: 'login' }
  }

  if (to.meta.requiresCustomer && role !== 'customer') {
    return role === 'admin' ? { name: 'order-admin' } : { name: 'login' }
  }

  if ((to.meta.requiresAdmin || to.meta.requiresCustomer) && !isAuthenticated) {
    return { name: 'login' }
  }

  if (to.meta.guestOnly && isAuthenticated) {
    return role === 'admin' ? { name: 'dashboard' } : { name: 'order' }
  }

  return true
})

export default router

import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '../views/Dashboard.vue'
import OrderCustomerView from '../views/OrderCustomer.vue'
import OrderManageView from '../views/OrderManage.vue'
import ProductListView from '../views/ProductList.vue'
import AdminProdukView from '../views/AdminProduk.vue'
import LoginView from '../views/Login.vue'
import UsersManagementView from '../views/UsersManagement.vue'

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
    path: '/produk',
    name: 'produk',
    component: ProductListView,
    meta: {
      requiresCustomer: true,
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
    path: '/order-manage',
    name: 'order-manage',
    component: OrderManageView,
    meta: {
      requiresCustomer: true,
    },
  },
  {
    path: '/users',
    name: 'users',
    component: UsersManagementView,
    meta: {
      requiresAdmin: true,
    },
  },
  {
    path: '/admin-produk',
    name: 'admin-produk',
    component: AdminProdukView,
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
  if (role === 'kasir' || role === 'customer') return 'kasir'
  return null
}

router.beforeEach((to) => {
  const role = getStoredRole()
  const isAuthenticated = role === 'admin' || role === 'kasir'

  if (to.path === '/') {
    if (role === 'admin') {
      return { name: 'dashboard' }
    }

    if (role === 'kasir') {
      return { name: 'order' }
    }

    return { name: 'login' }
  }

  if (to.meta.requiresAdmin && role !== 'admin') {
    return role === 'kasir' ? { name: 'order' } : { name: 'login' }
  }

  if (to.meta.requiresCustomer && role !== 'kasir') {
    return role === 'admin' ? { name: 'dashboard' } : { name: 'login' }
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

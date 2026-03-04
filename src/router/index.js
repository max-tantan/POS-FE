import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '../views/Dasboard.vue'
import OrderView from '../views/Order.vue'

const routes = [
  {
    path: '/',
    redirect: '/dashboard',
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: DashboardView,
  },
  {
    path: '/order',
    name: 'order',
    component: OrderView,
  },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})

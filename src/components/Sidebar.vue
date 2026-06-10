<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const isSidebarOpen = ref(true)
const isMobile = ref(false)
const route = useRoute()
const router = useRouter()

const menus = [
  { id: 'dashboard', label: 'Dashboard', icon: 'DB', to: '/dashboard' },
  { id: 'order', label: 'Order', icon: 'OR', to: '/order-admin' },
]

const selectMenu = () => {
  if (isMobile.value) {
    isSidebarOpen.value = false
  }
}

const isActive = (path) => route.path === path

const logout = async () => {
  const token = localStorage.getItem('token')

  try {
    await fetch('/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch {
    // tetap lanjut logout meskipun request gagal
  }

  localStorage.removeItem('token')
  localStorage.removeItem('userRole')
  isSidebarOpen.value = false
  router.push('/login')
}

const syncSidebarByScreen = () => {
  isMobile.value = window.innerWidth <= 900
  isSidebarOpen.value = !isMobile.value
}

onMounted(() => {
  syncSidebarByScreen()
  window.addEventListener('resize', syncSidebarByScreen)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncSidebarByScreen)
})
</script>

<template>
  <div class="layout">
    <button class="menu-toggle" @click="isSidebarOpen = !isSidebarOpen">
      {{ isSidebarOpen ? 'Tutup Menu' : 'Buka Menu' }}
    </button>

    <div
      v-if="isSidebarOpen && isMobile"
      class="overlay"
      @click="isSidebarOpen = false"
    />

    <aside class="sidebar" :class="{ open: isSidebarOpen }">
      <div class="brand">
        <div class="brand-badge">SP</div>
        <div>
          <p class="brand-title">Sarapan Telur</p>
          <p class="brand-subtitle">Admin Workspace</p>
        </div>
      </div>

      <ul class="menu-list">
        <li v-for="menu in menus" :key="menu.id">
          <RouterLink
            class="menu-item"
            :class="{ active: isActive(menu.to) }"
            :to="menu.to"
            @click="selectMenu"
          >
            <span class="menu-icon">{{ menu.icon }}</span>
            <span>{{ menu.label }}</span>
          </RouterLink>
        </li>
      </ul>

      <button class="logout-btn" type="button" @click="logout">
        Logout
      </button>
    </aside>
  </div>
</template>

<style scoped>
.layout {
  min-height: 100vh;
}

.menu-toggle {
  display: none;
  position: fixed;
  top: 16px;
  left: 16px;
  z-index: 20;
  border: 0;
  border-radius: 999px;
  background: #ffffff;
  color: #1e293b;
  padding: 10px 14px;
  font-size: 13px;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}

.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.25);
  z-index: 8;
}

.sidebar {
  width: 270px;
  min-height: 100vh;
  background: #ffffff;
  color: #1e293b;
  padding: 24px 18px;
  position: fixed;
  top: 0;
  left: 0;
  border-right: 1px solid #e2e8f0;
  z-index: 10;
  transform: translateX(-100%);
  transition: transform 0.24s ease;
  display: flex;
  flex-direction: column;
}

.sidebar.open {
  transform: translateX(0);
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 10px 20px;
  border-bottom: 1px solid #e2e8f0;
}

.brand-badge {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(145deg, #22c55e, #16a34a);
  color: #ffffff;
  font-weight: 700;
  font-size: 13px;
  display: grid;
  place-items: center;
}

.brand-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}

.brand-subtitle {
  margin: 3px 0 0;
  font-size: 12px;
  color: #64748b;
}

.menu-list {
  margin: 16px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
}

.menu-item {
  width: 100%;
  border-radius: 12px;
  background: transparent;
  color: #475569;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  text-align: left;
  cursor: pointer;
  text-decoration: none;
  transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease;
}

.menu-item:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.menu-item.active {
  background: #dcfce7;
  color: #166534;
}

.menu-item.active .menu-icon {
  background: #22c55e;
  color: #ffffff;
}

.menu-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: #f1f5f9;
  display: grid;
  place-items: center;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.4px;
  color: #64748b;
}

.logout-btn {
  margin-top: auto;
  width: calc(100% - 4px);
  margin: 14px 2px 0;
  border: 0;
  border-radius: 12px;
  padding: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  background: #fef2f2;
  color: #dc2626;
  transition: background 0.2s ease;
}

.logout-btn:hover {
  background: #fee2e2;
}

@media (max-width: 900px) {
  .menu-toggle {
    display: inline-flex;
  }

  .sidebar {
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
  }
}
</style>

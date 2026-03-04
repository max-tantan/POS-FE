<script setup>
import Sidebar from './components/Sidebar.vue'
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="app-layout">
    <Sidebar />
    <main class="app-content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
}

.app-content {
  flex: 1;
  margin-left: 270px;
  min-height: 100vh;
  padding: 24px;
  background: #12202e;
}

@media (max-width: 900px) {
  .app-content {
    margin-left: 0;
    padding-top: 72px;
  }
}
</style>

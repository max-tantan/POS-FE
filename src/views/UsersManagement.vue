<script setup>
import { onMounted, ref } from 'vue'

const users = ref([])
const loading = ref(true)
const error = ref('')
const success = ref('')
const showModal = ref(false)
const saving = ref(false)
const deleteConfirm = ref(null)

const form = ref({
  username: '',
  password: '',
  role: 'admin',
})
const formError = ref('')

const api = (path, options = {}) => {
  const token = localStorage.getItem('token')
  return fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })
}

const fetchUsers = async () => {
  loading.value = true
  error.value = ''
  try {
    const res = await api('/users')
    const data = await res.json()
    if (data.status === 'success') {
      users.value = data.data
    } else {
      error.value = data.message || 'Gagal memuat data pengguna'
    }
  } catch {
    error.value = 'Gagal terhubung ke server'
  } finally {
    loading.value = false
  }
}

const openCreate = () => {
  form.value = { username: '', password: '', role: 'admin' }
  formError.value = ''
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  formError.value = ''
}

const saveUser = async () => {
  formError.value = ''
  const { username, password, role } = form.value
  if (!username.trim()) {
    formError.value = 'Username wajib diisi'
    return
  }
  if (!password) {
    formError.value = 'Password wajib diisi'
    return
  }
  if (!['admin', 'kasir'].includes(role)) {
    formError.value = 'Role tidak valid'
    return
  }

  saving.value = true
  try {
    const res = await api('/users', {
      method: 'POST',
      body: JSON.stringify({ username: username.trim(), password, role }),
    })
    const data = await res.json()
    if (!res.ok) {
      formError.value = data.message || 'Gagal menyimpan pengguna'
      return
    }
    success.value = `Pengguna "${username}" berhasil dibuat`
    closeModal()
    await fetchUsers()
  } catch {
    formError.value = 'Gagal terhubung ke server'
  } finally {
    saving.value = false
  }
}

const confirmDelete = (user) => {
  deleteConfirm.value = user
}

const cancelDelete = () => {
  deleteConfirm.value = null
}

const executeDelete = async () => {
  const user = deleteConfirm.value
  if (!user) return
  deleteConfirm.value = null
  try {
    const res = await api(`/users/${user.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json()
      error.value = data.message || 'Gagal menghapus pengguna'
      return
    }
    success.value = `Pengguna "${user.username}" berhasil dihapus`
    users.value = users.value.filter((u) => u.id !== user.id)
  } catch {
    error.value = 'Gagal terhubung ke server'
  }
}

onMounted(fetchUsers)
</script>

<template>
  <section class="users-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">Manajemen Pengguna</p>
        <h1>Users</h1>
        <p class="subtitle">Kelola semua akun pengguna sistem.</p>
      </div>
      <div class="header-actions">
        <button type="button" class="btn btn-primary" @click="openCreate">Tambah Pengguna</button>
      </div>
    </header>

    <p v-if="error" class="msg msg-error">{{ error }}</p>
    <p v-if="success" class="msg msg-success">{{ success }}</p>

    <section class="panel">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Username</th>
              <th>Role</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="4" class="empty">Memuat data...</td>
            </tr>
            <tr v-else-if="!users.length">
              <td colspan="4" class="empty">Belum ada pengguna. Klik "Tambah Pengguna" untuk membuat.</td>
            </tr>
            <tr v-for="user in users" :key="user.id">
              <td data-label="ID">{{ user.id }}</td>
              <td data-label="Username">{{ user.username }}</td>
              <td data-label="Role">
                <span class="badge" :class="user.role === 'admin' ? 'role-admin' : 'role-kasir'">{{ user.role }}</span>
              </td>
              <td data-label="Aksi">
                <button type="button" class="btn btn-danger xsmall" @click="confirmDelete(user)">Hapus</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div v-if="showModal" class="modal-backdrop" @click.self="closeModal">
      <section class="modal">
        <div class="modal-header">
          <h2>Tambah Pengguna</h2>
          <button type="button" class="btn btn-danger xsmall" @click="closeModal">X</button>
        </div>
        <form class="modal-form" @submit.prevent="saveUser">
          <label>
            Username
            <input v-model="form.username" type="text" placeholder="Nama pengguna" />
          </label>
          <label>
            Password
            <input v-model="form.password" type="password" placeholder="Kata sandi" />
          </label>
          <label>
            Role
            <select v-model="form.role">
              <option value="admin">Admin</option>
              <option value="kasir">Kasir</option>
            </select>
          </label>
          <p v-if="formError" class="form-error">{{ formError }}</p>
          <div class="form-actions">
            <button type="button" class="btn btn-soft" @click="closeModal">Batal</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">{{ saving ? 'Menyimpan...' : 'Simpan' }}</button>
          </div>
        </form>
      </section>
    </div>

    <div v-if="deleteConfirm" class="modal-backdrop" @click.self="cancelDelete">
      <section class="modal modal-sm">
        <div class="modal-header">
          <h2>Konfirmasi Hapus</h2>
        </div>
        <p class="confirm-text">Yakin ingin menghapus pengguna <strong>{{ deleteConfirm.username }}</strong> (ID: {{ deleteConfirm.id }})?</p>
        <div class="form-actions">
          <button type="button" class="btn btn-soft" @click="cancelDelete">Batal</button>
          <button type="button" class="btn btn-danger" @click="executeDelete">Hapus</button>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped>
.users-page {
  display: grid;
  gap: 18px;
  color: #1e293b;
}

.page-header {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  padding: 24px;
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: flex-start;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

.header-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.eyebrow {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 12px;
  color: #22c55e;
}

h1 {
  margin: 6px 0;
  font-size: clamp(28px, 3vw, 34px);
  color: #0f172a;
}

.subtitle {
  margin: 0;
  color: #64748b;
  font-size: 14px;
}

.msg {
  margin: 0;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 13px;
}

.msg-error {
  background: #fee2e2;
  color: #dc2626;
}

.msg-success {
  background: #dcfce7;
  color: #15803d;
}

.panel {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 600px;
}

th,
td {
  text-align: left;
  padding: 12px 10px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 13px;
}

th {
  color: #64748b;
  font-weight: 600;
}

td {
  color: #1e293b;
}

.empty {
  text-align: center;
  color: #94a3b8;
  padding: 40px 10px;
}

.badge {
  display: inline-block;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
}

.role-admin {
  background: #dbeafe;
  color: #1d4ed8;
}

.role-kasir {
  background: #fef3c7;
  color: #b45309;
}

.btn {
  border: 0;
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, opacity 0.2s ease;
}

.btn-soft {
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
}

.btn-primary {
  background: #f5c65d;
  color: #1f2937;
}

.btn-danger {
  background: #ef4444;
  color: #ffffff;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn.xsmall {
  padding: 6px 8px;
  font-size: 11px;
  border-radius: 10px;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(4px);
  display: grid;
  place-items: center;
  padding: 16px;
  z-index: 100;
}

.modal {
  width: min(480px, 100%);
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 20px;
  display: grid;
  gap: 16px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.1);
}

.modal-sm {
  width: min(400px, 100%);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
}

.modal-header h2 {
  margin: 0;
  font-size: 18px;
  color: #0f172a;
}

.modal-form {
  display: grid;
  gap: 14px;
}

.modal-form label {
  display: grid;
  gap: 6px;
  font-size: 13px;
  color: #475569;
  font-weight: 500;
}

.modal-form input,
.modal-form select {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #f8fafc;
  color: #1e293b;
  padding: 10px 12px;
}

.confirm-text {
  margin: 0;
  font-size: 14px;
  color: #475569;
  line-height: 1.5;
}

.form-error {
  margin: 0;
  color: #dc2626;
  font-size: 12px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 700px) {
  .page-header {
    flex-direction: column;
  }

  .header-actions {
    width: 100%;
  }

  table {
    min-width: 0;
  }

  table thead {
    display: none;
  }

  table tbody {
    display: grid;
    gap: 12px;
  }

  table tbody tr {
    display: grid;
    gap: 8px;
    padding: 12px;
    border: 1px solid #e2e8f0;
    border-radius: 14px;
    background: #ffffff;
  }

  table tbody td {
    display: grid;
    grid-template-columns: 110px 1fr;
    gap: 8px;
    padding: 0;
    border: 0;
    align-items: start;
  }

  table tbody td::before {
    content: attr(data-label);
    color: #64748b;
    font-size: 12px;
    font-weight: 600;
  }
}
</style>

<script setup>
import { onMounted, ref, computed, watch } from 'vue'
import { PlusIcon, PencilSquareIcon, TrashIcon, MagnifyingGlassIcon, XMarkIcon, ArrowUpIcon, ArrowDownIcon, ExclamationTriangleIcon, CheckCircleIcon, InformationCircleIcon } from '@heroicons/vue/24/outline'

const API = '/produk'

const productTypes = ['Makanan', 'Minuman', 'Snack', 'Lainnya']
const typeColors = {
  Makanan: { bg: '#f0fdf4', text: '#15803d' },
  Minuman: { bg: '#eff6ff', text: '#1d4ed8' },
  Snack: { bg: '#fefce8', text: '#a16207' },
  Lainnya: { bg: '#f1f5f9', text: '#475569' },
}

const products = ref([])
const loading = ref(false)
const showModal = ref(false)
const editingId = ref(null)
const formError = ref('')
const submitting = ref(false)

const searchQuery = ref('')
const activeType = ref('Semua')
const sortField = ref('nama_produk')
const sortDir = ref('asc')
const currentPage = ref(1)
const perPage = ref(10)

const showDeleteModal = ref(false)
const deletingProduct = ref(null)

const toasts = ref([])
let toastId = 0

const form = ref({
  nama_produk: '',
  jenis_produk: 'Makanan',
  harga_produk: 10000,
  stok: 0,
})

const fetchProduk = async () => {
  loading.value = true
  try {
    const res = await fetch(API)
    const resData = await res.json()
    if (resData.status === 'success' && Array.isArray(resData.data)) {
      products.value = resData.data.map(p => ({
        id: p.id,
        nama_produk: p.nama_produk,
        jenis_produk: p.jenis_produk,
        harga_produk: Number(p.harga_produk),
        stok: Number(p.stok) || 0,
      }))
    }
  } catch {
    addToast('Gagal memuat data produk.', 'error')
  } finally {
    loading.value = false
  }
}

const addToast = (message, type = 'success') => {
  const id = ++toastId
  toasts.value.push({ id, message, type })
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }, 4000)
}

const filteredProducts = computed(() => {
  let result = [...products.value]

  if (activeType.value !== 'Semua') {
    result = result.filter(p => p.jenis_produk === activeType.value)
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    result = result.filter(p => p.nama_produk.toLowerCase().includes(q))
  }

  result.sort((a, b) => {
    let valA = a[sortField.value]
    let valB = b[sortField.value]
    if (typeof valA === 'string') {
      valA = valA.toLowerCase()
      valB = valB.toLowerCase()
    }
    if (valA < valB) return sortDir.value === 'asc' ? -1 : 1
    if (valA > valB) return sortDir.value === 'asc' ? 1 : -1
    return 0
  })

  return result
})

const totalPages = computed(() => Math.ceil(filteredProducts.value.length / perPage.value))

const paginatedProducts = computed(() => {
  const start = (currentPage.value - 1) * perPage.value
  return filteredProducts.value.slice(start, start + perPage.value)
})

const stats = computed(() => {
  const total = products.value.length
  const stokHabis = products.value.filter(p => p.stok === 0).length
  const stokMenipis = products.value.filter(p => p.stok > 0 && p.stok <= 5).length
  return { total, stokHabis, stokMenipis }
})

watch([searchQuery, activeType, sortField, sortDir], () => {
  currentPage.value = 1
})

const toggleSort = (field) => {
  if (sortField.value === field) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDir.value = 'asc'
  }
}

const sortIcon = (field) => {
  if (sortField.value !== field) return null
  return sortDir.value === 'asc' ? 'asc' : 'desc'
}

const openCreate = () => {
  editingId.value = null
  form.value = { nama_produk: '', jenis_produk: 'Makanan', harga_produk: 10000, stok: 0 }
  formError.value = ''
  showModal.value = true
}

const openEdit = (produk) => {
  editingId.value = produk.id
  form.value = {
    nama_produk: produk.nama_produk,
    jenis_produk: produk.jenis_produk,
    harga_produk: produk.harga_produk,
    stok: produk.stok,
  }
  formError.value = ''
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  formError.value = ''
  submitting.value = false
}

const saveProduk = async () => {
  const { nama_produk, jenis_produk, harga_produk, stok } = form.value
  formError.value = ''

  if (!nama_produk.trim()) {
    formError.value = 'Nama produk wajib diisi.'
    return
  }
  if (!productTypes.includes(jenis_produk)) {
    formError.value = 'Jenis produk tidak valid.'
    return
  }
  if (!Number.isFinite(Number(harga_produk)) || Number(harga_produk) < 1000) {
    formError.value = 'Harga minimal Rp1.000.'
    return
  }

  submitting.value = true
  const body = {
    nama_produk: nama_produk.trim(),
    jenis_produk,
    harga_produk: Number(harga_produk),
    stok: Number(stok) || 0,
  }

  try {
    const url = editingId.value
      ? `${API}/${editingId.value}`
      : API
    const method = editingId.value ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify(body),
    })

    const resData = await res.json()

    if (!res.ok) {
      formError.value = resData.message || 'Gagal menyimpan produk.'
      submitting.value = false
      return
    }

    await fetchProduk()
    closeModal()
    addToast(editingId.value ? 'Produk berhasil diperbarui.' : 'Produk berhasil ditambahkan.', 'success')
  } catch {
    formError.value = 'Gagal terhubung ke server.'
    submitting.value = false
  }
}

const confirmDelete = (produk) => {
  deletingProduct.value = produk
  showDeleteModal.value = true
}

const cancelDelete = () => {
  showDeleteModal.value = false
  deletingProduct.value = null
}

const deleteProduk = async () => {
  const produk = deletingProduct.value
  if (!produk) return

  const index = products.value.findIndex(p => p.id === produk.id)
  if (index !== -1) {
    products.value.splice(index, 1)
  }
  showDeleteModal.value = false
  deletingProduct.value = null

  try {
    const res = await fetch(`${API}/${produk.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    })
    if (!res.ok) {
      await fetchProduk()
      addToast('Gagal menghapus produk.', 'error')
      return
    }
    addToast(`"${produk.nama_produk}" berhasil dihapus.`, 'success')
  } catch {
    await fetchProduk()
    addToast('Gagal terhubung ke server.', 'error')
  }
}

const formatHarga = (val) => 'Rp ' + Number(val).toLocaleString('id-ID')

onMounted(fetchProduk)
</script>

<template>
  <section class="admin-produk-page">
    <!-- Toast Notifications -->
    <Teleport to="body">
      <div class="toast-container">
        <TransitionGroup name="toast">
          <div v-for="t in toasts" :key="t.id" :class="['toast', `toast-${t.type}`]">
            <CheckCircleIcon v-if="t.type === 'success'" class="toast-icon" />
            <ExclamationTriangleIcon v-else-if="t.type === 'error'" class="toast-icon" />
            <InformationCircleIcon v-else class="toast-icon" />
            <span>{{ t.message }}</span>
          </div>
        </TransitionGroup>
      </div>
    </Teleport>

    <!-- Page Header -->
    <header class="page-header">
      <div>
        <p class="eyebrow">Manajemen</p>
        <h1>Kelola Produk</h1>
        <p class="subtitle">Tambah, edit, atau hapus menu makanan & minuman.</p>
      </div>
      <button class="btn btn-primary" @click="openCreate">
        <PlusIcon class="icon" />
        Tambah Produk
      </button>
    </header>

    <!-- Stats Bar -->
    <div v-if="!loading && products.length" class="stats-bar">
      <div class="stat-item">
        <span class="stat-value">{{ stats.total }}</span>
        <span class="stat-label">Total Produk</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item" :class="{ 'stat-alert': stats.stokHabis > 0 }">
        <span class="stat-value">{{ stats.stokHabis }}</span>
        <span class="stat-label">Stok Habis</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item" :class="{ 'stat-alert': stats.stokMenipis > 0 }">
        <span class="stat-value">{{ stats.stokMenipis }}</span>
        <span class="stat-label">Stok Menipis</span>
      </div>
    </div>

    <!-- Toolbar: Search + Filter -->
    <div v-if="!loading && products.length" class="toolbar">
      <div class="search-box">
        <MagnifyingGlassIcon class="search-icon" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari produk..."
          class="search-input"
        />
        <button v-if="searchQuery" class="search-clear" @click="searchQuery = ''">
          <XMarkIcon class="clear-icon" />
        </button>
      </div>
      <div class="filter-pills">
        <button
          :class="['pill', { active: activeType === 'Semua' }]"
          @click="activeType = 'Semua'"
        >
          Semua
        </button>
        <button
          v-for="t in productTypes"
          :key="t"
          :class="['pill', { active: activeType === t }]"
          @click="activeType = t"
        >
          {{ t }}
        </button>
      </div>
    </div>

    <!-- Table Panel -->
    <div class="panel">
      <!-- Loading Skeleton -->
      <div v-if="loading" class="skeleton-wrap">
        <div v-for="n in 5" :key="n" class="skeleton-row">
          <div class="skeleton skeleton-name"></div>
          <div class="skeleton skeleton-badge"></div>
          <div class="skeleton skeleton-price"></div>
          <div class="skeleton skeleton-stok"></div>
          <div class="skeleton skeleton-actions"></div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="!products.length" class="empty-state">
        <div class="empty-icon">
          <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="#cbd5e1">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
          </svg>
        </div>
        <h3>Belum ada produk</h3>
        <p>Mulai dengan menambahkan produk pertama ke katalog.</p>
        <button class="btn btn-primary" @click="openCreate">
          <PlusIcon class="icon" />
          Tambah Produk Pertama
        </button>
      </div>

      <!-- No Results -->
      <div v-else-if="!paginatedProducts.length" class="empty-state">
        <div class="empty-icon">
          <MagnifyingGlassIcon width="48" height="48" stroke="#cbd5e1" />
        </div>
        <h3>Tidak ada hasil</h3>
        <p>Tidak ditemukan produk yang cocok dengan pencarian atau filter Anda.</p>
        <button class="btn btn-soft" @click="searchQuery = ''; activeType = 'Semua'">
          Reset Filter
        </button>
      </div>

      <!-- Data Table -->
      <div v-else class="table-wrap">
        <table class="produk-table">
          <thead>
            <tr>
              <th class="sortable" @click="toggleSort('nama_produk')">
                Nama
                <span v-if="sortIcon('nama_produk')" class="sort-indicator">
                  <ArrowUpIcon v-if="sortIcon('nama_produk') === 'asc'" class="sort-icon" />
                  <ArrowDownIcon v-else class="sort-icon" />
                </span>
              </th>
              <th class="sortable" @click="toggleSort('jenis_produk')">
                Tipe
                <span v-if="sortIcon('jenis_produk')" class="sort-indicator">
                  <ArrowUpIcon v-if="sortIcon('jenis_produk') === 'asc'" class="sort-icon" />
                  <ArrowDownIcon v-else class="sort-icon" />
                </span>
              </th>
              <th class="sortable" @click="toggleSort('harga_produk')">
                Harga
                <span v-if="sortIcon('harga_produk')" class="sort-indicator">
                  <ArrowUpIcon v-if="sortIcon('harga_produk') === 'asc'" class="sort-icon" />
                  <ArrowDownIcon v-else class="sort-icon" />
                </span>
              </th>
              <th class="sortable" @click="toggleSort('stok')">
                Stok
                <span v-if="sortIcon('stok')" class="sort-indicator">
                  <ArrowUpIcon v-if="sortIcon('stok') === 'asc'" class="sort-icon" />
                  <ArrowDownIcon v-else class="sort-icon" />
                </span>
              </th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in paginatedProducts"
              :key="item.id"
              class="clickable-row"
              @click="openEdit(item)"
            >
              <td class="cell-name">{{ item.nama_produk }}</td>
              <td>
                <span
                  class="type-badge"
                  :style="{ background: typeColors[item.jenis_produk]?.bg || '#f1f5f9', color: typeColors[item.jenis_produk]?.text || '#475569' }"
                >
                  {{ item.jenis_produk }}
                </span>
              </td>
              <td class="cell-price">{{ formatHarga(item.harga_produk) }}</td>
              <td>
                <span :class="['stok-badge', { 'stok-habis': item.stok === 0, 'stok-menipis': item.stok > 0 && item.stok <= 5 }]">
                  {{ item.stok }}
                </span>
              </td>
              <td class="cell-actions" @click.stop>
                <button class="btn btn-soft xsmall" @click="openEdit(item)">
                  <PencilSquareIcon class="icon-sm" />
                </button>
                <button class="btn btn-danger xsmall" @click="confirmDelete(item)">
                  <TrashIcon class="icon-sm" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Pagination -->
        <div v-if="totalPages > 1" class="pagination">
          <div class="pagination-info">
            Menampilkan {{ (currentPage - 1) * perPage + 1 }}-{{ Math.min(currentPage * perPage, filteredProducts.length) }} dari {{ filteredProducts.length }}
          </div>
          <div class="pagination-controls">
            <button class="btn btn-soft xsmall" :disabled="currentPage === 1" @click="currentPage--">
              Sebelumnya
            </button>
            <template v-for="p in totalPages" :key="p">
              <button
                v-if="p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1)"
                :class="['btn', 'xsmall', p === currentPage ? 'btn-primary' : 'btn-soft']"
                @click="currentPage = p"
              >
                {{ p }}
              </button>
              <span v-else-if="p === currentPage - 2 || p === currentPage + 2" class="pagination-dots">...</span>
            </template>
            <button class="btn btn-soft xsmall" :disabled="currentPage === totalPages" @click="currentPage++">
              Berikutnya
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showModal" class="modal-backdrop" @click.self="closeModal">
          <section class="modal" @click.stop>
            <div class="modal-header">
              <h2>{{ editingId ? 'Edit Produk' : 'Tambah Produk Baru' }}</h2>
              <button class="btn-close" @click="closeModal">
                <XMarkIcon class="close-icon" />
              </button>
            </div>
            <form class="modal-form" @submit.prevent="saveProduk">
              <label class="field-label">
                Nama Produk
                <input v-model="form.nama_produk" type="text" placeholder="Contoh: Nasi Goreng Spesial" />
              </label>
              <label class="field-label">
                Jenis Produk
                <select v-model="form.jenis_produk">
                  <option v-for="t in productTypes" :key="t" :value="t">{{ t }}</option>
                </select>
              </label>
              <div class="field-row">
                <label class="field-label">
                  Harga Produk
                  <div class="input-with-prefix">
                    <span class="input-prefix">Rp</span>
                    <input v-model.number="form.harga_produk" type="number" min="1000" step="500" />
                  </div>
                </label>
                <label class="field-label">
                  Stok
                  <input v-model.number="form.stok" type="number" min="0" />
                </label>
              </div>
              <p v-if="formError" class="form-error">{{ formError }}</p>
              <div class="form-actions">
                <button type="button" class="btn btn-soft" @click="closeModal">Batal</button>
                <button type="submit" class="btn btn-primary" :disabled="submitting">
                  {{ submitting ? 'Menyimpan...' : (editingId ? 'Simpan Perubahan' : 'Simpan Produk') }}
                </button>
              </div>
            </form>
          </section>
        </div>
      </Transition>
    </Teleport>

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showDeleteModal" class="modal-backdrop" @click.self="cancelDelete">
          <section class="modal modal-delete" @click.stop>
            <div class="delete-icon-wrap">
              <ExclamationTriangleIcon class="delete-icon" />
            </div>
            <h2>Hapus Produk?</h2>
            <p class="delete-desc">
              Produk <strong>"{{ deletingProduct?.nama_produk }}"</strong> akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div class="form-actions">
              <button class="btn btn-soft" @click="cancelDelete">Batal</button>
              <button class="btn btn-danger-solid" @click="deleteProduk">
                <TrashIcon class="icon-sm" />
                Ya, Hapus
              </button>
            </div>
          </section>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>

<style scoped>
.admin-produk-page {
  display: grid;
  gap: 16px;
  color: #1e293b;
}

/* ── Page Header ── */
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

.eyebrow {
  margin: 0;
  font-size: 12px;
  color: #22c55e;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  font-weight: 700;
}

h1 {
  margin: 6px 0 0;
  font-size: 30px;
  color: #0f172a;
}

.subtitle {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 14px;
}

/* ── Stats Bar ── */
.stats-bar {
  display: flex;
  align-items: center;
  gap: 0;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  overflow: hidden;
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 16px 20px;
  transition: background 0.2s;
}

.stat-item:hover {
  background: #f8fafc;
}

.stat-divider {
  width: 1px;
  height: 32px;
  background: #e2e8f0;
}

.stat-value {
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1;
}

.stat-label {
  font-size: 12px;
  color: #94a3b8;
  font-weight: 500;
}

.stat-alert .stat-value {
  color: #dc2626;
}

/* ── Toolbar: Search + Filter ── */
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.search-box {
  position: relative;
  flex: 1;
  min-width: 220px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  color: #94a3b8;
  pointer-events: none;
}

.search-input {
  width: 100%;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 10px 36px 10px 40px;
  font-size: 14px;
  background: #ffffff;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  color: #1e293b;
}

.search-input:focus {
  border-color: #22c55e;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.12);
}

.search-input::placeholder {
  color: #94a3b8;
}

.search-clear {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: #f1f5f9;
  border: none;
  border-radius: 8px;
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: background 0.15s;
}

.search-clear:hover {
  background: #e2e8f0;
}

.clear-icon {
  width: 14px;
  height: 14px;
  color: #64748b;
}

.filter-pills {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.pill {
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #64748b;
  border-radius: 999px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.pill:hover {
  border-color: #cbd5e1;
  color: #334155;
}

.pill.active {
  background: #22c55e;
  border-color: #22c55e;
  color: #ffffff;
}

/* ── Buttons ── */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 0;
  border-radius: 12px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #22c55e;
  color: #ffffff;
}

.btn-primary:hover:not(:disabled) {
  background: #16a34a;
}

.btn-soft {
  background: #f1f5f9;
  color: #475569;
}

.btn-soft:hover:not(:disabled) {
  background: #e2e8f0;
}

.btn-soft:disabled {
  opacity: 0.4;
}

.btn-danger {
  background: #fef2f2;
  color: #dc2626;
}

.btn-danger:hover {
  background: #fee2e2;
}

.btn-danger-solid {
  background: #dc2626;
  color: #ffffff;
  border: 0;
  border-radius: 12px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.btn-danger-solid:hover {
  background: #b91c1c;
}

.xsmall {
  padding: 6px 10px;
  font-size: 12px;
  border-radius: 8px;
}

.icon {
  width: 18px;
  height: 18px;
}

.icon-sm {
  width: 14px;
  height: 14px;
}

/* ── Panel ── */
.panel {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

/* ── Loading Skeleton ── */
.skeleton-wrap {
  display: grid;
  gap: 0;
}

.skeleton-row {
  display: grid;
  grid-template-columns: 1.5fr 0.8fr 1fr 0.6fr 0.8fr;
  gap: 16px;
  padding: 14px 12px;
  border-bottom: 1px solid #f1f5f9;
  align-items: center;
}

.skeleton-row:last-child {
  border-bottom: none;
}

.skeleton {
  height: 16px;
  border-radius: 8px;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-name { width: 70%; }
.skeleton-badge { width: 60px; height: 24px; border-radius: 999px; }
.skeleton-price { width: 50%; }
.skeleton-stok { width: 32px; height: 24px; border-radius: 999px; margin: 0 auto; }
.skeleton-actions { width: 70px; display: flex; gap: 6px; }

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── Empty State ── */
.empty-state {
  padding: 48px 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.empty-icon {
  margin-bottom: 8px;
  opacity: 0.7;
}

.empty-state h3 {
  margin: 0;
  font-size: 18px;
  color: #334155;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
  color: #94a3b8;
}

/* ── Table ── */
.table-wrap {
  overflow-x: auto;
}

.produk-table {
  width: 100%;
  border-collapse: collapse;
}

.produk-table th,
.produk-table td {
  padding: 12px;
  text-align: left;
  font-size: 13px;
  border-bottom: 1px solid #f1f5f9;
}

.produk-table th {
  color: #64748b;
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  user-select: none;
}

.sortable {
  cursor: pointer;
  transition: color 0.15s;
}

.sortable:hover {
  color: #334155;
}

.sort-indicator {
  display: inline-flex;
  vertical-align: middle;
  margin-left: 4px;
}

.sort-icon {
  width: 14px;
  height: 14px;
}

.produk-table td {
  color: #1e293b;
}

.clickable-row {
  cursor: pointer;
  transition: background 0.12s;
}

.clickable-row:hover {
  background: #f8fafc;
}

.cell-name {
  font-weight: 600;
}

.cell-price {
  font-weight: 600;
  color: #0f172a;
}

/* ── Type Badge ── */
.type-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

/* ── Stok Badge ── */
.stok-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #475569;
  font-size: 12px;
  font-weight: 600;
}

.stok-badge.stok-habis {
  background: #fef2f2;
  color: #dc2626;
}

.stok-badge.stok-menipis {
  background: #fef9c3;
  color: #a16207;
}

.cell-actions {
  display: flex;
  gap: 6px;
}

/* ── Pagination ── */
.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid #f1f5f9;
  margin-top: 4px;
  flex-wrap: wrap;
  gap: 12px;
}

.pagination-info {
  font-size: 13px;
  color: #94a3b8;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.pagination-dots {
  padding: 0 4px;
  color: #94a3b8;
  font-size: 13px;
}

/* ── Modal ── */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(4px);
  display: grid;
  place-items: center;
  z-index: 100;
  padding: 20px;
}

.modal {
  background: #ffffff;
  border-radius: 20px;
  padding: 28px;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
  color: #0f172a;
}

.btn-close {
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 10px;
  background: #f1f5f9;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: background 0.15s;
}

.btn-close:hover {
  background: #e2e8f0;
}

.close-icon {
  width: 18px;
  height: 18px;
  color: #64748b;
}

.modal-form {
  display: grid;
  gap: 16px;
}

.field-label {
  display: grid;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
}

.field-label input,
.field-label select {
  width: 100%;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
  background: #f8fafc;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  color: #1e293b;
}

.field-label input:focus,
.field-label select:focus {
  border-color: #22c55e;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.15);
}

.field-row {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 12px;
}

.input-with-prefix {
  display: flex;
  align-items: stretch;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #f8fafc;
  overflow: hidden;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.input-with-prefix:focus-within {
  border-color: #22c55e;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.15);
}

.input-prefix {
  display: flex;
  align-items: center;
  padding: 0 10px;
  font-size: 13px;
  font-weight: 600;
  color: #94a3b8;
  background: #f1f5f9;
  border-right: 1px solid #e2e8f0;
}

.input-with-prefix input {
  border: 0 !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  background: transparent;
  flex: 1;
  min-width: 0;
}

.form-error {
  margin: 0;
  color: #dc2626;
  font-size: 13px;
  font-weight: 600;
  padding: 8px 12px;
  background: #fef2f2;
  border-radius: 8px;
}

.form-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 8px;
}

/* ── Delete Modal ── */
.modal-delete {
  max-width: 400px;
  text-align: center;
}

.modal-delete h2 {
  margin: 0 0 8px;
  font-size: 20px;
  color: #0f172a;
}

.delete-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #fef2f2;
  display: grid;
  place-items: center;
  margin: 0 auto 16px;
}

.delete-icon {
  width: 28px;
  height: 28px;
  color: #dc2626;
}

.delete-desc {
  margin: 0 0 20px;
  font-size: 14px;
  color: #64748b;
  line-height: 1.5;
}

.modal-delete .form-actions {
  justify-content: center;
}

/* ── Toast Notifications ── */
.toast-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 200;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  pointer-events: auto;
  backdrop-filter: blur(8px);
}

.toast-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.toast-success {
  background: #f0fdf4;
  color: #15803d;
  border: 1px solid #bbf7d0;
}

.toast-success .toast-icon { color: #22c55e; }

.toast-error {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.toast-error .toast-icon { color: #dc2626; }

.toast-info {
  background: #eff6ff;
  color: #1d4ed8;
  border: 1px solid #bfdbfe;
}

.toast-info .toast-icon { color: #3b82f6; }

/* Toast Transitions */
.toast-enter-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.toast-leave-active {
  transition: all 0.2s ease-in;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(40px) scale(0.96);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(40px) scale(0.96);
}

/* ── Modal Transitions ── */
.modal-enter-active {
  transition: opacity 0.2s ease;
}
.modal-enter-active .modal {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease;
}
.modal-leave-active {
  transition: opacity 0.15s ease;
}
.modal-leave-active .modal {
  transition: transform 0.15s ease, opacity 0.15s ease;
}
.modal-enter-from {
  opacity: 0;
}
.modal-enter-from .modal {
  opacity: 0;
  transform: scale(0.96) translateY(8px);
}
.modal-leave-to {
  opacity: 0;
}
.modal-leave-to .modal {
  opacity: 0;
  transform: scale(0.97);
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    padding: 20px;
  }

  h1 {
    font-size: 24px;
  }

  .stats-bar {
    flex-direction: column;
    gap: 0;
  }

  .stat-divider {
    width: 100%;
    height: 1px;
  }

  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-pills {
    overflow-x: auto;
    flex-wrap: nowrap;
    padding-bottom: 4px;
  }

  .field-row {
    grid-template-columns: 1fr;
  }

  .pagination {
    flex-direction: column;
    align-items: center;
  }

  .skeleton-row {
    grid-template-columns: 1fr 0.8fr 0.8fr;
  }

  .skeleton-actions,
  .skeleton-stok {
    display: none;
  }
}
</style>

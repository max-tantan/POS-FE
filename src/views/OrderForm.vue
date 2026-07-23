<script setup>
import { computed, onMounted, ref, watch } from 'vue'

const productTypes = ['Semua', 'Makanan', 'Minuman', 'Snack', 'Lainnya']
const activeProductType = ref('Semua')
const formCustomer = ref('')
const formError = ref('')
const submitting = ref(false)
const orderSuccess = ref(false)
const orderNumber = ref('')

const menuOptions = ref([])
const selectedMenus = ref([])
const menuQtyDraft = ref({})

const filteredMenuOptions = computed(() => {
  if (activeProductType.value === 'Semua') return menuOptions.value
  return menuOptions.value.filter(m => m.type === activeProductType.value)
})

const normalizeName = (v) => v.trim().toLowerCase()

const findMenuOptionByName = (name) =>
  menuOptions.value.find((o) => normalizeName(o.name) === normalizeName(name))

const selectedMenuItems = computed(() =>
  selectedMenus.value
    .map((name) => {
      const option = findMenuOptionByName(name)
      if (!option) return null
      const qty = Math.max(1, Number(menuQtyDraft.value[name]) || 1)
      return {
        id: option.id,
        name: option.name,
        price: option.price,
        qty,
        subtotal: option.price * qty,
      }
    })
    .filter(Boolean),
)

const estimatedTotal = computed(() => selectedMenuItems.value.reduce((s, i) => s + i.subtotal, 0))
const estimatedTotalQty = computed(() => selectedMenuItems.value.reduce((s, i) => s + i.qty, 0))

const formatRupiah = (v) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v)

const fetchProduk = async () => {
  try {
    const res = await fetch('/produk')
    const data = await res.json()
    if (data.status === 'success' && Array.isArray(data.data)) {
      menuOptions.value = data.data.map((p) => ({
        id: p.id,
        name: p.nama_produk,
        type: p.jenis_produk,
        price: Number(p.harga_produk),
      }))
      syncSelection()
    }
  } catch {
    // fallback
  }
}

const syncSelection = () => {
  const validSet = new Set(menuOptions.value.map((m) => normalizeName(m.name)))
  selectedMenus.value = selectedMenus.value.filter((n) => validSet.has(normalizeName(n)))
  for (const key of Object.keys(menuQtyDraft.value)) {
    if (!validSet.has(normalizeName(key))) delete menuQtyDraft.value[key]
  }
  if (!selectedMenus.value.length && menuOptions.value.length) {
    selectedMenus.value = [menuOptions.value[0].name]
    menuQtyDraft.value[menuOptions.value[0].name] = 1
  }
  for (const name of selectedMenus.value) {
    const q = Number(menuQtyDraft.value[name])
    if (!Number.isFinite(q) || q < 1) menuQtyDraft.value[name] = 1
  }
}

const toggleMenu = (name, checked) => {
  if (checked) {
    if (!selectedMenus.value.includes(name)) selectedMenus.value = [...selectedMenus.value, name]
    if (!menuQtyDraft.value[name]) menuQtyDraft.value[name] = 1
  } else {
    selectedMenus.value = selectedMenus.value.filter((n) => n !== name)
    delete menuQtyDraft.value[name]
  }
}

const incrementQty = (name) => {
  menuQtyDraft.value[name] = (Number(menuQtyDraft.value[name]) || 1) + 1
}

const decrementQty = (name) => {
  const cur = Number(menuQtyDraft.value[name]) || 1
  if (cur <= 1) {
    toggleMenu(name, false)
    return
  }
  menuQtyDraft.value[name] = cur - 1
}

const setQty = (name, val) => {
  const q = Math.max(1, Number(val) || 1)
  menuQtyDraft.value[name] = q
}

const resetForm = () => {
  formCustomer.value = ''
  formError.value = ''
  selectedMenus.value = []
  menuQtyDraft.value = {}
  orderSuccess.value = false
  orderNumber.value = ''
  syncSelection()
}

const saveOrder = async () => {
  const customer = formCustomer.value.trim()
  const items = selectedMenuItems.value
  formError.value = ''

  if (!customer) {
    formError.value = 'Nama pelanggan wajib diisi.'
    return
  }
  if (!items.length) {
    formError.value = 'Pilih minimal 1 menu.'
    return
  }

  submitting.value = true
  const totalHarga = estimatedTotal.value

  const payload = {
    nama_pelanggan: customer,
    total_harga: totalHarga,
    items: items.map((i) => ({
      produk_id: i.id,
      jumlah: i.qty,
    })),
  }

  try {
    const res = await fetch('/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify(payload),
    })
    const data = await res.json()

    if (!res.ok) {
      formError.value = data.message || 'Gagal menyimpan pesanan.'
      submitting.value = false
      return
    }

    orderNumber.value = data.data?.id || ''
    orderSuccess.value = true
  } catch {
    formError.value = 'Gagal terhubung ke server.'
  } finally {
    submitting.value = false
  }
}

watch(menuOptions, syncSelection, { deep: true, immediate: true })

onMounted(fetchProduk)
</script>

<template>
  <section class="order-form-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">Kasir</p>
        <h1>Buat Pesanan</h1>
        <p class="subtitle">Pilih menu, isi nama pelanggan, lalu pesan.</p>
      </div>
    </header>

    <!-- Success State -->
    <div v-if="orderSuccess" class="success-card">
      <div class="success-icon">
        <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="#22c55e">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h2>Pesanan Berhasil!</h2>
      <p v-if="orderNumber" class="success-order-id">Nomor order: <strong>{{ orderNumber }}</strong></p>
      <p class="success-hint">Silakan cek status pesanan di halaman "Status Pesanan".</p>
      <button class="btn btn-primary" @click="resetForm">Buat Pesanan Baru</button>
    </div>

    <!-- Order Form -->
    <div v-else class="form-card">
      <label class="field-label">
        Nama Pelanggan
        <input
          v-model="formCustomer"
          type="text"
          placeholder="Masukkan nama pelanggan"
          class="field-input"
        />
      </label>

      <div class="menu-section">
        <div class="menu-header">
          <p class="menu-title">Pilih Menu</p>
          <div class="filter-pills">
            <button
              v-for="t in productTypes"
              :key="t"
              :class="['pill', { active: activeProductType === t }]"
              @click="activeProductType = t"
            >
              {{ t }}
            </button>
          </div>
        </div>

        <div class="menu-list">
          <div
            v-for="option in filteredMenuOptions"
            :key="option.name"
            :class="['menu-row', { selected: selectedMenus.includes(option.name) }]"
          >
            <label class="menu-row-main" @click.prevent="toggleMenu(option.name, !selectedMenus.includes(option.name))">
              <span class="menu-check">
                <input
                  type="checkbox"
                  :checked="selectedMenus.includes(option.name)"
                  @click.stop
                  @change="toggleMenu(option.name, $event.target.checked)"
                />
              </span>
              <span class="menu-info">
                <span class="menu-name">{{ option.name }}</span>
                <span class="menu-type-badge" :class="'type-' + (option.type?.toLowerCase() || 'lainnya')">{{ option.type || 'Lainnya' }}</span>
              </span>
              <span class="menu-price">{{ formatRupiah(option.price) }}</span>
            </label>
            <div v-if="selectedMenus.includes(option.name)" class="menu-qty-row">
              <button class="qty-btn qty-minus" @click.stop="decrementQty(option.name)">−</button>
              <input
                class="qty-input"
                type="number"
                min="1"
                :value="menuQtyDraft[option.name] ?? 1"
                @click.stop
                @input.stop="setQty(option.name, $event.target.value)"
              />
              <button class="qty-btn qty-plus" @click.stop="incrementQty(option.name)">+</button>
              <span class="qty-subtotal">{{ formatRupiah((menuQtyDraft[option.name] || 1) * option.price) }}</span>
            </div>
          </div>

          <p v-if="!filteredMenuOptions.length" class="empty-menu">Tidak ada menu untuk kategori ini.</p>
        </div>
      </div>

      <!-- Summary -->
      <div v-if="selectedMenuItems.length" class="summary">
        <p class="summary-title">Ringkasan Pesanan</p>
        <div class="summary-list">
          <div v-for="item in selectedMenuItems" :key="item.name" class="summary-row">
            <span class="summary-name">{{ item.name }} x{{ item.qty }}</span>
            <span class="summary-subtotal">{{ formatRupiah(item.subtotal) }}</span>
          </div>
        </div>
        <div class="summary-total">
          <span>Total ({{ estimatedTotalQty }} item)</span>
          <span class="total-value">{{ formatRupiah(estimatedTotal) }}</span>
        </div>
      </div>

      <p v-if="formError" class="form-error">{{ formError }}</p>

      <button
        class="btn btn-primary btn-submit"
        :disabled="submitting || !selectedMenuItems.length"
        @click="saveOrder"
      >
        {{ submitting ? 'Memproses...' : 'Pesan' }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.order-form-page {
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
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.eyebrow {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 12px;
  color: #22c55e;
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

/* ── Form Card ── */
.form-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  padding: 28px;
  display: grid;
  gap: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.field-label {
  display: grid;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
}

.field-input {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 14px;
  background: #f8fafc;
  color: #1e293b;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.field-input:focus {
  border-color: #22c55e;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.12);
}

.field-input::placeholder {
  color: #94a3b8;
}

/* ── Menu Section ── */
.menu-section {
  display: grid;
  gap: 12px;
}

.menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.menu-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
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
  padding: 6px 14px;
  font-size: 12px;
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

/* ── Menu List ── */
.menu-list {
  display: grid;
  gap: 4px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  overflow: hidden;
}

.menu-row {
  border-bottom: 1px solid #f1f5f9;
  transition: background 0.12s;
}

.menu-row:last-child {
  border-bottom: none;
}

.menu-row.selected {
  background: #f0fdf4;
}

.menu-row-main {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  cursor: pointer;
  transition: background 0.12s;
  user-select: none;
}

.menu-row-main:hover {
  background: #f8fafc;
}

.menu-row.selected .menu-row-main:hover {
  background: #dcfce7;
}

.menu-check {
  flex-shrink: 0;
}

.menu-check input[type="checkbox"] {
  width: 18px;
  height: 18px;
  border-radius: 6px;
  accent-color: #22c55e;
  cursor: pointer;
}

.menu-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.menu-name {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.menu-type-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}

.type-makanan {
  background: #f0fdf4;
  color: #15803d;
}

.type-minuman {
  background: #eff6ff;
  color: #1d4ed8;
}

.type-snack {
  background: #fefce8;
  color: #a16207;
}

.type-lainnya {
  background: #f1f5f9;
  color: #475569;
}

.menu-price {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
  white-space: nowrap;
  flex-shrink: 0;
}

.menu-qty-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px 12px 44px;
}

.qty-btn {
  width: 30px;
  height: 30px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  color: #475569;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: all 0.15s;
  line-height: 1;
  padding: 0;
}

.qty-btn:hover {
  background: #e2e8f0;
}

.qty-minus:hover {
  background: #fee2e2;
  border-color: #fca5a5;
  color: #dc2626;
}

.qty-plus:hover {
  background: #dcfce7;
  border-color: #86efac;
  color: #16a34a;
}

.qty-input {
  width: 48px;
  text-align: center;
  padding: 4px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  color: #1e293b;
  font-size: 13px;
  font-weight: 700;
  -moz-appearance: textfield;
}

.qty-input::-webkit-outer-spin-button,
.qty-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
}

.qty-subtotal {
  font-size: 13px;
  font-weight: 600;
  color: #22c55e;
  margin-left: auto;
}

.empty-menu {
  padding: 24px;
  text-align: center;
  color: #94a3b8;
  font-size: 13px;
  margin: 0;
}

/* ── Summary ── */
.summary {
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  overflow: hidden;
}

.summary-title {
  margin: 0;
  padding: 12px 14px 8px;
  font-size: 13px;
  font-weight: 700;
  color: #22c55e;
  border-bottom: 1px solid #f1f5f9;
}

.summary-list {
  display: grid;
  gap: 0;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 14px;
  border-bottom: 1px solid #f8fafc;
  font-size: 13px;
}

.summary-row:last-child {
  border-bottom: none;
}

.summary-name {
  color: #1e293b;
}

.summary-subtotal {
  font-weight: 600;
  color: #22c55e;
}

.summary-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.total-value {
  font-size: 18px;
  font-weight: 700;
  color: #22c55e;
}

/* ── Error & Submit ── */
.form-error {
  margin: 0;
  color: #dc2626;
  font-size: 13px;
  font-weight: 600;
  padding: 10px 14px;
  background: #fef2f2;
  border-radius: 10px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-radius: 12px;
  padding: 10px 16px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #22c55e;
  color: #ffffff;
}

.btn-primary:hover:not(:disabled) {
  background: #16a34a;
}

.btn-submit {
  width: 100%;
  padding: 14px;
  font-size: 15px;
}

/* ── Success Card ── */
.success-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  padding: 48px 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.success-icon {
  margin-bottom: 8px;
}

.success-card h2 {
  margin: 0;
  font-size: 22px;
  color: #0f172a;
}

.success-order-id {
  margin: 0;
  font-size: 15px;
  color: #475569;
}

.success-hint {
  margin: 0;
  font-size: 13px;
  color: #94a3b8;
}

/* ── Responsive ── */
@media (max-width: 640px) {
  .page-header {
    padding: 20px;
  }

  h1 {
    font-size: 24px;
  }

  .form-card {
    padding: 20px;
  }

  .menu-qty-row {
    padding-left: 14px;
  }
}
</style>

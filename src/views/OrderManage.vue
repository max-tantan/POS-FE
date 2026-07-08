<script setup>
import { computed, onMounted, ref, watch, onBeforeUnmount } from 'vue'

const ordersStorageKey = 'sarapantelur.orders'
const statusFilters = ['Semua', 'Proses', 'Diproses', 'Dikirim', 'Selesai', 'Dibatalkan']
const orders = ref([])
const searchQuery = ref('')
const activeStatus = ref('Semua')
const loading = ref(false)

const fetchOrders = async () => {
  loading.value = true
  try {
    const res = await fetch('/orders', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
    if (res.ok) {
      const resData = await res.json()
      if (resData.status === 'success' && Array.isArray(resData.data)) {
        orders.value = resData.data.map(o => ({
          id: o.id,
          customer: o.nama_pelanggan,
          items: o.items || [],
          qty: o.items ? o.items.reduce((s, i) => s + (Number(i.jumlah) || 0), 0) : 0,
          totalAmount: Number(o.total_harga),
          status: o.status_pesanan,
          time: o.created_at,
        }))
        saveOrdersToStorage(orders.value)
      }
    }
  } catch {
    // fallback
  } finally {
    loading.value = false
  }
}

const searchedOrders = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  if (!q) return orders.value
  return orders.value.filter(
    o =>
      o.id.toLowerCase().includes(q) ||
      o.customer.toLowerCase().includes(q) ||
      o.items.some(i => (i.nama_produk || '').toLowerCase().includes(q)),
  )
})

const filteredOrders = computed(() => {
  let result = searchedOrders.value
  if (activeStatus.value !== 'Semua') {
    result = result.filter(o => o.status === activeStatus.value)
  }
  return result
})

const saveOrdersToStorage = (ordersList) => {
  localStorage.setItem(ordersStorageKey, JSON.stringify(ordersList))
}

const formatDate = (ts) => {
  if (!ts) return '-'
  const d = new Date(ts)
  return d.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}

const formatRupiah = (v) => 'Rp ' + Number(v).toLocaleString('id-ID')

const statusLabel = (s) => {
  const map = { Proses: 'Proses', Diproses: 'Diproses', Dikirim: 'Dikirim', Selesai: 'Selesai', Dibatalkan: 'Dibatalkan' }
  return map[s] || s
}

const changingOrderId = ref(null)

const confirmTarget = ref(null)

const confirmChange = (order, newStatus) => {
  if (newStatus === order.status) return
  confirmTarget.value = { order, oldStatus: order.status, newStatus }
}

const cancelConfirm = () => {
  confirmTarget.value = null
}

const executeConfirm = async () => {
  const t = confirmTarget.value
  if (!t) return
  changingOrderId.value = t.order.id
  try {
    const res = await fetch(`/orders/${t.order.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ status_pesanan: t.newStatus }),
    })
    if (res.ok) {
      t.order.status = t.newStatus
      saveOrdersToStorage(orders.value)
    }
  } catch {
    // fallback
  } finally {
    changingOrderId.value = null
    confirmTarget.value = null
  }
}

const deleteOrder = async (order) => {
  if (!confirm(`Hapus pesanan dari ${order.customer}?`)) return
  try {
    const res = await fetch(`/orders/${order.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
    if (res.ok) {
      orders.value = orders.value.filter(o => o.id !== order.id)
      saveOrdersToStorage(orders.value)
    }
  } catch {
    // fallback
  }
}

const handleStorageChange = () => {
  try {
    const raw = localStorage.getItem(ordersStorageKey)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        orders.value = parsed
      }
    }
  } catch {}
}

watch(orders, (value) => {
  saveOrdersToStorage(value)
}, { deep: true })

onMounted(() => {
  fetchOrders()
  window.addEventListener('storage', handleStorageChange)
})

onBeforeUnmount(() => {
  window.removeEventListener('storage', handleStorageChange)
})
</script>

<template>
  <section class="manage-page">
    <header class="page-header">
      <h1>Status Pesanan</h1>
    </header>

    <div class="table-toolbar">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Cari order..."
        class="search-input"
      />
      <div class="status-filters">
        <button
          v-for="s in statusFilters"
          :key="s"
          :class="['filter-btn', { active: activeStatus === s }]"
          @click="activeStatus = s"
        >{{ s }}</button>
      </div>
    </div>

    <div class="table-card">
      <div v-if="loading" class="loading-state">Memuat data...</div>
      <div v-else-if="filteredOrders.length === 0" class="empty-state">
        Tidak ada pesanan.
      </div>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Pelanggan</th>
              <th>Menu</th>
              <th>Qty</th>
              <th>Total</th>
              <th>Status</th>
              <th>Waktu</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in filteredOrders" :key="order.id">
              <td>{{ order.customer }}</td>
              <td>
                <span v-for="(item, i) in order.items" :key="i">
                  {{ item.nama_produk }}<span v-if="i < order.items.length - 1">, </span>
                </span>
              </td>
              <td>{{ order.qty }}</td>
              <td>{{ formatRupiah(order.totalAmount) }}</td>
              <td>
                <span class="status-badge" :class="'status-' + order.status.toLowerCase()">
                  {{ statusLabel(order.status) }}
                </span>
              </td>
              <td class="time-cell">{{ formatDate(order.time) }}</td>
              <td class="action-cell">
                <select
                  class="status-select"
                  :value="order.status"
                  :disabled="changingOrderId === order.id"
                  @change="confirmChange(order, $event.target.value)"
                >
                  <option value="Proses">Proses</option>
                  <option value="Diproses">Diproses</option>
                  <option value="Dikirim">Dikirim</option>
                  <option value="Selesai">Selesai</option>
                  <option value="Dibatalkan">Dibatalkan</option>
                </select>
                <button
                  v-if="order.status === 'Selesai' || order.status === 'Dibatalkan'"
                  class="btn btn-danger btn-sm"
                  @click="deleteOrder(order)"
                >Hapus</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div v-if="confirmTarget" class="modal-backdrop" @click.self="cancelConfirm">
      <div class="modal-box">
        <h3>Konfirmasi Ubah Status</h3>
        <p>
          Ubah status pesanan <strong>{{ confirmTarget.order.customer }}</strong>
          dari <span class="badge-old">{{ confirmTarget.oldStatus }}</span>
          menjadi <span class="badge-new">{{ confirmTarget.newStatus }}</span>?
        </p>
        <div class="modal-actions">
          <button class="btn btn-ghost" @click="cancelConfirm">Batal</button>
          <button class="btn btn-primary" :disabled="changingOrderId === confirmTarget.order.id" @click="executeConfirm">
            {{ changingOrderId === confirmTarget.order.id ? 'Menyimpan...' : 'Konfirmasi' }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.manage-page {
  padding: 32px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header h1 {
  margin: 0 0 24px;
  font-size: 26px;
  color: #0f172a;
}

.table-toolbar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.search-input {
  width: 100%;
  max-width: 320px;
  border: 1px solid #e2e8f0;
  border-radius: 50px;
  padding: 10px 16px;
  font-size: 14px;
  background: #f8fafc;
  outline: none;
  transition: border-color 0.2s ease;
}

.search-input:focus {
  border-color: #22c55e;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.15);
}

.status-filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-btn {
  border: 1px solid #e2e8f0;
  border-radius: 50px;
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 600;
  background: #ffffff;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-btn:hover {
  background: #f1f5f9;
}

.filter-btn.active {
  background: #22c55e;
  color: #ffffff;
  border-color: #22c55e;
}

.table-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  overflow: hidden;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 60px 0;
  color: #94a3b8;
  font-size: 15px;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th {
  text-align: left;
  padding: 14px 16px;
  font-size: 12px;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

td {
  padding: 14px 16px;
  font-size: 14px;
  color: #1e293b;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
}

tr:last-child td {
  border-bottom: none;
}

tr:hover td {
  background: #f8fafc;
}

.time-cell {
  white-space: nowrap;
  font-size: 13px;
  color: #64748b;
}

.action-cell {
  display: flex;
  gap: 6px;
  flex-wrap: nowrap;
  align-items: center;
}

.status-select {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 5px 8px;
  font-size: 12px;
  font-weight: 600;
  background: #ffffff;
  color: #1e293b;
  cursor: pointer;
  outline: none;
  transition: border-color 0.2s ease;
}

.status-select:focus {
  border-color: #22c55e;
  box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.15);
}

.status-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 50px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.status-proses {
  background: #f1f5f9;
  color: #475569;
}

.status-diproses {
  background: #fef3c7;
  color: #92400e;
}

.status-dikirim {
  background: #dbeafe;
  color: #1e40af;
}

.status-selesai {
  background: #dcfce7;
  color: #166534;
}

.status-dibatalkan {
  background: #fee2e2;
  color: #991b1b;
}

.btn {
  border: none;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;
  white-space: nowrap;
}

.btn-sm {
  padding: 5px 10px;
  font-size: 11px;
}

.btn-success {
  background: #22c55e;
  color: #ffffff;
}

.btn-success:hover {
  background: #16a34a;
}

.btn-warning {
  background: #f59e0b;
  color: #ffffff;
}

.btn-warning:hover {
  background: #d97706;
}

.btn-danger {
  background: #ef4444;
  color: #ffffff;
}

.btn-danger:hover {
  background: #dc2626;
}

.text-muted {
  color: #94a3b8;
  font-size: 12px;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: grid;
  place-items: center;
  z-index: 50;
}

.modal-box {
  background: #ffffff;
  border-radius: 18px;
  padding: 28px 32px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
}

.modal-box h3 {
  margin: 0 0 12px;
  font-size: 18px;
  color: #0f172a;
}

.modal-box p {
  margin: 0 0 20px;
  font-size: 14px;
  color: #475569;
  line-height: 1.6;
}

.badge-old,
.badge-new {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 50px;
  font-size: 12px;
  font-weight: 700;
}

.badge-old {
  background: #f1f5f9;
  color: #64748b;
}

.badge-new {
  background: #dcfce7;
  color: #166534;
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.btn-ghost {
  background: transparent;
  color: #64748b;
  border: 1px solid #e2e8f0;
}

.btn-ghost:hover {
  background: #f1f5f9;
}

.btn-primary {
  background: #22c55e;
  color: #ffffff;
}

.btn-primary:hover {
  background: #16a34a;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>

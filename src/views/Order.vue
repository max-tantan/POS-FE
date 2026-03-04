<script setup>
import { computed, reactive, ref, watch } from 'vue'

const statusFilters = ['Semua', 'Diproses', 'Dikirim', 'Selesai', 'Dibatalkan']
const periodFilters = ['Semua', 'Hari Ini']
const today = new Date().toISOString().slice(0, 10)

const orders = ref([])
const searchQuery = ref('')
const activeStatus = ref('Semua')
const activePeriod = ref('Semua')
const selectedOrderId = ref(null)
const nextOrderNumber = ref(1037)
const formMode = ref('create')
const editingOrderId = ref(null)
const formError = ref('')

const menuOptions = ref([
  { name: 'Telur Mata Sapi', price: 12000 },
  { name: 'Jus Jeruk', price: 10000 },
])

const newMenuOption = reactive({
  name: '',
  price: 10000,
})

const menuEditIndex = ref(null)
const menuEditDraft = reactive({
  name: '',
  price: 0,
})

const form = reactive({
  customer: '',
  menuName: menuOptions.value[0]?.name ?? '',
  qty: 1,
})

const normalizeName = (value) => value.trim().toLowerCase()

const formatRupiah = (value) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)

const getCurrentTimeLabel = () =>
  new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

const statusClass = (status) => {
  const map = {
    Diproses: 'processing',
    Dikirim: 'shipped',
    Selesai: 'completed',
    Dibatalkan: 'cancelled',
  }

  return map[status] || 'processing'
}

const findMenuOptionByName = (name) =>
  menuOptions.value.find((option) => normalizeName(option.name) === normalizeName(name))

const selectedMenuOption = computed(() => findMenuOptionByName(form.menuName) ?? null)

const estimatedTotal = computed(() => {
  const price = selectedMenuOption.value?.price ?? 0
  return Math.max(1, Number(form.qty) || 1) * price
})

const searchedOrders = computed(() => {
  const keyword = searchQuery.value.trim().toLowerCase()
  if (!keyword) {
    return orders.value
  }

  return orders.value.filter((order) => {
    const haystack = `${order.id} ${order.customer} ${order.menu}`.toLowerCase()
    return haystack.includes(keyword)
  })
})

const filteredOrders = computed(() =>
  searchedOrders.value.filter((order) => {
    const passStatus = activeStatus.value === 'Semua' || order.status === activeStatus.value
    const passPeriod = activePeriod.value === 'Semua' || order.date === today
    return passStatus && passPeriod
  }),
)

const selectedOrder = computed(
  () => filteredOrders.value.find((order) => order.id === selectedOrderId.value) ?? filteredOrders.value[0] ?? null,
)

const stats = computed(() => {
  const source = filteredOrders.value
  return [
    { id: 'total', label: 'Total Order', value: source.length },
    { id: 'ongoing', label: 'Sedang Diproses', value: source.filter((item) => item.status === 'Diproses').length },
    { id: 'shipped', label: 'Dalam Pengiriman', value: source.filter((item) => item.status === 'Dikirim').length },
    { id: 'completed', label: 'Selesai', value: source.filter((item) => item.status === 'Selesai').length },
  ]
})

watch(filteredOrders, (list) => {
  if (!list.length) {
    selectedOrderId.value = null
    return
  }

  if (!list.some((item) => item.id === selectedOrderId.value)) {
    selectedOrderId.value = list[0].id
  }
})

watch(
  menuOptions,
  (list) => {
    if (!list.length) {
      form.menuName = ''
      return
    }

    if (!findMenuOptionByName(form.menuName)) {
      form.menuName = list[0].name
    }
  },
  { deep: true },
)

const resetForm = () => {
  form.customer = ''
  form.menuName = menuOptions.value[0]?.name ?? ''
  form.qty = 1
  formError.value = ''
}

const ensureMenuFromOrder = (order) => {
  if (!order.menu || findMenuOptionByName(order.menu)) {
    return
  }

  const approxPrice = Math.max(1000, Math.round(order.totalAmount / Math.max(1, order.qty)))
  menuOptions.value.push({ name: order.menu, price: approxPrice })
}

const fillForm = (order) => {
  ensureMenuFromOrder(order)

  form.customer = order.customer
  form.menuName = order.menu
  form.qty = order.qty
  formError.value = ''
}

const openCreateForm = () => {
  formMode.value = 'create'
  editingOrderId.value = null
  resetForm()
}

const openEditForm = (order) => {
  formMode.value = 'edit'
  editingOrderId.value = order.id
  fillForm(order)
}

const addMenuOption = () => {
  const name = newMenuOption.name.trim()
  const price = Number(newMenuOption.price)

  if (!name || !Number.isFinite(price) || price < 1000 || findMenuOptionByName(name)) {
    return
  }

  menuOptions.value.push({ name, price })
  form.menuName = name
  newMenuOption.name = ''
  newMenuOption.price = 10000
}

const beginEditMenuOption = (index) => {
  menuEditIndex.value = index
  menuEditDraft.name = menuOptions.value[index].name
  menuEditDraft.price = menuOptions.value[index].price
}

const saveEditMenuOption = () => {
  const index = menuEditIndex.value
  if (index === null) {
    return
  }

  const name = menuEditDraft.name.trim()
  const price = Number(menuEditDraft.price)

  if (!name || !Number.isFinite(price) || price < 1000) {
    return
  }

  const duplicate = menuOptions.value.some(
    (item, itemIndex) => itemIndex !== index && normalizeName(item.name) === normalizeName(name),
  )
  if (duplicate) {
    return
  }

  const previousName = menuOptions.value[index].name
  menuOptions.value[index] = { name, price }

  if (normalizeName(form.menuName) === normalizeName(previousName)) {
    form.menuName = name
  }

  orders.value = orders.value.map((order) => (order.menu === previousName ? { ...order, menu: name } : order))

  menuEditIndex.value = null
  menuEditDraft.name = ''
  menuEditDraft.price = 0
}

const removeMenuOption = (index) => {
  if (menuOptions.value.length === 1) {
    return
  }

  const removed = menuOptions.value[index]
  menuOptions.value = menuOptions.value.filter((_, itemIndex) => itemIndex !== index)

  if (normalizeName(form.menuName) === normalizeName(removed.name)) {
    form.menuName = menuOptions.value[0]?.name ?? ''
  }

  if (menuEditIndex.value === index) {
    menuEditIndex.value = null
    menuEditDraft.name = ''
    menuEditDraft.price = 0
  }
}

const saveOrder = () => {
  const customer = form.customer.trim()
  const menuName = form.menuName.trim()
  const qty = Number(form.qty)

  if (!customer || !menuName || !Number.isFinite(qty) || qty < 1 || !selectedMenuOption.value) {
    formError.value = 'Isi customer, pilih menu, dan qty minimal 1.'
    return
  }

  const totalAmount = estimatedTotal.value

  if (formMode.value === 'create') {
    const newOrder = {
      id: `#ORD-${nextOrderNumber.value}`,
      customer,
      menu: menuName,
      qty,
      totalAmount,
      status: 'Diproses',
      time: getCurrentTimeLabel(),
      date: today,
      timeline: [{ id: 1, text: 'Order dibuat admin', meta: getCurrentTimeLabel() }],
    }

    nextOrderNumber.value += 1
    orders.value = [newOrder, ...orders.value]
    selectedOrderId.value = newOrder.id
    openCreateForm()
    return
  }

  orders.value = orders.value.map((order) => {
    if (order.id !== editingOrderId.value) {
      return order
    }

    const nextTimelineId = (order.timeline.at(-1)?.id ?? 0) + 1
    return {
      ...order,
      customer,
      menu: menuName,
      qty,
      totalAmount,
      timeline: [...order.timeline, { id: nextTimelineId, text: 'Order diperbarui admin', meta: getCurrentTimeLabel() }],
    }
  })

  selectedOrderId.value = editingOrderId.value
  openCreateForm()
}

const cancelOrder = (orderId) => {
  orders.value = orders.value.map((order) => {
    if (order.id !== orderId || order.status === 'Dibatalkan') {
      return order
    }

    const nextTimelineId = (order.timeline.at(-1)?.id ?? 0) + 1
    return {
      ...order,
      status: 'Dibatalkan',
      timeline: [...order.timeline, { id: nextTimelineId, text: 'Order dibatalkan admin', meta: getCurrentTimeLabel() }],
    }
  })
}

const deleteOrder = (orderId) => {
  const order = orders.value.find((item) => item.id === orderId)
  if (!order) {
    return
  }

  if (!window.confirm(`Hapus order ${order.id} milik ${order.customer}?`)) {
    return
  }

  orders.value = orders.value.filter((item) => item.id !== orderId)
  if (editingOrderId.value === orderId) {
    openCreateForm()
  }
}

resetForm()
</script>

<template>
  <section class="order-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">Order Management</p>
        <h1>Order</h1>
        <p class="subtitle">Form dipersingkat: cukup customer, menu, qty. Total dan waktu otomatis.</p>
      </div>
    </header>

    <div class="stats-grid">
      <article v-for="item in stats" :key="item.id" class="stat-card">
        <p class="stat-label">{{ item.label }}</p>
        <p class="stat-value">{{ item.value }}</p>
        <p class="stat-meta">Data mengikuti filter aktif</p>
      </article>
    </div>

    <div class="content-grid">
      <section class="table-card">
        <div class="table-toolbar">
          <input
            v-model="searchQuery"
            class="search"
            type="text"
            placeholder="Cari order, pelanggan, atau menu"
          />
          <div class="table-actions">
            <button
              v-for="status in statusFilters"
              :key="status"
              class="btn btn-soft small"
              :class="{ active: activeStatus === status }"
              @click="activeStatus = status"
            >
              {{ status }}
          </button>
          </div>
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ID Order</th>
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
              <tr
                v-for="order in filteredOrders"
                :key="order.id"
                class="row-click"
                :class="{ selected: selectedOrder?.id === order.id }"
                @click="selectedOrderId = order.id"
              >
                <td class="order-id">{{ order.id }}</td>
                <td>{{ order.customer }}</td>
                <td class="menu-col">{{ order.menu }}</td>
                <td>{{ order.qty }}</td>
                <td>{{ formatRupiah(order.totalAmount) }}</td>
                <td>
                  <span class="badge" :class="statusClass(order.status)">
                    {{ order.status }}
                  </span>
                </td>
                <td>{{ order.time }}</td>
                <td>
                  <div class="row-actions">
                    <button class="btn btn-soft xsmall" @click.stop="openEditForm(order)">Edit</button>
                    <button
                      class="btn btn-warning xsmall"
                      :disabled="order.status === 'Dibatalkan'"
                      @click.stop="cancelOrder(order.id)"
                    >
                      Batalkan
                    </button>
                    <button class="btn btn-danger xsmall" @click.stop="deleteOrder(order.id)">Hapus</button>
                  </div>
                </td>
              </tr>
              <tr v-if="!filteredOrders.length">
                <td colspan="8" class="empty">Belum ada order. Tambah lewat form praktis di kanan.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <aside class="side-panel">
        <section class="side-card highlight" v-if="selectedOrder">
          <p class="side-label">Order Dipilih</p>
          <p class="side-big">{{ selectedOrder.id }}</p>
          <p class="side-sub">
            {{ selectedOrder.customer }} • {{ selectedOrder.qty }} item • {{ formatRupiah(selectedOrder.totalAmount) }}
          </p>
          <span class="badge" :class="statusClass(selectedOrder.status)">{{ selectedOrder.status }}</span>
          <div class="detail-actions">
            <button class="btn btn-soft" @click="openEditForm(selectedOrder)">Edit Order</button>
            <button
              class="btn btn-warning"
              :disabled="selectedOrder.status === 'Dibatalkan'"
              @click="cancelOrder(selectedOrder.id)"
            >
              Batalkan Order
            </button>
            <button class="btn btn-danger" @click="deleteOrder(selectedOrder.id)">Hapus Order</button>
          </div>
        </section>

        <section class="side-card" v-if="selectedOrder">
          <h2>Timeline</h2>
          <ul class="timeline">
            <li v-for="item in selectedOrder.timeline" :key="item.id">
              <div>
                <p>{{ item.text }}</p>
                <span>{{ item.meta }}</span>
              </div>
            </li>
          </ul>
        </section>

        <section class="side-card">
          <h2>{{ formMode === 'create' ? 'Tambah Order Cepat' : 'Edit Order' }}</h2>
          <form class="order-form" @submit.prevent="saveOrder">
            <label>
              Customer
              <input v-model="form.customer" type="text" placeholder="Nama customer" />
            </label>

            <label>
              Menu
              <select v-model="form.menuName">
                <option v-for="option in menuOptions" :key="option.name" :value="option.name">
                  {{ option.name }} - {{ formatRupiah(option.price) }}
                </option>
              </select>
            </label>

            <label>
              Qty
              <input v-model.number="form.qty" type="number" min="1" />
            </label>

            <div class="auto-summary">
              <p>
                Total otomatis:
                <strong>{{ formatRupiah(estimatedTotal) }}</strong>
              </p>
              <p>Status default order baru: <strong>Diproses</strong></p>
            </div>
            <p v-if="formError" class="form-error">{{ formError }}</p>

            <div class="form-actions">
              <button type="button" class="btn btn-soft" @click="openCreateForm">Reset</button>
              <button type="submit" class="btn btn-primary">
                {{ formMode === 'create' ? 'Simpan Order' : 'Update Order' }}
              </button>
            </div>
          </form>
        </section>
      </aside>
    </div>
  </section>
</template>

<style scoped>
.order-page {
  display: grid;
  gap: 20px;
  color: #dbe9f5;
}

.page-header {
  background: linear-gradient(135deg, #173c5e, #1c5a7e);
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 20px;
  padding: 24px;
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: flex-start;
}

.eyebrow {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 12px;
  color: #a3d6f8;
}

h1 {
  margin: 6px 0;
  font-size: clamp(28px, 3vw, 34px);
  color: #f3fbff;
}

.subtitle {
  margin: 0;
  color: #cae5f8;
  font-size: 14px;
}

.btn {
  border: 0;
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.btn-soft {
  background: rgba(226, 232, 240, 0.15);
  color: #e2e8f0;
  border: 1px solid rgba(148, 163, 184, 0.3);
}

.btn-soft.active {
  background: rgba(148, 197, 230, 0.35);
  color: #f8fafc;
}

.btn.small {
  padding: 8px 10px;
  font-size: 12px;
}

.btn-primary {
  background: #f5c65d;
  color: #1f2937;
}

.btn-warning {
  background: #f59e0b;
  color: #1f2937;
}

.btn-danger {
  background: #ef4444;
  color: #fef2f2;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn.xsmall {
  padding: 6px 8px;
  font-size: 11px;
  border-radius: 10px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.stat-card {
  background: #16324b;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 16px;
  padding: 16px;
}

.stat-label {
  margin: 0;
  color: #9ec3de;
  font-size: 12px;
}

.stat-value {
  margin: 6px 0 4px;
  font-size: 26px;
  font-weight: 700;
  color: #f8fafc;
}

.stat-meta {
  margin: 0;
  font-size: 12px;
  color: #7dd3ab;
}

.content-grid {
  display: grid;
  grid-template-columns: 1.45fr 0.95fr;
  gap: 16px;
}

.table-card,
.side-card {
  background: #16324b;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 18px;
}

.table-card {
  padding: 16px;
}

.table-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.search {
  width: 100%;
  max-width: 360px;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 10px;
  background: #0f2a41;
  color: #dbe9f5;
  padding: 10px 12px;
}

.search::placeholder {
  color: #7fa5c0;
}

.table-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 860px;
}

th,
td {
  text-align: left;
  padding: 12px 10px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
  font-size: 13px;
}

th {
  color: #9ec3de;
  font-weight: 600;
}

td {
  color: #dbe9f5;
}

.row-click {
  cursor: pointer;
}

.row-click.selected {
  background: rgba(147, 197, 253, 0.12);
}

.order-id {
  color: #93c5fd;
  font-weight: 700;
}

.menu-col {
  max-width: 240px;
}

.row-actions {
  display: flex;
  gap: 6px;
}

.empty {
  text-align: center;
  color: #9ec3de;
}

.badge {
  display: inline-block;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
}

.badge.processing {
  background: rgba(250, 204, 21, 0.2);
  color: #fde68a;
}

.badge.shipped {
  background: rgba(59, 130, 246, 0.2);
  color: #bfdbfe;
}

.badge.completed {
  background: rgba(34, 197, 94, 0.2);
  color: #bbf7d0;
}

.badge.cancelled {
  background: rgba(239, 68, 68, 0.2);
  color: #fecaca;
}

.side-panel {
  display: grid;
  gap: 12px;
}

.side-card {
  padding: 16px;
}

.side-card.highlight {
  background: linear-gradient(145deg, #185887, #1f6a99);
}

.side-label {
  margin: 0;
  color: #c9e7fb;
  font-size: 12px;
}

.side-big {
  margin: 8px 0 4px;
  font-size: 26px;
  font-weight: 700;
  color: #f8fafc;
}

.side-sub {
  margin: 0 0 14px;
  color: #d9ecf8;
  font-size: 13px;
}

.detail-actions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

h2 {
  margin: 0 0 14px;
  font-size: 18px;
  color: #f1f5f9;
}

.timeline {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 10px;
}

.timeline li {
  padding: 10px 12px;
  background: #0f2a41;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.16);
}

.timeline p {
  margin: 0;
  font-size: 13px;
  color: #e2e8f0;
}

.timeline span {
  display: inline-block;
  margin-top: 5px;
  font-size: 12px;
  color: #9ec3de;
}

.order-form {
  display: grid;
  gap: 10px;
}

.order-form label {
  display: grid;
  gap: 6px;
  font-size: 12px;
  color: #9ec3de;
}

.order-form input,
.order-form select {
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 10px;
  background: #0f2a41;
  color: #dbe9f5;
  padding: 10px 12px;
}

.auto-summary {
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 12px;
  background: rgba(15, 42, 65, 0.45);
  padding: 10px;
}

.auto-summary p {
  margin: 0;
  font-size: 12px;
  color: #cfe5f5;
}

.auto-summary p + p {
  margin-top: 6px;
}

.menu-option-panel {
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 12px;
  background: rgba(15, 42, 65, 0.45);
  padding: 10px;
  display: grid;
  gap: 8px;
}

.menu-option-title {
  margin: 0;
  color: #9ec3de;
  font-size: 12px;
}

.menu-option-create {
  display: grid;
  grid-template-columns: 1fr 130px auto;
  gap: 8px;
}

.menu-option-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
}

.menu-option-list li {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 8px;
}

.menu-option-list li input {
  width: 100%;
}

.menu-option-list span {
  font-size: 13px;
  color: #dbe9f5;
}

.menu-option-actions {
  display: flex;
  gap: 6px;
}

.form-error {
  margin: 0;
  color: #fca5a5;
  font-size: 12px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .content-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 700px) {
  .page-header {
    flex-direction: column;
  }

  .header-actions,
  .table-toolbar {
    width: 100%;
  }

  .table-toolbar {
    flex-direction: column;
  }

  .search {
    max-width: none;
  }

  .table-actions {
    justify-content: flex-start;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .menu-option-create {
    grid-template-columns: 1fr;
  }

  .menu-option-list li {
    grid-template-columns: 1fr;
  }

  .form-actions {
    justify-content: flex-start;
  }
}
</style>

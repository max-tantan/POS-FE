<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

const statusFilters = ['Semua', 'Diproses', 'Dikirim', 'Selesai', 'Dibatalkan']
const periodFilters = ['Semua', 'Hari Ini']
const productTypes = ['Makanan', 'Minuman', 'Snack', 'Lainnya']
const activeProductType = ref('Semua')
const filteredMenuOptions = computed(() => {
  if (activeProductType.value === 'Semua') return menuOptions.value
  return menuOptions.value.filter(m => m.type === activeProductType.value)
})
const ordersStorageKey = 'sarapantelur.orders'
const nextOrderStorageKey = 'sarapantelur.nextOrderNumber'
const today = new Date().toISOString().slice(0, 10)
const isAdmin = computed(() => false)
const isCustomer = computed(() => true)
const router = useRouter()

const parseStoredOrders = () => {
  try {
    const raw = localStorage.getItem(ordersStorageKey)
    if (!raw) {
      return []
    }
    
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const inferNextOrderNumber = (orderList) => {
  const highest = orderList.reduce((max, order) => {
    const match = String(order?.id ?? '').match(/#ORD-(\d+)/)
    if (!match) {
      return max
    }

    return Math.max(max, Number(match[1]))
  }, 1036)
  return highest + 1
}

const storedOrders = parseStoredOrders()
const parsedStoredNext = Number(localStorage.getItem(nextOrderStorageKey))

const orders = ref(storedOrders)
const searchQuery = ref('')
const activeStatus = ref('Semua')
const activePeriod = ref('Semua')
const selectedOrderId = ref(null)
const nextOrderNumber = ref(
  Number.isFinite(parsedStoredNext) && parsedStoredNext >= 1000
    ? Math.max(parsedStoredNext, inferNextOrderNumber(storedOrders))
    : inferNextOrderNumber(storedOrders),
)
const formMode = ref('create')
const editingOrderId = ref(null)
const formError = ref('')
const showProductForm = ref(false)
const productFormError = ref('')
const menuEditError = ref('')
const productImageInputKey = ref(0)
const editImageInputKey = ref(0)

const menuOptions = ref([])

const fetchProduk = async () => {
  try {
    const res = await fetch('/produk')
    const resData = await res.json()
    if (resData.status === 'success' && Array.isArray(resData.data)) {
      menuOptions.value = resData.data.map(p => ({
        id: p.id,
        name: p.nama_produk,
        type: p.jenis_produk,
        price: Number(p.harga_produk),
        image: p.foto_produk ? `/uploads/${p.foto_produk}` : '',
      }))
    }
  } catch {
    // fallback: biarkan menuOptions tetap array kosong
  }
}

onMounted(fetchProduk)
const customerOrderNumber = ref('')

const productForm = reactive({
  name: '',
  type: productTypes[0],
  price: 10000,
  image: '',
})

const menuEditIndex = ref(null)
const menuEditDraft = reactive({
  name: '',
  type: productTypes[0],
  price: 0,
  image: '',
})

const form = reactive({
  customer: '',
})
const selectedMenus = ref([])
const menuQtyDraft = reactive({})

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

const selectedMenuItems = computed(() =>
  selectedMenus.value
    .map((menuName) => {
      const option = findMenuOptionByName(menuName)
      if (!option) {
        return null
      }

      const qty = Math.max(1, Number(menuQtyDraft[menuName]) || 1)
      return {
        name: option.name,
        price: option.price,
        qty,
        subtotal: option.price * qty,
      }
    })
    .filter(Boolean),
)

const estimatedTotal = computed(() => selectedMenuItems.value.reduce((sum, item) => sum + item.subtotal, 0))
const estimatedTotalQty = computed(() => selectedMenuItems.value.reduce((sum, item) => sum + item.qty, 0))

const setDefaultMenuSelection = () => {
  selectedMenus.value = []
  Object.keys(menuQtyDraft).forEach((key) => {
    delete menuQtyDraft[key]
  })

  const firstMenu = menuOptions.value[0]
  if (firstMenu) {
    selectedMenus.value = [firstMenu.name]
    menuQtyDraft[firstMenu.name] = 1
  }
}

const syncFormSelectionByMenuOptions = () => {
  const validMenuNames = menuOptions.value.map((menu) => menu.name)
  const validSet = new Set(validMenuNames.map((name) => normalizeName(name)))

  selectedMenus.value = selectedMenus.value.filter((name) => validSet.has(normalizeName(name)))

  Object.keys(menuQtyDraft).forEach((name) => {
    if (!validSet.has(normalizeName(name))) {
      delete menuQtyDraft[name]
    }
  })

  if (!selectedMenus.value.length && menuOptions.value.length) {
    selectedMenus.value = [menuOptions.value[0].name]
  }

  selectedMenus.value.forEach((name) => {
    const qty = Number(menuQtyDraft[name])
    if (!Number.isFinite(qty) || qty < 1) {
      menuQtyDraft[name] = 1
    }
  })
}

const toggleMenuSelection = (menuName, checked) => {
  if (checked) {
    if (!selectedMenus.value.includes(menuName)) {
      selectedMenus.value = [...selectedMenus.value, menuName]
    }

    if (!menuQtyDraft[menuName]) {
      menuQtyDraft[menuName] = 1
    }
    return
  }

  selectedMenus.value = selectedMenus.value.filter((name) => name !== menuName)
  delete menuQtyDraft[menuName]
}

const setMenuQuantity = (menuName, value) => {
  const qty = Math.max(1, Number(value) || 1)
  menuQtyDraft[menuName] = qty
}

const incrementQty = (menuName) => {
  const current = Number(menuQtyDraft[menuName]) || 1
  menuQtyDraft[menuName] = current + 1
}

const decrementQty = (menuName) => {
  const current = Number(menuQtyDraft[menuName]) || 1
  if (current <= 1) {
    toggleMenuSelection(menuName, false)
    return
  }
  menuQtyDraft[menuName] = current - 1
}

const removeSelectedMenu = (menuName) => {
  toggleMenuSelection(menuName, false)
}

const buildMenuSummary = (items) => items.map((item) => `${item.name} x${item.qty}`).join(', ')

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
  () => {
    syncFormSelectionByMenuOptions()
  },
  { deep: true, immediate: true },
)

watch(
  orders,
  (value) => {
    localStorage.setItem(ordersStorageKey, JSON.stringify(value))
  },
  { deep: true },
)

watch(nextOrderNumber, (value) => {
  localStorage.setItem(nextOrderStorageKey, String(value))
})

const resetForm = () => {
  form.customer = ''
  setDefaultMenuSelection()
  formError.value = ''
}

const ensureMenuFromOrder = (order) => {
  const orderItems = Array.isArray(order.items) && order.items.length
    ? order.items
    : [{ name: order.menu, qty: order.qty, price: Math.max(1000, Math.round(order.totalAmount / Math.max(1, order.qty))) }]

  orderItems.forEach((item) => {
    if (!item?.name || findMenuOptionByName(item.name)) {
      return
    }

    const approxPrice = Math.max(1000, Number(item.price) || Math.round(order.totalAmount / Math.max(1, order.qty)))
    menuOptions.value.push({
      name: item.name,
      type: 'Lainnya',
      price: approxPrice,
      image:
        'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=900&q=80',
    })
  })
}

const fillForm = (order) => {
  ensureMenuFromOrder(order)

  form.customer = order.customer
  selectedMenus.value = []
  Object.keys(menuQtyDraft).forEach((key) => {
    delete menuQtyDraft[key]
  })

  if (Array.isArray(order.items) && order.items.length) {
    order.items.forEach((item) => {
      if (!item?.name) {
        return
      }

      selectedMenus.value.push(item.name)
      menuQtyDraft[item.name] = Math.max(1, Number(item.qty) || 1)
    })
  } else if (order.menu) {
    selectedMenus.value = [order.menu]
    menuQtyDraft[order.menu] = Math.max(1, Number(order.qty) || 1)
  }

  syncFormSelectionByMenuOptions()
  formError.value = ''
}

const openCreateForm = () => {
  formMode.value = 'create'
  editingOrderId.value = null
  resetForm()
}

const openEditForm = (order) => {
  if (!isAdmin.value) {
    return
  }

  formMode.value = 'edit'
  editingOrderId.value = order.id
  fillForm(order)
}

const resetProductForm = () => {
  productForm.name = 'Produk Baru'
  productForm.type = productTypes[0]
  productForm.price = 10000
  productForm.image = ''
  productFormError.value = ''
  productImageInputKey.value += 1
}

const openProductForm = () => {
  if (!isAdmin.value) {
    return
  }

  showProductForm.value = true
  menuEditIndex.value = null
  menuEditDraft.name = ''
  menuEditDraft.type = productTypes[0]
  menuEditDraft.price = 0
  menuEditDraft.image = ''
  menuEditError.value = ''
  editImageInputKey.value += 1
  resetProductForm()
}

const closeProductForm = () => {
  showProductForm.value = false
  cancelEditMenuOption()
  resetProductForm()
}

const createProduct = () => {
  if (!isAdmin.value) {
    return
  }

  const name = productForm.name.trim()
  const type = productForm.type
  const price = Number(productForm.price)
  const image = productForm.image.trim()
  productFormError.value = ''

  if (!name) {
    productFormError.value = 'Nama produk wajib diisi.'
    return
  }

  if (!productTypes.includes(type)) {
    productFormError.value = 'Jenis produk tidak valid.'
    return
  }

  if (!Number.isFinite(price) || price < 1000) {
    productFormError.value = 'Harga minimal Rp1.000.'
    return
  }

  if (findMenuOptionByName(name)) {
    productFormError.value = 'Nama produk sudah ada.'
    return
  }

  menuOptions.value.push({ name, type, price, image })
  selectedMenus.value = [...selectedMenus.value, name]
  menuQtyDraft[name] = 1
  resetProductForm()
}

const onProductImageChange = (event) => {
  const file = event.target?.files?.[0]
  if (!file) {
    productForm.image = ''
    productForm.imageFile = null
    productFormError.value = ''
    return
  }

  if (!file.type.startsWith('image/')) {
    productForm.image = ''
    productForm.imageFile = null
    productFormError.value = 'File foto harus berupa gambar.'
    productImageInputKey.value += 1
    return
  }

  productForm.imageFile = file
  productForm.image = URL.createObjectURL(file)
  productFormError.value = ''
}

const beginEditMenuOption = (index) => {
  if (!isAdmin.value) {
    return
  }

  menuEditIndex.value = index
  menuEditDraft.name = menuOptions.value[index].name
  menuEditDraft.type = menuOptions.value[index].type || productTypes[0]
  menuEditDraft.price = menuOptions.value[index].price
  menuEditDraft.image = menuOptions.value[index].image || ''
  menuEditError.value = ''
  editImageInputKey.value += 1
}

const onEditImageChange = (event) => {
  const file = event.target?.files?.[0]
  if (!file) {
    menuEditError.value = ''
    return
  }

  if (!file.type.startsWith('image/')) {
    menuEditDraft.image = ''
    menuEditError.value = 'File foto harus berupa gambar.'
    editImageInputKey.value += 1
    return
  }

  menuEditDraft.imageFile = file
  menuEditDraft.image = URL.createObjectURL(file)
  menuEditError.value = ''
}

const cancelEditMenuOption = () => {
  menuEditIndex.value = null
  menuEditDraft.name = ''
  menuEditDraft.type = productTypes[0]
  menuEditDraft.price = 0
  menuEditDraft.image = ''
  menuEditError.value = ''
  editImageInputKey.value += 1
}

const saveEditMenuOption = () => {
  if (!isAdmin.value) {
    return
  }

  const index = menuEditIndex.value
  if (index === null) {
    return
  }

  const name = menuEditDraft.name.trim()
  const type = menuEditDraft.type
  const price = Number(menuEditDraft.price)
  const image = menuEditDraft.image.trim()

  if (!name || !Number.isFinite(price) || price < 1000 || !productTypes.includes(type)) {
    menuEditError.value = 'Data produk tidak valid.'
    return
  }

  const duplicate = menuOptions.value.some(
    (item, itemIndex) => itemIndex !== index && normalizeName(item.name) === normalizeName(name),
  )
  if (duplicate) {
    menuEditError.value = 'Nama produk sudah digunakan.'
    return
  }

  const previousName = menuOptions.value[index].name
  menuOptions.value[index] = { name, type, price, image }

  if (selectedMenus.value.includes(previousName)) {
    selectedMenus.value = selectedMenus.value.map((item) => (item === previousName ? name : item))
    menuQtyDraft[name] = Math.max(1, Number(menuQtyDraft[previousName]) || 1)
    delete menuQtyDraft[previousName]
  }

  orders.value = orders.value.map((order) => {
    if (Array.isArray(order.items) && order.items.length) {
      const hasMenu = order.items.some((item) => normalizeName(item.name) === normalizeName(previousName))
      if (!hasMenu) {
        return order
      }

      const nextItems = order.items.map((item) =>
        normalizeName(item.name) === normalizeName(previousName) ? { ...item, name } : item,
      )
      const nextTotalAmount = nextItems.reduce((sum, item) => sum + item.price * item.qty, 0)
      const nextQty = nextItems.reduce((sum, item) => sum + item.qty, 0)
      return {
        ...order,
        items: nextItems,
        menu: buildMenuSummary(nextItems),
        qty: nextQty,
        totalAmount: nextTotalAmount,
      }
    }

    return order.menu === previousName ? { ...order, menu: name } : order
  })

  menuEditIndex.value = null
  menuEditDraft.name = ''
  menuEditDraft.type = productTypes[0]
  menuEditDraft.price = 0
  menuEditDraft.image = ''
  menuEditError.value = ''
  editImageInputKey.value += 1
}

const removeMenuOption = (index) => {
  if (!isAdmin.value) {
    return
  }

  if (menuOptions.value.length === 1) {
    return
  }

  const removed = menuOptions.value[index]
  menuOptions.value = menuOptions.value.filter((_, itemIndex) => itemIndex !== index)

  selectedMenus.value = selectedMenus.value.filter((name) => normalizeName(name) !== normalizeName(removed.name))
  delete menuQtyDraft[removed.name]
  syncFormSelectionByMenuOptions()

  if (menuEditIndex.value === index) {
    cancelEditMenuOption()
  }
}

const saveOrder = async () => {
  const customer = form.customer.trim()
  const orderItems = selectedMenuItems.value.map((item) => ({ ...item }))
  formError.value = ''

  if (!customer || !orderItems.length) {
    formError.value = 'Isi customer dan pilih minimal 1 menu.'
    return
  }

  const totalAmount = estimatedTotal.value
  const totalQty = estimatedTotalQty.value
  const menuSummary = buildMenuSummary(orderItems)
  const actorLabel = isAdmin.value ? 'admin' : 'pelanggan'

  const payload = {
    nama_pelanggan: customer,
    total_harga: totalAmount,
    items: orderItems.map(item => ({
      produk_id: item.name,
      jumlah: item.qty
    }))
  }

  let apiOrderId = null

  try {
    const res = await fetch('http://localhost:3000/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(payload)
    })

    const resData = await res.json()

    if (!res.ok) {
      formError.value = resData.message || 'Gagal menyimpan order.'
      return
    }

    apiOrderId = resData.data?.id
  } catch {
    formError.value = 'Gagal terhubung ke server.'
    return
  }

  if (formMode.value === 'create') {
    const newOrder = {
      id: apiOrderId || `#ORD-${nextOrderNumber.value}`,
      customer,
      menu: menuSummary,
      qty: totalQty,
      items: orderItems,
      totalAmount,
      status: 'Diproses',
      time: getCurrentTimeLabel(),
      date: today,
      timeline: [{ id: 1, text: `Order dibuat ${actorLabel}`, meta: getCurrentTimeLabel() }],
    }

    nextOrderNumber.value += 1
    orders.value = [newOrder, ...orders.value]

    if (isCustomer.value) {
      customerOrderNumber.value = newOrder.id
      resetForm()
      return
    }

    selectedOrderId.value = newOrder.id
    openCreateForm()
    return
  }

  if (!isAdmin.value) {
    formError.value = 'Mode pelanggan hanya bisa membuat order baru.'
    formMode.value = 'create'
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
      menu: menuSummary,
      qty: totalQty,
      items: orderItems,
      totalAmount,
      timeline: [...order.timeline, { id: nextTimelineId, text: 'Order diperbarui admin', meta: getCurrentTimeLabel() }],
    }
  })

  selectedOrderId.value = editingOrderId.value
  openCreateForm()
}

const cancelOrder = (orderId) => {
  if (!isAdmin.value) {
    return
  }

  orders.value = orders.value.map((order) => {
    if (order.id !== orderId || order.status === 'Dibatalkan' || order.status === 'Selesai') {
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

const advanceOrderStatus = (orderId) => {
  if (!isAdmin.value) {
    return
  }

  const statusFlow = {
    Diproses: { next: 'Dikirim', text: 'Order masuk pengiriman' },
    Dikirim: { next: 'Selesai', text: 'Order selesai' },
  }

  orders.value = orders.value.map((order) => {
    if (order.id !== orderId || !statusFlow[order.status]) {
      return order
    }

    const nextTimelineId = (order.timeline.at(-1)?.id ?? 0) + 1
    const { next, text } = statusFlow[order.status]
    return {
      ...order,
      status: next,
      timeline: [...order.timeline, { id: nextTimelineId, text, meta: getCurrentTimeLabel() }],
    }
  })
}

const deleteOrder = (orderId) => {
  if (!isAdmin.value) {
    return
  }

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

const switchToAdmin = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('userRole')
  router.push('/login')
}

resetForm()
</script>

<template>
  <section class="order-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">{{ isAdmin ? 'Order Management' : 'Customer Order' }}</p>
        <h1>{{ isAdmin ? 'Order' : 'Buat Pesanan' }}</h1>
        <p class="subtitle">
          {{ isAdmin ? 'Kelola order ubah status, edit, dan monitor timeline.' : 'Pilih menu, isi qty, lalu buat pesanan.' }}
        </p>
      </div>
      <div class="header-actions">
        <button v-if="isAdmin" type="button" class="btn btn-primary" @click="openProductForm">
          Tambah Produk
        </button>
        <button v-if="isCustomer" type="button" class="btn btn-soft" @click="switchToAdmin">
          Masuk sebagai admin
        </button>
      </div>
    </header>

    <div class="customer-content">
      <section class="customer-card">
        <div class="customer-card-header">
          <div>
            <h2>Menu Hari Ini</h2>
            <p class="customer-note">Pilih menu favorit kamu, lalu isi form pesanan di bawah.</p>
          </div>
          <div class="product-type-tabs">
            <button
              v-for="type in ['Semua', ...productTypes]"
              :key="type"
              class="btn btn-soft xsmall"
              :class="{ active: activeProductType === type }"
              @click="activeProductType = type"
            >{{ type }}</button>
          </div>
        </div>
        <div class="menu-gallery">
          <article v-for="menu in filteredMenuOptions" :key="menu.name" class="menu-card">
            <img
              :src="menu.image || 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=900&q=80'"
              :alt="menu.name"
            />
            <div class="menu-card-body">
              <div>
                <p class="menu-name">{{ menu.name }}</p>
                <p class="menu-type">{{ menu.type || 'Lainnya' }}</p>
              </div>
              <p class="menu-price">{{ formatRupiah(menu.price) }}</p>
            </div>
          </article>
        </div>
      </section>

      <section class="customer-card">
        <h2>Form Pesanan</h2>
        <form class="order-form" @submit.prevent="saveOrder">
          <label>
            Nama
            <input v-model="form.customer" type="text" placeholder="Nama kamu" />
          </label>

          <div class="multi-menu-panel">
            <div class="multi-menu-header">
              <p class="multi-menu-title">Menu (bisa pilih lebih dari 1)</p>
              <div class="product-type-tabs">
                <button
                  v-for="type in ['Semua', ...productTypes]"
                  :key="type"
                  class="btn btn-soft xsmall"
                  :class="{ active: activeProductType === type }"
                  @click="activeProductType = type"
                >{{ type }}</button>
              </div>
            </div>
            <div class="multi-menu-grid">
              <div
                v-for="option in filteredMenuOptions"
                :key="option.name"
                class="menu-option-card"
                :class="{ selected: selectedMenus.includes(option.name) }"
              >
                <div class="menu-option-img-wrap" @click="toggleMenuSelection(option.name, !selectedMenus.includes(option.name))">
                  <img
                    v-if="option.image"
                    class="menu-option-img"
                    :src="option.image"
                    :alt="option.name"
                  />
                  <div v-else class="menu-option-img-placeholder">
                    <span>{{ option.name.charAt(0) }}</span>
                  </div>
                  <div v-if="selectedMenus.includes(option.name)" class="menu-option-check-badge">
                    <span class="check-icon">✓</span>
                  </div>
                </div>
                <div class="menu-option-body" @click="toggleMenuSelection(option.name, !selectedMenus.includes(option.name))">
                  <p class="menu-option-name">{{ option.name }}</p>
                  <p class="menu-option-type">{{ option.type || 'Lainnya' }}</p>
                  <p class="menu-option-price">{{ formatRupiah(option.price) }}</p>
                </div>
                <div v-if="selectedMenus.includes(option.name)" class="menu-option-qty">
                  <button class="qty-btn qty-minus" @click.stop="decrementQty(option.name)">−</button>
                  <input
                    class="qty-input"
                    type="number"
                    min="1"
                    :value="menuQtyDraft[option.name] ?? 1"
                    @click.stop
                    @input.stop="setMenuQuantity(option.name, $event.target.value)"
                  />
                  <button class="qty-btn qty-plus" @click.stop="incrementQty(option.name)">+</button>
                </div>
              </div>
            </div>

            <div v-if="selectedMenuItems.length" class="selected-items-summary">
              <p class="selected-items-title">Pesanan Dipilih</p>
              <div class="selected-items-list">
                <div v-for="item in selectedMenuItems" :key="item.name" class="selected-item-row">
                  <div class="selected-item-info">
                    <span class="selected-item-name">{{ item.name }}</span>
                    <span class="selected-item-subtotal">{{ formatRupiah(item.subtotal) }}</span>
                  </div>
                  <div class="selected-item-qty">
                    <button class="qty-btn qty-minus xs" @click="decrementQty(item.name)">−</button>
                    <span class="selected-item-qty-val">{{ item.qty }}</span>
                    <button class="qty-btn qty-plus xs" @click="incrementQty(item.name)">+</button>
                    <button class="selected-item-remove" @click="removeSelectedMenu(item.name)">✕</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="auto-summary">
            <p>
              Total:
              <strong>{{ formatRupiah(estimatedTotal) }}</strong>
            </p>
            <p>
              Total item:
              <strong>{{ estimatedTotalQty }}</strong>
            </p>
          </div>

          <p v-if="formError" class="form-error">{{ formError }}</p>

          <p v-if="customerOrderNumber" class="order-number-info">
            Nomor order kamu: <strong>{{ customerOrderNumber }}</strong>
          </p>

          <div class="form-actions">
            <button type="submit" class="btn btn-primary">Buat Pesanan</button>
          </div>
        </form>
      </section>
    </div>

  </section>
</template>

<style scoped>
.order-page {
  display: grid;
  gap: 20px;
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

.btn-soft.active {
  background: #dcfce7;
  color: #166534;
  border-color: #bbf7d0;
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
  color: #ffffff;
}

.btn-success {
  background: #22c55e;
  color: #ffffff;
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

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.stat-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

.stat-label {
  margin: 0;
  color: #64748b;
  font-size: 12px;
}

.stat-value {
  margin: 6px 0 4px;
  font-size: 26px;
  font-weight: 700;
  color: #0f172a;
}

.stat-meta {
  margin: 0;
  font-size: 12px;
  color: #22c55e;
}

.content-grid {
  display: grid;
  grid-template-columns: 1.45fr 0.95fr;
  gap: 16px;
}

.customer-content {
  display: grid;
  gap: 16px;
}

.customer-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

.customer-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 4px;
}

.customer-note {
  margin: -4px 0 14px;
  color: #64748b;
  font-size: 13px;
}

.menu-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 14px;
}

.menu-card {
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.menu-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0,0,0,0.08);
}

.menu-card img {
  width: 100%;
  height: 180px;
  object-fit: cover;
  display: block;
}

.menu-card-body {
  padding: 12px;
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: flex-start;
}

.menu-name {
  margin: 0;
  color: #1e293b;
  font-weight: 600;
}

.menu-type {
  margin: 2px 0 0;
  color: #94a3b8;
  font-size: 12px;
}

.menu-price {
  margin: 0;
  color: #22c55e;
  font-size: 13px;
  font-weight: 600;
}

.table-card,
.side-card {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
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
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #f8fafc;
  color: #1e293b;
  padding: 10px 12px;
}

.search::placeholder {
  color: #94a3b8;
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

.row-click {
  cursor: pointer;
}

.row-click.selected {
  background: #f8fafc;
}

.order-id {
  color: #3b82f6;
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
  color: #94a3b8;
}

.badge {
  display: inline-block;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
}

.badge.processing {
  background: #dbeafe;
  color: #1d4ed8;
}

.badge.shipped {
  background: #fef3c7;
  color: #b45309;
}

.badge.completed {
  background: #dcfce7;
  color: #15803d;
}

.badge.cancelled {
  background: #fee2e2;
  color: #dc2626;
}

.side-panel {
  display: grid;
  gap: 12px;
}

.side-card {
  padding: 16px;
}

.side-card.highlight {
  background: linear-gradient(145deg, #f0f9ff, #e0f2fe);
  border-color: #bae6fd;
}

.side-label {
  margin: 0;
  color: #64748b;
  font-size: 12px;
}

.side-big {
  margin: 8px 0 4px;
  font-size: 26px;
  font-weight: 700;
  color: #0f172a;
}

.side-sub {
  margin: 0 0 14px;
  color: #475569;
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
  color: #0f172a;
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
  background: #f8fafc;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
}

.timeline p {
  margin: 0;
  font-size: 13px;
  color: #1e293b;
}

.timeline span {
  display: inline-block;
  margin-top: 5px;
  font-size: 12px;
  color: #64748b;
}

.order-form {
  display: grid;
  gap: 10px;
}

.order-form label {
  display: grid;
  gap: 6px;
  font-size: 12px;
  color: #475569;
}

.order-form input,
.order-form select {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #f8fafc;
  color: #1e293b;
  padding: 10px 12px;
}

.multi-menu-panel {
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #f8fafc;
  padding: 14px;
  display: grid;
  gap: 12px;
}

.multi-menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.product-type-tabs {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.multi-menu-title {
  margin: 0;
  font-size: 13px;
  color: #22c55e;
  font-weight: 700;
}

.multi-menu-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}

.menu-option-card {
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #ffffff;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease;
  display: grid;
  grid-template-rows: 120px auto;
}

.menu-option-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 14px rgba(0,0,0,0.08);
  border-color: #cbd5e1;
}

.menu-option-card.selected {
  border-color: #22c55e;
  box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.15), 0 4px 14px rgba(0,0,0,0.06);
}

.menu-option-img-wrap {
  position: relative;
  width: 100%;
  height: 120px;
  overflow: hidden;
  background: #f1f5f9;
}

.menu-option-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.3s ease;
}

.menu-option-card:hover .menu-option-img {
  transform: scale(1.05);
}

.menu-option-img-placeholder {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #e0e7ff, #dbeafe);
  color: #6366f1;
  font-size: 32px;
  font-weight: 700;
}

.menu-option-check-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  background: #22c55e;
  color: #fff;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  box-shadow: 0 2px 6px rgba(34, 197, 94, 0.3);
}

.check-icon {
  line-height: 1;
}

.menu-option-body {
  padding: 10px 10px 0;
  display: grid;
  gap: 2px;
  cursor: pointer;
}

.menu-option-name {
  margin: 0;
  color: #1e293b;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.menu-option-price {
  margin: 0;
  color: #22c55e;
  font-size: 13px;
  font-weight: 700;
}

.menu-option-type {
  margin: 0;
  color: #94a3b8;
  font-size: 11px;
}

.menu-option-qty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 10px 10px;
}

.qty-btn {
  width: 28px;
  height: 28px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  color: #475569;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: all 0.15s ease;
  line-height: 1;
  padding: 0;
}

.qty-btn:hover {
  background: #e2e8f0;
}

.qty-btn.qty-minus:hover {
  background: #fee2e2;
  border-color: #fca5a5;
  color: #dc2626;
}

.qty-btn.qty-plus:hover {
  background: #dcfce7;
  border-color: #86efac;
  color: #16a34a;
}

.qty-btn.xs {
  width: 24px;
  height: 24px;
  font-size: 14px;
  border-radius: 6px;
}

.qty-input {
  width: 44px;
  text-align: center;
  padding: 4px !important;
  border: 1px solid #e2e8f0 !important;
  border-radius: 8px !important;
  background: #ffffff !important;
  color: #1e293b !important;
  font-size: 13px !important;
  font-weight: 700 !important;
  -moz-appearance: textfield;
}

.qty-input::-webkit-outer-spin-button,
.qty-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

/* Selected items summary */
.selected-items-summary {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
  overflow: hidden;
}

.selected-items-title {
  margin: 0;
  padding: 10px 12px 8px;
  font-size: 12px;
  font-weight: 700;
  color: #22c55e;
  border-bottom: 1px solid #f1f5f9;
}

.selected-items-list {
  display: grid;
  gap: 0;
}

.selected-item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid #f8fafc;
}

.selected-item-row:last-child {
  border-bottom: none;
}

.selected-item-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.selected-item-name {
  font-size: 12px;
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.selected-item-subtotal {
  font-size: 11px;
  color: #22c55e;
  font-weight: 600;
}

.selected-item-qty {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.selected-item-qty-val {
  width: 20px;
  text-align: center;
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
}

.selected-item-remove {
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 6px;
  background: #fee2e2;
  color: #dc2626;
  font-size: 10px;
  cursor: pointer;
  display: grid;
  place-items: center;
  margin-left: 4px;
  transition: background 0.15s ease;
  padding: 0;
  line-height: 1;
}

.selected-item-remove:hover {
  background: #fca5a5;
}

.qty-inline {
  width: 88px;
  padding: 8px 10px !important;
}

.auto-summary {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #f8fafc;
  padding: 10px;
}

.auto-summary p {
  margin: 0;
  font-size: 12px;
  color: #475569;
}

.auto-summary p + p {
  margin-top: 6px;
}

.menu-option-panel {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #f8fafc;
  padding: 10px;
  display: grid;
  gap: 8px;
}

.menu-option-title {
  margin: 0;
  color: #64748b;
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
  color: #1e293b;
}

.menu-option-actions {
  display: flex;
  gap: 6px;
}

.product-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(4px);
  display: grid;
  place-items: center;
  padding: 16px;
  z-index: 100;
}

.product-modal {
  width: min(760px, 100%);
  max-height: 90vh;
  overflow: auto;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 16px;
  display: grid;
  gap: 12px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.1);
}

.product-modal-header {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
}

.product-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
}

.product-list li {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 10px;
  background: #f8fafc;
}

.product-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}

.product-edit-grid {
  display: grid;
  grid-template-columns: 1fr 140px 120px auto;
  gap: 8px;
  align-items: center;
}

.product-image-input {
  grid-column: 1 / span 3;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #f8fafc;
  color: #1e293b;
  padding: 6px;
  font-size: 12px;
}

.product-image-input::file-selector-button {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #f1f5f9;
  color: #475569;
  padding: 7px 10px;
  margin-right: 10px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
}

.product-image-input::-webkit-file-upload-button {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #f1f5f9;
  color: #475569;
  padding: 7px 10px;
  margin-right: 10px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
}

.product-image-preview {
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 8px;
  background: #f8fafc;
  width: fit-content;
}

.product-image-preview img {
  width: 92px;
  height: 92px;
  object-fit: cover;
  border-radius: 8px;
  display: block;
}

.product-image-preview-small {
  grid-column: 1 / span 3;
}

.product-edit-error {
  grid-column: 1 / span 3;
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

.order-number-info {
  margin: 0;
  border: 1px solid #bbf7d0;
  background: #f0fdf4;
  border-radius: 10px;
  padding: 10px;
  color: #15803d;
  font-size: 13px;
}

@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .content-grid {
    grid-template-columns: 1fr;
  }

  .menu-gallery {
    grid-template-columns: repeat(2, minmax(0, 1fr));
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

  .menu-option-main {
    align-items: flex-start;
  }

  .menu-option-controls {
    flex-wrap: wrap;
  }

  .qty-inline {
    width: 100%;
  }

  .product-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .product-edit-grid {
    grid-template-columns: 1fr;
  }

  .form-actions {
    justify-content: flex-start;
  }
}
</style>

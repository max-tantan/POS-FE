<script setup>
import { onMounted, ref, computed } from 'vue'

const productTypes = ['Semua', 'Makanan', 'Minuman', 'Snack', 'Lainnya']
const activeType = ref('Semua')
const products = ref([])
const searchQuery = ref('')

const fetchProduk = async () => {
  try {
    const res = await fetch('/produk')
    const resData = await res.json()
    if (resData.status === 'success' && Array.isArray(resData.data)) {
      products.value = resData.data.map(p => ({
        id: p.id,
        name: p.nama_produk,
        type: p.jenis_produk,
        price: Number(p.harga_produk),
        stok: Number(p.stok) || 0,
      }))
    }
  } catch {
    // fallback
  }
}

const filteredProducts = computed(() => {
  let result = products.value
  if (activeType.value !== 'Semua') {
    result = result.filter(p => p.type === activeType.value)
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(p => p.name.toLowerCase().includes(q))
  }
  return result
})

onMounted(fetchProduk)
</script>

<template>
  <section class="produk-page">
    <header class="page-header">
      <h1>Daftar Produk</h1>
    </header>

    <div class="filter-bar">
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Cari produk..."
        class="search-input"
      />
      <div class="type-tabs">
        <button
          v-for="t in productTypes"
          :key="t"
          :class="['type-tab', { active: activeType === t }]"
          @click="activeType = t"
        >
          {{ t }}
        </button>
      </div>
    </div>

    <div v-if="filteredProducts.length === 0" class="empty-state">
      Tidak ada produk ditemukan.
    </div>

    <div v-else class="product-grid">
      <article v-for="item in filteredProducts" :key="item.id" class="product-card" :class="{ 'stok-habis': item.stok === 0 }">
        <div class="card-body">
          <span class="product-type">{{ item.type }}</span>
          <h3 class="product-name">{{ item.name }}</h3>
          <p class="product-price">Rp {{ item.price.toLocaleString('id-ID') }}</p>
          <p class="product-stok" :class="{ 'stok-menipis': item.stok > 0 && item.stok <= 5, 'stok-kosong': item.stok === 0 }">
            Stok: {{ item.stok }}
          </p>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.produk-page {
  padding: 32px;
  max-width: 1000px;
  margin: 0 auto;
}

.page-header h1 {
  margin: 0 0 24px;
  font-size: 26px;
  color: #0f172a;
}

.filter-bar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
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

.type-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.type-tab {
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

.type-tab:hover {
  background: #f1f5f9;
}

.type-tab.active {
  background: #22c55e;
  color: #ffffff;
  border-color: #22c55e;
}

.empty-state {
  text-align: center;
  color: #94a3b8;
  padding: 60px 0;
  font-size: 15px;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.product-card {
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.product-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.06);
  transform: translateY(-2px);
}

.product-card.stok-habis {
  opacity: 0.6;
}

.product-stok {
  margin: 6px 0 0;
  font-size: 13px;
  font-weight: 600;
  color: #64748b;
}

.product-stok.stok-menipis {
  color: #f59e0b;
}

.product-stok.stok-kosong {
  color: #ef4444;
}

.card-body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.product-type {
  font-size: 11px;
  font-weight: 700;
  color: #22c55e;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.product-name {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}

.product-price {
  margin: 4px 0 0;
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
}
</style>

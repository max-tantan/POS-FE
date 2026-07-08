<script setup>
import { onMounted, ref, computed } from 'vue'
import { PlusIcon, PencilSquareIcon, TrashIcon } from '@heroicons/vue/24/outline'

const productTypes = ['Makanan', 'Minuman', 'Snack', 'Lainnya']
const products = ref([])
const loading = ref(false)
const showModal = ref(false)
const editingId = ref(null)
const formError = ref('')

const form = ref({
  nama_produk: '',
  jenis_produk: 'Makanan',
  harga_produk: 10000,
  stok: 0,
})

const fetchProduk = async () => {
  loading.value = true
  try {
    const res = await fetch('/produk')
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
    // fallback
  } finally {
    loading.value = false
  }
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

  const body = {
    nama_produk: nama_produk.trim(),
    jenis_produk,
    harga_produk: Number(harga_produk),
    stok: Number(stok) || 0,
  }

  try {
    const url = editingId.value
      ? `http://localhost:3000/produk/${editingId.value}`
      : 'http://localhost:3000/produk'
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
      return
    }

    await fetchProduk()
    closeModal()
  } catch {
    formError.value = 'Gagal terhubung ke server.'
  }
}

const deleteProduk = async (id, nama) => {
  if (!confirm(`Hapus produk "${nama}"?`)) return

  try {
    const res = await fetch(`http://localhost:3000/produk/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    })
    if (res.ok) {
      await fetchProduk()
    }
  } catch {
    // fallback
  }
}

onMounted(fetchProduk)
</script>

<template>
  <section class="admin-produk-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">Manajemen</p>
        <h1>Kelola Produk</h1>
        <p class="subtitle">Tambah, edit, atau hapus menu makanan & minuman.</p>
      </div>
      <button class="btn btn-primary" @click="openCreate">
        <PlusIcon class="icon" />
        Tambah Produk Baru
      </button>
    </header>

    <div class="panel">
      <div v-if="loading" class="empty">Memuat data...</div>
      <div v-else-if="!products.length" class="empty">Belum ada produk. Klik "Tambah Produk Baru" untuk memulai.</div>
      <div v-else class="table-wrap">
        <table class="produk-table">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Tipe</th>
              <th>Harga</th>
              <th>Stok</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in products" :key="item.id">
              <td class="cell-name">{{ item.nama_produk }}</td>
              <td><span class="type-badge">{{ item.jenis_produk }}</span></td>
              <td class="cell-price">Rp {{ item.harga_produk.toLocaleString('id-ID') }}</td>
              <td>
                <span :class="['stok-badge', { 'stok-habis': item.stok === 0, 'stok-menipis': item.stok > 0 && item.stok <= 5 }]">
                  {{ item.stok }}
                </span>
              </td>
              <td class="cell-actions">
                <button class="btn btn-soft xsmall" @click="openEdit(item)">
                  <PencilSquareIcon class="icon-sm" /> Edit
                </button>
                <button class="btn btn-danger xsmall" @click="deleteProduk(item.id, item.nama_produk)">
                  <TrashIcon class="icon-sm" /> Hapus
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="showModal" class="modal-backdrop" @click.self="closeModal">
      <section class="modal">
        <div class="modal-header">
          <h2>{{ editingId ? 'Edit Produk' : 'Tambah Produk Baru' }}</h2>
          <button class="btn btn-danger xsmall" @click="closeModal">X</button>
        </div>
        <form class="modal-form" @submit.prevent="saveProduk">
          <label>
            Nama Produk
            <input v-model="form.nama_produk" type="text" placeholder="Nama produk" />
          </label>
          <label>
            Jenis Produk
            <select v-model="form.jenis_produk">
              <option v-for="t in productTypes" :key="t" :value="t">{{ t }}</option>
            </select>
          </label>
          <label>
            Harga Produk
            <input v-model.number="form.harga_produk" type="number" min="1000" />
          </label>
          <label>
            Stok
            <input v-model.number="form.stok" type="number" min="0" />
          </label>
          <p v-if="formError" class="form-error">{{ formError }}</p>
          <div class="form-actions">
            <button type="button" class="btn btn-soft" @click="closeModal">Batal</button>
            <button type="submit" class="btn btn-primary">{{ editingId ? 'Simpan Perubahan' : 'Simpan Produk' }}</button>
          </div>
        </form>
      </section>
    </div>
  </section>
</template>

<style scoped>
.admin-produk-page {
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
}

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

.btn-primary {
  background: #22c55e;
  color: #ffffff;
}

.btn-primary:hover {
  background: #16a34a;
}

.btn-soft {
  background: #f1f5f9;
  color: #475569;
}

.btn-soft:hover {
  background: #e2e8f0;
}

.btn-danger {
  background: #fef2f2;
  color: #dc2626;
}

.btn-danger:hover {
  background: #fee2e2;
}

.xsmall {
  padding: 6px 10px;
  font-size: 12px;
}

.icon {
  width: 18px;
  height: 18px;
}

.icon-sm {
  width: 14px;
  height: 14px;
}

.panel {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

.empty {
  padding: 40px 0;
  text-align: center;
  color: #94a3b8;
  font-size: 14px;
}

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
}

.produk-table td {
  color: #1e293b;
}

.cell-name {
  font-weight: 600;
}

.cell-price {
  font-weight: 600;
  color: #0f172a;
}

.type-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  background: #f0fdf4;
  color: #15803d;
  font-size: 12px;
  font-weight: 600;
}

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

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  display: grid;
  place-items: center;
  z-index: 100;
}

.modal {
  background: #ffffff;
  border-radius: 20px;
  padding: 28px;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
  color: #0f172a;
}

.modal-form {
  display: grid;
  gap: 16px;
}

.modal-form label {
  display: grid;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
}

.modal-form input,
.modal-form select {
  width: 100%;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
  background: #f8fafc;
  outline: none;
  transition: border-color 0.2s;
}

.modal-form input:focus,
.modal-form select:focus {
  border-color: #22c55e;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.15);
}

.form-error {
  margin: 0;
  color: #dc2626;
  font-size: 13px;
  font-weight: 600;
}

.form-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 8px;
}
</style>

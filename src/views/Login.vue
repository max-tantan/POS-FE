<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const form = reactive({
  username: '',
  password: '',
})
const error = ref('')
const loading = ref(false)

const decodeToken = (token) => {
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch {
    return null
  }
}

const submitLogin = async () => {
  const username = form.username.trim()
  const password = form.password.trim()

  error.value = ''

  if (!username || !password) {
    error.value = 'Username dan password wajib diisi.'
    return
  }

  loading.value = true

  try {
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })

    if (!res.ok) {
      const err = await res.json()
      if (res.status === 401) {
        error.value = 'Username atau password salah.'
      } else {
        error.value = err.message || 'Terjadi kesalahan.'
      }
      return
    }

    const data = await res.json()
    const decoded = decodeToken(data.token)

    if (!decoded || !decoded.role) {
      error.value = 'Token tidak valid.'
      return
    }

    localStorage.setItem('token', data.token)
    localStorage.setItem('userRole', decoded.role)

    router.push('/dashboard')
  } catch {
    error.value = 'Gagal terhubung ke server. Pastikan backend sedang berjalan.'
  } finally {
    loading.value = false
  }
}

const continueAsCustomer = () => {
  localStorage.removeItem('token')
  localStorage.setItem('userRole', 'customer')
  error.value = ''
  router.push('/order')
}
</script>

<template>
  <section class="login-page">
  <div class="login-wrapper">
    <form class="login-card" @submit.prevent="submitLogin">
      <h1>Welcome Back Cashier!</h1>
      <p class="subtitle">Selamat datang kembali ingat SOP selama melakukan shift, Semangat !!</p>

      <label for="username">Username</label>
      <input id="username" v-model="form.username" type="username" placeholder="username" />

      <label for="password">Password</label>
      <input id="password" v-model="form.password" type="password" placeholder="Masukkan password" />

      <p v-if="error" class="error-text">{{ error }}</p>

      <button type="submit" :disabled="loading">Masuk sebagai Admin</button>
      <button type="button" class="btn-skip" @click="continueAsCustomer">
        Lewati, lanjut sebagai pelanggan
      </button>
    </form>
  </div>
  </section>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  place-items: start;
  background-color: #f1f5f9;
}

.login-wrapper {
  width: 100%;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
}

.login-card {
  width: 100%;
  max-width: 440px;
  min-height: auto;
  padding: 40px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 10px 30px rgba(0,0,0,0.04);
  border-radius: 24px;
  gap: 10px;
}

.login-card h1 {
  margin: 0;
  font-size: 28px;
  color: #0f172a;
  text-align: left;
}

.login-card .subtitle {
  margin: 0 0 18px;
  color: #64748b;
  text-align: left;
}

.login-card label {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
}

.login-card input {
  width: 100%;
  border: 1px solid #e2e8f0;
  border-radius: 50px;
  padding: 11px 12px;
  font-size: 14px;
  color: #1e293b;
  background-color: #f8fafc;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
}

.login-card input:focus {
  background-color: #ffffff;
  outline: none;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.15);
  border-color: #22c55e;
  color: #1e293b;
}

.login-card input::placeholder {
  color: #94a3b8;
}

.login-card input:-webkit-autofill,
.login-card input:-webkit-autofill:hover,
.login-card input:-webkit-autofill:focus,
.login-card input:-webkit-autofill:active {
  -webkit-text-fill-color: #1e293b;
  -webkit-box-shadow: 0 0 0 1000px #f8fafc inset;
  box-shadow: 0 0 0 1000px #f8fafc inset;
  caret-color: #1e293b;
  transition: background-color 5000s ease-in-out 0s;
}

.error-text {
  margin: 4px 0;
  color: #dc2626;
  font-size: 13px;
}

.login-card button {
  margin-top: 8px;
  border: 0;
  border-radius: 50px;
  padding: 12px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  background: #22c55e;
  color: #ffffff;
  margin: 28px 0 0;
  transition: background 0.2s ease;
}

.login-card button:hover {
  background: #16a34a;
}

.login-card .btn-skip {
  margin-top: 8px;
  background: #f1f5f9;
  color: #475569;
  transition: background 0.2s ease;
}

.login-card .btn-skip:hover {
  background: #e2e8f0;
}
</style>

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
    </form>
  </div>
  </section>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  place-items: start;
  background-color: var(--clr-surface);
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
  background: var(--clr-card);
  box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 10px 30px rgba(0,0,0,0.04);
  border-radius: 24px;
  gap: 10px;
}

.login-card h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 28px;
  font-weight: 800;
  color: var(--clr-heading);
  text-align: left;
}

.login-card .subtitle {
  margin: 0 0 18px;
  color: var(--clr-muted);
  text-align: left;
}

.login-card label {
  font-size: 13px;
  font-weight: 600;
  color: var(--clr-muted);
}

.login-card input {
  width: 100%;
  border: 1px solid var(--clr-border);
  border-radius: 50px;
  padding: 11px 12px;
  font-size: 14px;
  color: var(--clr-ink);
  background-color: var(--clr-surface);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
}

.login-card input:focus {
  background-color: var(--clr-card);
  outline: none;
  box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.15);
  border-color: var(--clr-green);
  color: var(--clr-ink);
}

.login-card input::placeholder {
  color: var(--clr-subtle);
}

.login-card input:-webkit-autofill,
.login-card input:-webkit-autofill:hover,
.login-card input:-webkit-autofill:focus,
.login-card input:-webkit-autofill:active {
  -webkit-text-fill-color: var(--clr-ink);
  -webkit-box-shadow: 0 0 0 1000px var(--clr-surface) inset;
  box-shadow: 0 0 0 1000px var(--clr-surface) inset;
  caret-color: var(--clr-ink);
  transition: background-color 5000s ease-in-out 0s;
}

.error-text {
  margin: 4px 0;
  color: var(--clr-danger);
  font-size: 13px;
}

.login-card button {
  margin-top: 8px;
  border: 0;
  border-radius: 50px;
  padding: 12px;
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  background: var(--clr-green);
  color: var(--clr-card);
  margin: 28px 0 0;
  transition: background 0.2s ease;
}

.login-card button:hover {
  background: var(--clr-green-hover);
}
</style>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const form = reactive({
  username: '',
  password: '',
})

const error = ref('')

const submitLogin = () => {
  const username = form.username.trim()
  const password = form.password.trim()

  if (!username || !password) {
    error.value = 'Username dan password wajib diisi.'
    return
  }

  localStorage.setItem('userRole', 'admin')
  localStorage.setItem('isLoggedIn', 'true')

  error.value = ''
  router.push('/dashboard')
}

const continueAsCustomer = () => {
  localStorage.setItem('userRole', 'customer')
  localStorage.removeItem('isLoggedIn')

  error.value = ''
  router.push('/order')
}
</script>

<template>
  <section class="login-page">
    
    <!-- LEFT -->
    <div class="left-panel">

      <!-- BRAND -->
      <div class="brand">
        <div class="logo-icon">
          🍳
        </div>

        <div>
          <p class="brand-name">Sarapan Telur</p>
          <p class="brand-sub">Admin Dashboard</p>
        </div>
      </div>

      <!-- FORM -->
      <form class="login-form" @submit.prevent="submitLogin">

        <div class="form-heading">
          <h1>Selamat Datang 👋</h1>
          <p>
            Masuk untuk mengelola menu, pesanan,
            dan pengalaman pelanggan.
          </p>
        </div>

        <div class="field">
          <label>Username</label>

          <input
            v-model="form.username"
            type="text"
            placeholder="Masukkan username"
          />
        </div>

        <div class="field">
          <label>Password</label>

          <input
            v-model="form.password"
            type="password"
            placeholder="Masukkan password"
          />
        </div>

        <p v-if="error" class="error-text">
          {{ error }}
        </p>

        <button type="submit" class="btn-primary">
          Masuk sebagai Admin
        </button>

        <button
          type="button"
          class="btn-skip"
          @click="continueAsCustomer"
        >
          Lanjut sebagai Pelanggan
        </button>

      </form>

      <p class="footer-note">
        © 2025 Sarapan Telur — Fresh Morning Everyday
      </p>

    </div>

    <!-- RIGHT -->
    <div class="right-panel">

      <img
        src="../assets/coffeshop.jpg"
        alt="Coffee Shop"
        class="right-img"
      />

      <div class="right-overlay">

        <div class="right-content">

          <p class="right-tag">
            MENU FAVORIT
          </p>

          <h2>
            Sarapan Hangat <br>
            Untuk Memulai Hari
          </h2>

          <p class="right-desc">
            Nikmati berbagai menu sarapan lezat,
            cepat saji, dan dibuat dengan bahan
            terbaik setiap harinya.
          </p>

          <div class="badges">
            <span class="badge">🍳 Sarapan</span>
            <span class="badge">☕ Coffee</span>
            <span class="badge">⚡ Fast Service</span>
          </div>

        </div>

      </div>

    </div>
  </section>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: 'Poppins', sans-serif;
}

.login-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 460px 1fr;
  background: #07111f;
}

/* ================= LEFT PANEL ================= */

.left-panel {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 50px;
  background: rgba(7, 17, 31, 0.92);
  backdrop-filter: blur(16px);
  border-right: 1px solid rgba(255,255,255,0.06);
}

.brand {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 50px;
}

.logo-icon {
  width: 58px;
  height: 58px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  font-size: 26px;
  background: linear-gradient(
    135deg,
    rgba(239,159,39,0.25),
    rgba(250,199,117,0.08)
  );
  border: 1px solid rgba(239,159,39,0.2);
}

.brand-name {
  color: white;
  font-size: 20px;
  font-weight: 700;
}

.brand-sub {
  color: #94a3b8;
  font-size: 13px;
  margin-top: 2px;
}

/* ================= FORM ================= */

.login-form {
  width: 100%;
}

.form-heading {
  margin-bottom: 32px;
}

.form-heading h1 {
  color: white;
  font-size: 34px;
  line-height: 1.2;
  margin-bottom: 10px;
  font-weight: 700;
}

.form-heading p {
  color: #94a3b8;
  font-size: 15px;
  line-height: 1.7;
}

.field {
  margin-bottom: 20px;
}

.field label {
  display: block;
  margin-bottom: 8px;
  color: #cbd5e1;
  font-size: 14px;
  font-weight: 500;
}

.field input {
  width: 100%;
  padding: 15px 18px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.04);
  color: white;
  font-size: 14px;
  outline: none;
  transition: 0.3s ease;
}

.field input::placeholder {
  color: #64748b;
}

.field input:focus {
  border-color: #EF9F27;
  background: rgba(255,255,255,0.06);
  box-shadow: 0 0 0 4px rgba(239,159,39,0.15);
}

.error-text {
  color: #f87171;
  margin-bottom: 12px;
  font-size: 13px;
}

/* ================= BUTTON ================= */

.btn-primary {
  width: 100%;
  border: none;
  padding: 15px;
  border-radius: 14px;
  background: linear-gradient(
    135deg,
    #EF9F27,
    #f7b64d
  );
  color: #111827;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: 0.3s ease;
  margin-top: 6px;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(239,159,39,0.25);
}

.btn-skip {
  width: 100%;
  margin-top: 14px;
  padding: 14px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.03);
  color: #cbd5e1;
  cursor: pointer;
  font-weight: 600;
  transition: 0.3s ease;
}

.btn-skip:hover {
  background: rgba(255,255,255,0.08);
}

/* ================= FOOTER ================= */

.footer-note {
  margin-top: 50px;
  color: #64748b;
  font-size: 12px;
  text-align: center;
}

/* ================= RIGHT PANEL ================= */

.right-panel {
  position: relative;
  overflow: hidden;
}

.right-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: brightness(0.35);
  transform: scale(1.03);
}

.right-overlay {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(
      to top,
      rgba(7,17,31,0.9),
      rgba(7,17,31,0.25)
    );
  display: flex;
  align-items: flex-end;
  padding: 60px;
}

.right-content {
  max-width: 520px;
}

.right-tag {
  color: #f7b64d;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 3px;
  text-transform: uppercase;
  margin-bottom: 14px;
}

.right-content h2 {
  color: white;
  font-size: 52px;
  line-height: 1.1;
  margin-bottom: 18px;
  font-weight: 800;
}

.right-desc {
  color: #cbd5e1;
  line-height: 1.8;
  font-size: 16px;
  margin-bottom: 28px;
}

.badges {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.badge {
  padding: 10px 16px;
  border-radius: 999px;
  background: rgba(255,255,255,0.08);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.08);
  color: white;
  font-size: 13px;
  font-weight: 600;
}

/* ================= MOBILE ================= */

@media (max-width: 900px) {
  .login-page {
    grid-template-columns: 1fr;
  }

  .right-panel {
    display: none;
  }

  .left-panel {
    padding: 32px 24px;
  }

  .form-heading h1 {
    font-size: 28px;
  }
}
</style>
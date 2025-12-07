<template>
  <div class="page">
    <header class="header">
      <h1>Main Page</h1>
    </header>

    <main class="content">
      <h2>Main Page</h2>
      <p>Select a flow to start navigation.</p>
    </main>

    <footer class="footer">
      <button class="primary-btn" @click="goPaymentFlow">Go to Payment Flow →</button>

      <button class="primary-btn" @click="goKycFlow">Go to KYC Flow →</button>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { navigationEngine } from "webview-navigation-engine";

function goPaymentFlow() {
  navigationEngine.navigateTo("PaymentInput");
}

function goKycFlow() {
  navigationEngine.navigateTo("KycInput");
}
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  font-family: sans-serif;
}

.header {
  padding: 16px;
  border-bottom: 1px solid #ddd;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.footer {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.primary-btn {
  padding: 14px;
  border-radius: 10px;
  border: none;
  background: #007aff;
  color: white;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
}
</style>

<template>
  <div class="page">
    <header class="header">
      <button class="back" @click="onBack">← Back</button>
      <h1>KycDone</h1>
    </header>
    <main class="content">
      <p>This is the KycDone page.</p>
    </main>
    <footer class="footer">
      <button class="next" @click="goNext">Next Step →</button>
      <button class="popup" @click="openPopup">Open Popup</button>
      <button class="fullscreen" @click="openFullscreen">Open Fullscreen</button>
    </footer>

    <div v-if="popupVisible" class="overlay popup">
      <div class="popup-content">
        <p>Popup Opened!</p>
        <button class="close-btn" @click="closePopup">Close</button>
      </div>
    </div>

    <div v-if="fullscreenVisible" class="overlay fullscreen">
      <button class="close-fullscreen" @click="closeFullscreen">✕</button>
      <h3>Fullscreen Overlay</h3>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { navigationEngine } from "webview-navigation-engine";

function onBack() {
  navigationEngine.handleBack();
}

function goNext() {
  navigationEngine.navigateTo("MainPage");
}

const popupVisible = ref(false);
function openPopup() {
  popupVisible.value = true;
  navigationEngine.openOverlay({ id: "popup", onBack: () => (popupVisible.value = false) });
}
function closePopup() {
  popupVisible.value = false;
  navigationEngine.closeOverlay("popup");
}

const fullscreenVisible = ref(false);
function openFullscreen() {
  fullscreenVisible.value = true;
  navigationEngine.openOverlay({
    id: "fullscreen",
    onBack: () => (fullscreenVisible.value = false),
  });
}
function closeFullscreen() {
  fullscreenVisible.value = false;
  navigationEngine.closeOverlay("fullscreen");
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
  display: flex;
  gap: 12px;
  align-items: center;
}
.back {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
}
.content {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}
.footer {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.next {
  padding: 12px;
  border-radius: 8px;
  border: none;
  background: #007aff;
  color: white;
  cursor: pointer;
}
.popup,
.fullscreen {
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #007aff;
  background: white;
  color: #007aff;
  cursor: pointer;
}

.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}
.popup {
  background: rgba(0, 0, 0, 0.4);
}
.popup-content {
  background: white;
  padding: 20px;
  border-radius: 12px;
}
.fullscreen {
  background: white;
  flex-direction: column;
}
.close-fullscreen {
  position: absolute;
  top: 16px;
  right: 16px;
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
}
</style>

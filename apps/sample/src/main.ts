
import { createApp } from 'vue';
import App from './App.vue';
import { router } from './router';
import { setupNavigationWithVue } from 'webview-navigation-engine';

setupNavigationWithVue(router, {
  mainPage: 'MainPage',
  flows: [
    { name: 'paymentFlow', steps: ['PaymentInput','PaymentDetail','PaymentConfirm'] },
    { name: 'kycFlow', steps: ['KycInput','KycConfirm','KycDone'] }
  ]
});

createApp(App).use(router).mount('#app');

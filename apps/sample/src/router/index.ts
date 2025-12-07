import { createRouter, createWebHistory } from "vue-router";

export const routes = [
  { path: "/", redirect: "/main" },

  { path: "/main", name: "MainPage", component: () => import("../pages/MainPage.vue") },

  // Payment Flow
  {
    path: "/payment/input",
    name: "PaymentInput",
    component: () => import("../pages/PaymentInput.vue"),
  },
  {
    path: "/payment/detail",
    name: "PaymentDetail",
    component: () => import("../pages/PaymentDetail.vue"),
  },
  {
    path: "/payment/confirm",
    name: "PaymentConfirm",
    component: () => import("../pages/PaymentConfirm.vue"),
  },

  // KYC Flow
  { path: "/kyc/input", name: "KycInput", component: () => import("../pages/KycInput.vue") },
  { path: "/kyc/confirm", name: "KycConfirm", component: () => import("../pages/KycConfirm.vue") },
  { path: "/kyc/done", name: "KycDone", component: () => import("../pages/KycDone.vue") },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

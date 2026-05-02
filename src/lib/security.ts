export const initSecurity = () => {
  if (import.meta.env.DEV || typeof document === "undefined") return;

  document.documentElement.dataset.securityInitialized = "true";
};

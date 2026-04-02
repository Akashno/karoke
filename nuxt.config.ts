// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },
  runtimeConfig: {
    mvsepApiToken: process.env.NUXT_MVSEP_API_TOKEN || '',
    public: {
      replicateApiKey: process.env.NUXT_REPLICATE_API_KEY || '',
    }
  }
})
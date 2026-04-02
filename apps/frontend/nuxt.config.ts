export default defineNuxtConfig({
  compatibilityDate: '2026-04-02',
  ssr: false,
  nitro: {
    preset: 'cloudflare-pages-static',
  },
  modules: ['@nuxtjs/tailwindcss'],
  runtimeConfig: {
    public: {
      workerUrl: process.env.NUXT_PUBLIC_WORKER_URL || 'http://localhost:8101',
    },
  },
  app: {
    head: {
      title: 'Scrum Poker',
      meta: [
        { name: 'description', content: 'Real-time scrum poker for agile teams' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      ],
    },
  },
})

export default defineNuxtConfig({
  ssr: false,
  modules: ['@nuxtjs/tailwindcss'],
  runtimeConfig: {
    public: {
      workerUrl: process.env.NUXT_PUBLIC_WORKER_URL || 'http://localhost:8787',
    },
  },
  app: {
    head: {
      title: 'Scrum Poker',
      meta: [
        { name: 'description', content: 'Real-time scrum poker for agile teams' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
    },
  },
})

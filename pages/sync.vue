<script setup lang="ts">
const { song } = useSong();
const router = useRouter();

onMounted(() => {
  if (!song.value.audioUrl) {
    router.replace('/');
  }
});

const goBack = () => {
  router.push('/')
}

const goExport = () => {
  router.push('/export')
}
</script>

<template>
  <main class="h-screen bg-[#0e0e11] relative overflow-hidden flex flex-col font-sans">
    <!-- Background patterns -->
    <div
      class="absolute inset-0 pointer-events-none z-0"
      style="background-image: linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px); background-size: 40px 40px;"
    />
    <div
      class="absolute top-[-160px] left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full pointer-events-none z-0"
      style="background: radial-gradient(circle, rgba(99,60,180,0.12) 0%, transparent 70%);"
    />

    <!-- Header Section -->
    <header class="flex-none px-8 py-6 relative z-10 flex items-center justify-between border-b border-[#1e1e2e]/50 bg-[#0e0e11]/80 backdrop-blur-sm">
      <div class="flex items-center gap-6">
        <button
          type="button"
          @click="goBack"
          class="px-4 py-2 rounded-xl text-[12px] font-semibold transition-all duration-200 border hover:bg-[rgba(139,92,246,0.1)]"
          style="font-family: 'Syne', sans-serif; background: rgba(255,255,255,0.04); border-color: rgba(139,92,246,0.25); color: #d9d6ff;"
        >
          Back
        </button>
        <div>
          <div class="flex items-center gap-3 mb-1">
            <div
              class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] tracking-widest text-violet-400"
              style="background: rgba(139,92,246,0.15); border: 0.5px solid rgba(139,92,246,0.35); font-family: 'DM Mono', monospace;"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              SYNC MODE
            </div>
            <h1 class="text-xl font-bold tracking-tight text-[#f0eeff]" style="font-family: 'Syne', sans-serif;">
              Sync Timeline
            </h1>
          </div>
          <p class="text-[10px] tracking-widest text-[#555566]" style="font-family: 'DM Mono', monospace;">
            TAP LINES TO SYNC WITH AUDIO
          </p>
        </div>
      </div>
      
      <button
        type="button"
        @click="goExport"
        class="px-5 py-2 rounded-xl text-[13px] font-semibold transition-all duration-200 border border-[#2e2e42] hover:bg-[#1a1a2e]"
        style="font-family: 'Syne', sans-serif; background: rgba(255,255,255,0.04); color: #d9d6ff;"
      >
        Export
      </button>
    </header>

    <!-- Main Layout: Lyrics + Preview -->
    <div v-if="song.audioUrl" class="flex-1 flex overflow-hidden relative z-10 p-6 gap-6 max-w-[1600px] mx-auto w-full">
      <!-- Left: Lyrics (Priority) -->
      <div class="w-full lg:w-2/3 h-full flex flex-col">
        <LyricsSyncList class="flex-1 h-full shadow-lg" />
      </div>
      
      <!-- Right: Preview -->
      <div class="hidden lg:flex w-1/3 h-full flex-col">
        <KaraokePreview class="h-full shadow-lg" />
      </div>
    </div>

    <!-- Bottom Player -->
    <div class="flex-none relative z-20 w-full border-t border-[#1e1e2e] bg-[#0b0b0e]/95 backdrop-blur-md">
      <AudioPlayer />
    </div>
  </main>
</template>
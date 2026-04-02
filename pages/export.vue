<script setup lang="ts">
const { song } = useSong();
const router = useRouter();

onMounted(() => {
  if (!song.value.audioUrl) {
    router.replace('/');
  }
});

const goBack = () => {
  router.push('/sync')
}

const formatTime = (time: number) => {
  const m = Math.floor(time / 60);
  const s = Math.floor(time % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};
</script>

<template>
  <main class="min-h-screen bg-[#0e0e11] p-4 relative overflow-hidden font-sans">
    <div
      class="absolute inset-0 pointer-events-none"
      style="background-image: linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px); background-size: 40px 40px;"
    />
    <div
      class="absolute top-[-160px] left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full pointer-events-none"
      style="background: radial-gradient(circle, rgba(99,60,180,0.12) 0%, transparent 70%);"
    />

    <div v-if="song.audioUrl" class="relative z-10 max-w-4xl mx-auto h-full flex flex-col pt-12">
      <div class="flex items-start justify-between gap-4 mb-8">
        <div>
          <div
            class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-3 text-[11px] font-bold tracking-widest text-violet-400"
            style="background: rgba(139,92,246,0.15); border: 0.5px solid rgba(139,92,246,0.35); font-family: 'DM Mono', monospace;"
          >
            <span class="w-1.5 h-1.5 rounded-full bg-violet-400" />
            EXPORT MODE
          </div>
          <h1 class="text-[28px] font-bold tracking-tight text-[#f0eeff] mb-2" style="font-family: 'Syne', sans-serif;">
            Export Project
          </h1>
          <p class="text-[12px] font-bold tracking-widest text-[#555566]" style="font-family: 'DM Mono', monospace;">
            DOWNLOAD LRC · RENDER VIDEO
          </p>
        </div>

        <button
          type="button"
          @click="goBack"
          class="px-5 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-200 border hover:bg-[rgba(139,92,246,0.1)] flex items-center gap-2"
          style="font-family: 'DM Mono', monospace; background: rgba(255,255,255,0.02); border-color: rgba(255,255,255,0.1); color: #f0eeff;"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          Back to Sync
        </button>
      </div>

      <!-- Stats Row -->
      <div class="flex items-center gap-4 mb-8">
        <div class="px-4 py-2 rounded-xl text-[13px] flex items-center gap-2" style="background: rgba(19,19,24,0.92); border: 1px solid rgba(30,30,46,1); font-family: 'DM Mono', monospace; color: #555566;">
          <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
          Lines synced <span class="text-[#a78bfa] ml-1">{{ song.lines.filter(l => l.time != null).length }} / {{ song.lines.length }}</span>
        </div>
        <div class="px-4 py-2 rounded-xl text-[13px] flex items-center gap-2" style="background: rgba(19,19,24,0.92); border: 1px solid rgba(30,30,46,1); font-family: 'DM Mono', monospace; color: #555566;">
          Song <span class="text-[#a78bfa] ml-1">{{ song.audioFileName || 'Audio Track' }}</span>
        </div>
        <div class="px-4 py-2 rounded-xl text-[13px] flex items-center gap-2" style="background: rgba(19,19,24,0.92); border: 1px solid rgba(30,30,46,1); font-family: 'DM Mono', monospace; color: #555566;">
          Duration <span class="text-[#a78bfa] ml-1">{{ formatTime(song.duration) }}</span>
        </div>
      </div>

      <!-- Cards Row -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 items-stretch">
        <LrcExport />
        <VideoExport />
      </div>

      <!-- Footer Info -->
      <div class="p-5 rounded-2xl flex items-start gap-4" style="background: rgba(19,19,24,0.92); border: 1px solid rgba(30,30,46,1); color: #555566; font-family: 'DM Mono', monospace;">
        <svg class="w-5 h-5 mt-0.5 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        <p class="text-[13px] leading-relaxed">
          LRC works with VLC, Poweramp, foobar2000, and most karaoke apps. Video is best for sharing or streaming.
        </p>
      </div>

    </div>
  </main>
</template>
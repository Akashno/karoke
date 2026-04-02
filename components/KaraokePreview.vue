<script setup lang="ts"> 
const { song } = useSong(); 

const timeline = computed(() =>
  song.value.lines
    .filter((l) => l.time != null)
    .slice()
    .sort((a, b) => a.time! - b.time!)
)

const currentIndex = computed(() => {
  const t = song.value.currentTime
  const timed = timeline.value
  if (!timed.length) return -1
  let idx = 0
  for (let i = 0; i < timed.length; i++) {
    const item = timed[i]
    if (!item) break
    if (item.time! <= t) idx = i
    else break
  }
  return idx
})

const currentLine = computed(() => {
  const timed = timeline.value
  const idx = currentIndex.value
  if (idx < 0 || !timed[idx]) return null
  return timed[idx]
})

const nextLine = computed(() => {
  const timed = timeline.value
  const idx = currentIndex.value
  if (idx < 0) return timed[0] ?? null
  return timed[idx + 1] ?? null
})
</script> 

<template> 
  <div
    class="rounded-2xl p-6 flex flex-col justify-start relative overflow-hidden"
    style="background: radial-gradient(circle at 50% 0%, rgba(124,58,237,0.12) 0%, rgba(19,19,24,0.92) 55%), rgba(19,19,24,0.92); border: 1px solid rgba(91,33,182,0.35); min-height: 480px;"
  >
    <!-- Header -->
    <div class="flex items-start justify-between relative z-10 w-full">
      <div>
        <p class="text-[11px] font-bold tracking-widest text-[#555566] mb-1" style="font-family: 'DM Mono', monospace;">
          PREVIEW
        </p>
        <p class="text-[16px] font-bold text-[#f0eeff]" style="font-family: 'Syne', sans-serif;">
          Karaoke screen
        </p>
      </div>
      <div
        class="px-3 py-1.5 rounded-xl text-[12px] font-bold tracking-wider text-violet-300 shadow-[0_0_15px_rgba(124,58,237,0.15)]"
        style="background: rgba(124,58,237,0.12); border: 1px solid rgba(124,58,237,0.25); font-family: 'DM Mono', monospace;"
      >
        {{ song.currentTime.toFixed(2) }}s
      </div>
    </div>

    <!-- Lyrics Container -->
    <div class="flex-1 flex flex-col items-center justify-center text-center relative z-10 w-full mt-4 gap-6">
      
      <!-- Current Line -->
      <div class="w-full flex items-center justify-center px-4">
        <Transition name="fade-slide" mode="out-in">
          <p
            :key="currentLine?.id ?? 'ready'"
            class="text-[42px] font-extrabold leading-[1.2] text-[#f0eeff] drop-shadow-lg max-w-[800px]"
            style="font-family: 'Syne', sans-serif; letter-spacing: -0.02em;"
          >
            {{ currentLine?.text ?? 'Ready…' }}
          </p>
        </Transition>
      </div>

      <!-- Next Line -->
      <div class="w-full flex items-center justify-center px-4">
        <Transition name="fade" mode="out-in">
          <p
            :key="nextLine?.id ?? 'hint'"
            class="text-[16px] text-[#6f6f86] max-w-[600px] leading-relaxed"
            style="font-family: 'DM Mono', monospace;"
          >
            {{ nextLine?.text ?? 'Tap the first line when vocals start.' }}
          </p>
        </Transition>
      </div>

    </div>
  </div> 
</template>

<style scoped>
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.4s ease;
}
.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(15px) scale(0.98);
}
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-15px) scale(0.98);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
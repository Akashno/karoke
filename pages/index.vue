<script setup lang="ts">
const { song, setAudio, setLyricsFromText } = useSong();
const lyricsText = ref('');
const fileName = ref(song.value.audioFileName || '');
const router = useRouter();

const onFileChange = (e: Event) => {
  const files = (e.target as HTMLInputElement).files;
  if (!files?.length) return;
  const file = files[0];
  if (!file) return;
  fileName.value = file.name;
  const url = URL.createObjectURL(file);
  setAudio(url, file.name);
};

const lineCount = computed(() =>
  lyricsText.value.trim().split('\n').filter(l => l.trim()).length
);

const canContinue = computed(
  () => !!song.value.audioUrl && lineCount.value > 0
);

const startSync = () => {
  if (!canContinue.value) return;
  setLyricsFromText(lyricsText.value);
  router.push('/sync');
};

// Global Drag & Drop State
const isDraggingGlobal = ref(false);
let dragCounter = 0; // To prevent flicker on child elements

const onGlobalDragEnter = (e: DragEvent) => {
  dragCounter++;
  if (e.dataTransfer?.types.includes('Files')) {
    isDraggingGlobal.value = true;
  }
};

const onGlobalDragLeave = (e: DragEvent) => {
  dragCounter--;
  if (dragCounter === 0) {
    isDraggingGlobal.value = false;
  }
};

const onGlobalDragOver = (e: DragEvent) => {
  e.preventDefault();
  e.dataTransfer!.dropEffect = 'copy';
};

const onGlobalDrop = (e: DragEvent) => {
  dragCounter = 0;
  isDraggingGlobal.value = false;
  
  const files = e.dataTransfer?.files;
  if (!files?.length) return;
  
  const file = files[0];
  if (!file || !file.type.startsWith('audio/')) {
    alert('Please drop a valid audio file.');
    return;
  }
  
  fileName.value = file.name;
  const url = URL.createObjectURL(file);
  setAudio(url, file.name);
};
</script>

<template>
  <main 
    class="min-h-screen bg-[#0e0e11] flex items-center justify-center p-4 relative overflow-hidden transition-colors"
    :class="isDraggingGlobal ? 'bg-[#131318]' : ''"
    @dragover.prevent="onGlobalDragOver"
    @dragenter.prevent="onGlobalDragEnter"
    @dragleave.prevent="onGlobalDragLeave"
    @drop.prevent="onGlobalDrop"
  >
    <!-- Global Drag Overlay -->
    <div 
      v-if="isDraggingGlobal" 
      class="absolute inset-0 z-50 flex items-center justify-center bg-[#0e0e11]/80 backdrop-blur-sm border-2 border-violet-600 border-dashed m-4 rounded-3xl"
    >
      <div class="text-center pointer-events-none">
        <div class="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-violet-600/20 text-violet-400">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
        </div>
        <h2 class="text-2xl font-bold text-white mb-2" style="font-family: 'Syne', sans-serif;">Drop audio file anywhere</h2>
        <p class="text-violet-300 font-mono text-sm">mp3 · wav · flac · m4a</p>
      </div>
    </div>

    <!-- Grid bg -->
    <div class="absolute inset-0 pointer-events-none"
      style="background-image: linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px); background-size: 40px 40px;" />

    <!-- Purple glow -->
    <div class="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full pointer-events-none"
      style="background: radial-gradient(circle, rgba(99,60,180,0.12) 0%, transparent 70%);" />

    <div class="w-full max-w-[480px] relative z-10" style="font-family: 'DM Mono', monospace;">

      <!-- Header -->
      <div class="mb-8">
        <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-3 text-[11px] tracking-widest text-violet-400"
          style="background: rgba(139,92,246,0.15); border: 0.5px solid rgba(139,92,246,0.35);">
          <span class="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          STUDIO MODE
        </div>
        <h1 class="text-[26px] font-bold tracking-tight text-[#f0eeff] mb-1" style="font-family: 'Syne', sans-serif;">
          Karaoke Lyrics Sync
        </h1>
        <p class="text-[11px] tracking-widest text-[#555566]">IMPORT AUDIO · PASTE LYRICS · SYNC</p>
      </div>

      <!-- Audio Upload -->
      <div class="mb-5">
        <label class="flex items-center gap-2 text-[11px] uppercase tracking-widest text-[#666677] mb-2">
          <svg class="w-3.5 h-3.5 opacity-60" viewBox="0 0 16 16" fill="none">
            <path d="M2 11V13H14V11" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
            <path d="M8 3V10M8 3L5 6M8 3L11 6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Audio File
        </label>

        <label class="relative block rounded-xl cursor-pointer transition-all duration-200 text-center p-6"
          :class="song.audioUrl
            ? 'bg-[#130f1e] border border-[#5b21b6]'
            : 'bg-[#131318] border border-dashed border-[#2a2a3a] hover:border-violet-700 hover:bg-[#16131f]'">
          <input type="file" accept="audio/*" class="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            @change="onFileChange" />

          <template v-if="!song.audioUrl">
            <div class="w-9 h-9 mx-auto mb-2.5 rounded-[10px] flex items-center justify-center"
              style="background: rgba(124,58,237,0.15);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M9 18V5l12-2v13" stroke="#8b5cf6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="6" cy="18" r="3" stroke="#8b5cf6" stroke-width="1.5"/>
                <circle cx="18" cy="16" r="3" stroke="#8b5cf6" stroke-width="1.5"/>
              </svg>
            </div>
            <p class="text-[13px] text-violet-300 font-medium mb-1">Drop audio file here</p>
            <p class="text-[11px] text-[#3d3d55]">mp3 · wav · flac · m4a</p>
          </template>

          <template v-else>
            <div class="flex items-center justify-center gap-0.5 h-6 mb-1.5">
              <div v-for="i in 7" :key="i"
                class="w-[3px] rounded-sm bg-violet-600 animate-[wave_1.2s_ease-in-out_infinite]"
                :style="`height: ${[8,16,22,14,20,10,18][i-1]}px; animation-delay: ${[0,0.1,0.2,0.3,0.15,0.25,0.05][i-1]}s`" />
            </div>
            <p class="text-[12px] text-violet-400 font-medium flex items-center justify-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="5" fill="#7c3aed" opacity="0.3"/>
                <path d="M4 6l1.5 1.5L8 4" stroke="#a78bfa" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              {{ fileName }}
            </p>
          </template>
        </label>
      </div>

      <!-- Lyrics -->
      <div class="mb-5">
        <label class="flex items-center gap-2 text-[11px] uppercase tracking-widest text-[#666677] mb-2">
          <svg class="w-3.5 h-3.5 opacity-60" viewBox="0 0 16 16" fill="none">
            <path d="M2 4H14M2 8H10M2 12H12" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
          </svg>
          Lyrics
        </label>
        <textarea v-model="lyricsText" rows="7"
          class="w-full bg-[#131318] border border-[#1e1e2e] rounded-xl px-4 py-3.5 text-[12.5px] text-[#d4d0f0] leading-relaxed resize-y outline-none transition-colors duration-200 focus:border-[#5b21b6] focus:bg-[#131320] placeholder-[#2e2e44]"
          style="font-family: 'DM Mono', monospace;"
          placeholder="Paste lyrics here, one line per row..." />
        <p class="text-right text-[10px] mt-1 tracking-wider transition-colors"
          :class="lineCount > 0 ? 'text-[#5b4a8a]' : 'text-[#333348]'">
          {{ lineCount }} {{ lineCount === 1 ? 'line' : 'lines' }}
        </p>
      </div>

      <!-- Status chips -->
      <div class="flex gap-2.5 mb-5">
        <div class="flex-1 flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] border transition-all duration-300"
          :class="song.audioUrl
            ? 'bg-[#130f1e] border-[rgba(91,33,182,0.4)] text-[#7c5cbf]'
            : 'bg-[#131318] border-[#1a1a28] text-[#2e2e42]'">
          <span class="w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all"
            :class="song.audioUrl ? 'bg-violet-500 shadow-[0_0_8px_rgba(124,58,237,0.6)]' : 'bg-[#202030]'" />
          Audio loaded
        </div>
        <div class="flex-1 flex items-center gap-2 rounded-lg px-3 py-2 text-[11px] border transition-all duration-300"
          :class="lineCount > 0
            ? 'bg-[#130f1e] border-[rgba(91,33,182,0.4)] text-[#7c5cbf]'
            : 'bg-[#131318] border-[#1a1a28] text-[#2e2e42]'">
          <span class="w-1.5 h-1.5 rounded-full flex-shrink-0 transition-all"
            :class="lineCount > 0 ? 'bg-violet-500 shadow-[0_0_8px_rgba(124,58,237,0.6)]' : 'bg-[#202030]'" />
          Lyrics ready
        </div>
      </div>

      <!-- CTA Button -->
      <button @click="startSync" :disabled="!canContinue"
        class="w-full py-3.5 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-2.5 transition-all duration-200"
        :class="canContinue
          ? 'text-white hover:-translate-y-px active:translate-y-0'
          : 'bg-[#151520] text-[#2e2e42] border border-[#1c1c2e] cursor-not-allowed'"
        :style="canContinue ? 'background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); box-shadow: 0 0 32px rgba(124,58,237,0.3); font-family: Syne, sans-serif;' : 'font-family: Syne, sans-serif;'">
        <span>Start syncing</span>
        <svg :class="canContinue ? 'transition-transform group-hover:translate-x-1' : ''"
          width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>
  </main>
</template>

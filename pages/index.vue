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

const isLoadingDemo = ref(false);

const loadDemo = async () => {
  try {
    isLoadingDemo.value = true;
    
    // Load Lyrics
    const lyricsRes = await fetch('/demo.txt');
    if (!lyricsRes.ok) throw new Error('Failed to load demo lyrics');
    const lyricsData = await lyricsRes.text();
    lyricsText.value = lyricsData;
    
    // Load Audio
    const audioRes = await fetch('/demo.mp3');
    if (!audioRes.ok) throw new Error('Failed to load demo audio');
    const audioBlob = await audioRes.blob();
    
    fileName.value = 'demo.mp3';
    const url = URL.createObjectURL(audioBlob);
    setAudio(url, 'demo.mp3');
    
  } catch (error) {
    console.error('Error loading demo:', error);
    alert('Failed to load the demo files. Ensure demo.mp3 and demo.txt exist in the public folder.');
  } finally {
    isLoadingDemo.value = false;
  }
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
    <div class="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full pointer-events-none opacity-50"
      style="background: radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%);" />

    <div class="w-full max-w-[1100px] relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">

      <!-- Left Column: Copy & Value Prop -->
      <div class="text-left space-y-8">
        <div>
          <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-6 text-[11px] tracking-widest text-violet-400"
            style="background: rgba(139,92,246,0.15); border: 0.5px solid rgba(139,92,246,0.35); font-family: 'DM Mono', monospace;">
            <span class="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            PROFESSIONAL TOOLS
          </div>
          <h1 class="text-[42px] lg:text-[56px] leading-[1.1] font-bold tracking-tight text-[#f0eeff] mb-6" style="font-family: 'Syne', sans-serif;">
            Create flawless<br />
            <span class="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">Karaoke Videos</span>
            in seconds.
          </h1>
          <p class="text-[16px] leading-relaxed text-[#8f8fa3] max-w-[480px]" style="font-family: 'DM Mono', monospace;">
            The fastest way to synchronize lyrics to your music. Perfect for content creators, musicians, and karaoke enthusiasts who want professional-grade lyric videos without the complex video editing software.
          </p>
        </div>

        <div class="space-y-6">
          <div class="flex items-start gap-4">
            <div class="w-10 h-10 rounded-xl bg-[#131318] border border-[#2e2e42] flex items-center justify-center flex-shrink-0 text-violet-400">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <div>
              <h3 class="text-[#f0eeff] font-bold text-[15px] mb-1" style="font-family: 'Syne', sans-serif;">Real-time Synchronization</h3>
              <p class="text-[#666677] text-[13px] leading-relaxed" style="font-family: 'DM Mono', monospace;">Tap along to the beat using your keyboard. Our precision engine maps every syllable perfectly to the audio track.</p>
            </div>
          </div>
          
          <div class="flex items-start gap-4">
            <div class="w-10 h-10 rounded-xl bg-[#131318] border border-[#2e2e42] flex items-center justify-center flex-shrink-0 text-emerald-400">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </div>
            <div>
              <h3 class="text-[#f0eeff] font-bold text-[15px] mb-1" style="font-family: 'Syne', sans-serif;">High-Speed Export</h3>
              <p class="text-[#666677] text-[13px] leading-relaxed" style="font-family: 'DM Mono', monospace;">Render your final video entirely in your browser using hardware-accelerated WebCodecs. No server uploads required.</p>
            </div>
          </div>

          <div class="flex items-start gap-4">
            <div class="w-10 h-10 rounded-xl bg-[#131318] border border-[#2e2e42] flex items-center justify-center flex-shrink-0 text-amber-400">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            </div>
            <div>
              <h3 class="text-[#f0eeff] font-bold text-[15px] mb-1" style="font-family: 'Syne', sans-serif;">Studio-Grade Interface</h3>
              <p class="text-[#666677] text-[13px] leading-relaxed" style="font-family: 'DM Mono', monospace;">Built-in waveform visualizers, playback speed controls, and a gorgeous dark mode UI.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: The Form -->
      <div class="w-full max-w-[480px] mx-auto bg-[#0b0b0e]/80 backdrop-blur-md p-8 rounded-3xl border border-[#1e1e2e] shadow-2xl" style="font-family: 'DM Mono', monospace;">
        <!-- Audio Upload -->
        <div class="mb-6">
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
              <div class="w-10 h-10 mx-auto mb-3 rounded-xl flex items-center justify-center"
                style="background: rgba(124,58,237,0.15);">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M9 18V5l12-2v13" stroke="#8b5cf6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                  <circle cx="6" cy="18" r="3" stroke="#8b5cf6" stroke-width="1.5"/>
                  <circle cx="18" cy="16" r="3" stroke="#8b5cf6" stroke-width="1.5"/>
                </svg>
              </div>
              <p class="text-[14px] text-violet-300 font-medium mb-1 font-sans">Drop your track here</p>
              <p class="text-[11px] text-[#555566]">mp3 · wav · flac · m4a</p>
            </template>

            <template v-else>
              <div class="flex items-center justify-center gap-0.5 h-6 mb-2">
                <div v-for="i in 7" :key="i"
                  class="w-[3px] rounded-sm bg-violet-600 animate-[wave_1.2s_ease-in-out_infinite]"
                  :style="`height: ${[8,16,22,14,20,10,18][i-1]}px; animation-delay: ${[0,0.1,0.2,0.3,0.15,0.25,0.05][i-1]}s`" />
              </div>
              <p class="text-[13px] text-violet-400 font-medium flex items-center justify-center gap-2 font-sans">
                <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
                  <circle cx="6" cy="6" r="5" fill="#7c3aed" opacity="0.3"/>
                  <path d="M4 6l1.5 1.5L8 4" stroke="#a78bfa" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span class="truncate max-w-[200px]">{{ fileName }}</span>
              </p>
            </template>
          </label>
        </div>

        <!-- Lyrics -->
        <div class="mb-6">
          <label class="flex items-center gap-2 text-[11px] uppercase tracking-widest text-[#666677] mb-2">
            <svg class="w-3.5 h-3.5 opacity-60" viewBox="0 0 16 16" fill="none">
              <path d="M2 4H14M2 8H10M2 12H12" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
            </svg>
            Lyrics
          </label>
          <textarea v-model="lyricsText" rows="6"
            class="w-full bg-[#131318] border border-[#1e1e2e] rounded-xl px-4 py-3.5 text-[13px] text-[#d4d0f0] leading-relaxed resize-y outline-none transition-colors duration-200 focus:border-[#5b21b6] focus:bg-[#131320] placeholder-[#2e2e44]"
            placeholder="Paste your lyrics here...&#10;One line per row." />
          <p class="text-right text-[11px] mt-1.5 tracking-wider transition-colors"
            :class="lineCount > 0 ? 'text-[#5b4a8a]' : 'text-[#333348]'">
            {{ lineCount }} {{ lineCount === 1 ? 'line' : 'lines' }} detected
          </p>
        </div>

        <!-- Status chips -->
        <div class="flex gap-3 mb-6">
          <div class="flex-1 flex items-center gap-2 rounded-xl px-3 py-2.5 text-[11px] font-bold tracking-wide border transition-all duration-300 uppercase"
            :class="song.audioUrl
              ? 'bg-[#130f1e] border-[rgba(91,33,182,0.4)] text-violet-400'
              : 'bg-[#131318] border-[#1a1a28] text-[#3d3d55]'">
            <span class="w-2 h-2 rounded-full flex-shrink-0 transition-all"
              :class="song.audioUrl ? 'bg-violet-500 shadow-[0_0_8px_rgba(124,58,237,0.6)]' : 'bg-[#202030]'" />
            1. Audio
          </div>
          <div class="flex-1 flex items-center gap-2 rounded-xl px-3 py-2.5 text-[11px] font-bold tracking-wide border transition-all duration-300 uppercase"
            :class="lineCount > 0
              ? 'bg-[#130f1e] border-[rgba(91,33,182,0.4)] text-violet-400'
              : 'bg-[#131318] border-[#1a1a28] text-[#3d3d55]'">
            <span class="w-2 h-2 rounded-full flex-shrink-0 transition-all"
              :class="lineCount > 0 ? 'bg-violet-500 shadow-[0_0_8px_rgba(124,58,237,0.6)]' : 'bg-[#202030]'" />
            2. Lyrics
          </div>
        </div>

        <!-- CTA Button & Demo -->
        <div class="space-y-4">
          <button @click="startSync" :disabled="!canContinue"
            class="w-full py-4 rounded-xl text-[15px] font-bold tracking-wide flex items-center justify-center gap-3 transition-all duration-300"
            :class="canContinue
              ? 'text-white hover:-translate-y-1 active:translate-y-0'
              : 'bg-[#131318] text-[#3d3d55] border border-[#1c1c2e] cursor-not-allowed'"
            :style="canContinue ? 'background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); box-shadow: 0 8px 32px rgba(124,58,237,0.4); font-family: Syne, sans-serif;' : 'font-family: Syne, sans-serif;'">
            <span>Enter Studio</span>
            <svg :class="canContinue ? 'transition-transform duration-300 group-hover:translate-x-1' : ''"
              width="18" height="18" viewBox="0 0 16 16" fill="none">
              <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          
          <div class="flex items-center justify-center">
            <button @click="loadDemo" :disabled="isLoadingDemo"
              class="text-[13px] text-[#8f8fa3] hover:text-violet-300 bg-[#1a1a2e]/50 hover:bg-[#1a1a2e] border border-[#2e2e42]/50 hover:border-[#5b21b6]/50 px-4 py-2 rounded-full transition-all duration-200 flex items-center gap-2 group"
              style="font-family: 'Syne', sans-serif; font-weight: bold;">
              <span v-if="isLoadingDemo" class="w-3.5 h-3.5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin"></span>
              <svg v-else class="w-4 h-4 text-violet-400 transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              {{ isLoadingDemo ? 'Loading demo...' : 'Just looking around? Try the demo.' }}
            </button>
          </div>
        </div>
      </div>

    </div>
  </main>
</template>

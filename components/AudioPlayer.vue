<script setup lang="ts">
import WaveSurfer from 'wavesurfer.js';
import Hover from 'wavesurfer.js/dist/plugins/hover.js';

const { song, setDuration, setCurrentTime } = useSong(); 
const audioRef = ref<HTMLAudioElement | null>(null); 
const waveformRef = ref<HTMLElement | null>(null);
const isPlaying = ref(false);
let wavesurfer: WaveSurfer | null = null;

// --- Speed Control ---
const playbackSpeeds = [0.5, 0.75, 1, 1.25, 1.5];
const currentSpeedIndex = ref(2); // Default 1x
const currentSpeed = computed(() => playbackSpeeds[currentSpeedIndex.value]);

// --- Volume Control ---
const volume = ref(1);
const isMuted = ref(false);
const previousVolume = ref(1);

const initWaveSurfer = () => {
  if (!waveformRef.value || !song.value.audioUrl || !audioRef.value) return;

  if (wavesurfer) {
    wavesurfer.destroy();
  }

  wavesurfer = WaveSurfer.create({
    container: waveformRef.value,
    waveColor: 'rgba(124, 58, 237, 0.3)', // violet-600 with opacity
    progressColor: '#7c3aed', // violet-600
    cursorColor: '#ffffff',
    barWidth: 2,
    barGap: 2,
    barRadius: 2,
    height: 48,
    media: audioRef.value,
    plugins: [
      Hover.create({
        lineColor: 'rgba(255, 255, 255, 0.5)',
        lineWidth: 1,
        labelBackground: 'rgba(0, 0, 0, 0.75)',
        labelColor: '#fff',
        labelSize: '11px',
      }),
    ],
  });

  wavesurfer.on('ready', () => {
    const duration = wavesurfer?.getDuration();
    if (duration !== undefined) {
      setDuration(duration);
    }
    const currentSpd = currentSpeed.value;
    if (currentSpd !== undefined) {
      wavesurfer?.setPlaybackRate(currentSpd);
    }
    wavesurfer?.setVolume(isMuted.value ? 0 : volume.value);
  });

  wavesurfer.on('audioprocess', (time) => {
    setCurrentTime(time);
  });

  wavesurfer.on('seeking', (time) => {
    setCurrentTime(time);
  });

  wavesurfer.on('play', () => isPlaying.value = true);
  wavesurfer.on('pause', () => isPlaying.value = false);
  wavesurfer.on('finish', () => isPlaying.value = false);
};

watch(() => song.value.audioUrl, () => {
  nextTick(() => {
    initWaveSurfer();
  });
});

const togglePlay = async () => { 
  if (!wavesurfer) return;
  if (isPlaying.value) {
    wavesurfer.pause();
  } else {
    wavesurfer.play();
  }
}; 

const setSpeed = (index: number) => {
  currentSpeedIndex.value = index;
  if (wavesurfer) {
    wavesurfer.setPlaybackRate(playbackSpeeds[index] as number);
  }
};

const cycleSpeed = () => {
  setSpeed((currentSpeedIndex.value + 1) % playbackSpeeds.length);
};

const toggleMute = () => {
  isMuted.value = !isMuted.value;
  if (wavesurfer) {
    if (isMuted.value) {
      previousVolume.value = volume.value;
      wavesurfer.setVolume(0);
      volume.value = 0;
    } else {
      volume.value = previousVolume.value > 0 ? previousVolume.value : 1;
      wavesurfer.setVolume(volume.value);
    }
    localStorage.setItem('karaoke-volume', volume.value.toString());
  }
};

const handleVolumeChange = (e: Event) => {
  const val = parseFloat((e.target as HTMLInputElement).value);
  volume.value = val;
  if (val > 0) isMuted.value = false;
  if (wavesurfer) {
    wavesurfer.setVolume(val);
  }
  localStorage.setItem('karaoke-volume', val.toString());
};

const formatTime = (time: number) => {
  return time.toFixed(2);
};

const handleKeydown = (e: KeyboardEvent) => {
  // Prevent spacebar from scrolling page
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
    return;
  }
  if (e.code === 'Space') {
    e.preventDefault();
  }

  // Fine Seek Controls
  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    const t = song.value.currentTime;
    const seekTime = Math.max(0, t - 1);
    song.value.currentTime = seekTime;
    if (wavesurfer) wavesurfer.setTime(seekTime);
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    const t = song.value.currentTime;
    const seekTime = Math.min(song.value.duration, t + 1);
    song.value.currentTime = seekTime;
    if (wavesurfer) wavesurfer.setTime(seekTime);
  } else if (e.key === 'ArrowUp' && e.shiftKey) {
    e.preventDefault();
    const t = song.value.currentTime;
    const seekTime = Math.max(0, t - 10);
    song.value.currentTime = seekTime;
    if (wavesurfer) wavesurfer.setTime(seekTime);
  } else if (e.key === 'ArrowDown' && e.shiftKey) {
    e.preventDefault();
    const t = song.value.currentTime;
    const seekTime = Math.min(song.value.duration, t + 10);
    song.value.currentTime = seekTime;
    if (wavesurfer) wavesurfer.setTime(seekTime);
  }
};

const handleKeyup = (e: KeyboardEvent) => {
  // Only trigger if we aren't typing in an input
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
    return;
  }
  
  if (e.code === 'Space') {
    e.preventDefault();
    togglePlay();
  } else if (e.key.toLowerCase() === 's') {
    e.preventDefault();
    cycleSpeed();
  } else if (e.key.toLowerCase() === 'm') {
    e.preventDefault();
    toggleMute();
  }
};

const handleRequestSeek = (e: CustomEvent) => {
  if (!wavesurfer) return;
  wavesurfer.setTime(e.detail);
  setCurrentTime(e.detail);
};

const handleRequestPlay = () => {
  if (wavesurfer && !isPlaying.value) {
    wavesurfer.play();
  }
};

onMounted(() => {
  if (import.meta.client) {
    const savedVolume = localStorage.getItem('karaoke-volume');
    if (savedVolume !== null) {
      volume.value = parseFloat(savedVolume);
      previousVolume.value = volume.value;
      if (volume.value === 0) {
        isMuted.value = true;
      }
    }
  }

  window.addEventListener('keydown', handleKeydown);
  window.addEventListener('keyup', handleKeyup);
  window.addEventListener('request-seek', handleRequestSeek as EventListener);
  window.addEventListener('request-play', handleRequestPlay);

  // Initialize wavesurfer on mount in case audioUrl is already set
  nextTick(() => {
    initWaveSurfer();
  });
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('keyup', handleKeyup);
  window.removeEventListener('request-seek', handleRequestSeek as EventListener);
  window.removeEventListener('request-play', handleRequestPlay);
  if (audioRef.value) {
    audioRef.value.pause();
  }
});
</script> 

<template> 
  <div id="audio-player-container" v-if="song.audioUrl" class="px-4 lg:px-6 py-3 lg:py-4 flex flex-col lg:flex-row items-center gap-3 lg:gap-6 max-w-[1600px] mx-auto w-full">
    <audio 
      ref="audioRef" 
      :src="song.audioUrl" 
      class="hidden"
    /> 

    <!-- Play/Pause Button -->
    <div class="flex w-full lg:w-auto items-center gap-3 lg:gap-0">
      <button 
        @click="togglePlay" 
        class="flex-none w-10 h-10 lg:w-12 lg:h-12 flex items-center justify-center rounded-full transition-all duration-200 shadow-lg" 
        :class="isPlaying ? 'bg-[#1a1a2e] border border-[#2e2e42] text-violet-400 hover:bg-[#202038]' : 'bg-violet-600 hover:bg-violet-500 text-white'"
      > 
        <svg v-if="isPlaying" class="w-[14px] h-[14px] lg:w-[18px] lg:h-[18px]" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16" rx="1"/>
          <rect x="14" y="4" width="4" height="16" rx="1"/>
        </svg>
        <svg v-else class="w-[16px] h-[16px] lg:w-[20px] lg:h-[20px] ml-1" viewBox="0 0 24 24" fill="currentColor">
          <path d="M5 3l14 9-14 9V3z"/>
        </svg>
      </button> 
      
      <!-- Mobile Info (Speed, Time, Volume) next to play button -->
      <div class="flex-1 flex lg:hidden items-center justify-between text-[10px] sm:text-[11px] tracking-wider min-w-0" style="font-family: 'DM Mono', monospace;">
        <div class="flex items-center gap-1.5 sm:gap-3">
          <button @click="cycleSpeed" class="flex items-center gap-1 text-[#a78bfa] hover:text-white transition-colors whitespace-nowrap" title="Playback Speed (S)">
            <svg width="10" height="10" class="sm:w-[12px] sm:h-[12px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            {{ currentSpeed }}x
          </button>
        </div>
        <div class="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <button @click="toggleMute" class="text-[#666677] hover:text-[#d9d6ff] transition-colors shrink-0" title="Mute (M)">
            <svg v-if="isMuted || volume === 0" width="12" height="12" class="sm:w-[14px] sm:h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>
            <svg v-else width="12" height="12" class="sm:w-[14px] sm:h-[14px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>
          </button>
          <span class="text-[#666677] whitespace-nowrap truncate max-w-[80px] sm:max-w-none"> 
            <span class="text-[#d9d6ff]">{{ formatTime(song.currentTime) }}s</span> / <span class="hidden sm:inline">{{ formatTime(song.duration) }}s</span><span class="inline sm:hidden">{{ Math.round(song.duration) }}s</span>
          </span>
        </div>
      </div>
    </div>

    <!-- Info & Scrubber -->
    <div class="flex-1 flex flex-col gap-2 w-full lg:w-auto min-w-0">
      <div class="flex items-center justify-between text-[11px] tracking-wider" style="font-family: 'DM Mono', monospace;">
        <div class="hidden lg:flex items-center gap-4">
          <span class="text-violet-400 font-semibold uppercase">Audio Player</span>
          
          <!-- Speed Control -->
          <button @click="cycleSpeed" class="flex items-center gap-1 text-[#a78bfa] hover:text-white transition-colors" title="Playback Speed (S)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            {{ currentSpeed }}x
          </button>
        </div>

        <div class="hidden lg:flex items-center gap-4">
          <!-- Volume Control -->
          <div class="flex items-center gap-2 group relative">
            <button @click="toggleMute" class="text-[#666677] hover:text-[#d9d6ff] transition-colors" title="Mute (M)">
              <svg v-if="isMuted || volume === 0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>
            </button>
            <input type="range" min="0" max="1" step="0.05" :value="volume" @input="handleVolumeChange" class="w-16 h-1 bg-[#1a1a2e] rounded-lg appearance-none cursor-pointer accent-violet-500 opacity-0 group-hover:opacity-100 transition-opacity absolute right-6 top-1/2 -translate-y-1/2" style="-webkit-appearance: none;" />
          </div>

          <span class="text-[#666677]"> 
            <span class="text-[#d9d6ff]">{{ formatTime(song.currentTime) }}s</span> / {{ formatTime(song.duration) }}s
          </span>
        </div>
      </div>

      <!-- Waveform Container -->
      <div class="relative w-full h-10 lg:h-12 bg-[#1a1a2e]/50 rounded-lg overflow-hidden group">
        <!-- Lyric Stamps Overlay -->
        <div v-for="line in song.lines.filter(l => l.time != null)" :key="line.id"
             class="absolute top-0 bottom-0 w-[2px] bg-emerald-400/80 pointer-events-none z-10 hover:bg-emerald-300 transition-colors cursor-pointer shadow-[0_0_4px_rgba(52,211,153,0.5)]"
             :style="{ left: `${(line.time! / song.duration) * 100}%` }"
             :title="line.text"
        />

        <div ref="waveformRef" class="w-full h-full cursor-pointer z-0"></div>
      </div>

      <!-- Shortcuts Guide -->
      <div class="hidden lg:flex items-center justify-center gap-4 mt-3 text-[10px] text-[#666677] tracking-wider opacity-60 hover:opacity-100 transition-opacity" style="font-family: 'DM Mono', monospace;">
        <!-- Edit -->
        <div class="flex items-center gap-3">
          <span class="uppercase text-[9px] font-bold text-[#8f8fa3]">EDIT</span>
          <div class="flex items-center gap-1.5">
            <kbd class="px-1.5 py-0.5 rounded bg-[#1a1a2e] border border-[#2e2e42] text-[#d9d6ff] font-sans text-[10px]">ENTER</kbd>
            <span>sync</span>
          </div>
          <div class="flex items-center gap-1.5">
            <kbd class="px-1.5 py-0.5 rounded bg-[#1a1a2e] border border-[#2e2e42] text-[#d9d6ff] font-sans text-[10px]">Z</kbd>
            <span>undo</span>
          </div>
        </div>

        <div class="w-px h-3 bg-[#2e2e42]" />

        <!-- Playback -->
        <div class="flex items-center gap-3">
          <span class="uppercase text-[9px] font-bold text-[#8f8fa3]">PLAYBACK</span>
          <div class="flex items-center gap-1.5">
            <kbd class="px-1.5 py-0.5 rounded bg-[#1a1a2e] border border-[#2e2e42] text-[#d9d6ff] font-sans text-[10px]">SPACE</kbd>
            <span>play/pause</span>
          </div>
        </div>

        <div class="w-px h-3 bg-[#2e2e42]" />

        <!-- Navigation -->
        <div class="flex items-center gap-3 relative group cursor-pointer">
          <span class="uppercase text-[9px] font-bold text-[#8f8fa3]">NAV</span>
          <div class="flex items-center gap-1.5">
            <div class="flex gap-0.5">
              <kbd class="px-1.5 py-0.5 rounded bg-[#1a1a2e] border border-[#2e2e42] text-[#d9d6ff] font-sans text-[10px]">←</kbd>
              <kbd class="px-1.5 py-0.5 rounded bg-[#1a1a2e] border border-[#2e2e42] text-[#d9d6ff] font-sans text-[10px]">→</kbd>
            </div>
            <span>±1s</span>
          </div>
          <div class="flex items-center gap-1.5 ml-2">
             <span class="underline decoration-dashed opacity-50 group-hover:opacity-100 transition-opacity">More</span>
             <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-[#131318] border border-[#2e2e42] rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none flex flex-col gap-2 z-50">
                <div class="flex items-center gap-2 whitespace-nowrap">
                  <div class="flex gap-0.5">
                    <kbd class="px-1.5 py-0.5 rounded bg-[#1a1a2e] border border-[#2e2e42] text-[#d9d6ff] font-sans text-[10px]">↑</kbd>
                    <kbd class="px-1.5 py-0.5 rounded bg-[#1a1a2e] border border-[#2e2e42] text-[#d9d6ff] font-sans text-[10px]">↓</kbd>
                  </div>
                  <span>Jump 5s</span>
                </div>
                <div class="flex items-center gap-2 whitespace-nowrap">
                  <div class="flex gap-0.5">
                    <kbd class="px-1.5 py-0.5 rounded bg-[#1a1a2e] border border-[#2e2e42] text-[#d9d6ff] font-sans text-[10px]">S</kbd>
                  </div>
                  <span>Cycle Speed</span>
                </div>
             </div>
          </div>
        </div>
      </div>

    </div>
  </div> 
</template>
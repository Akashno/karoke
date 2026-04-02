<script setup lang="ts">
import { ref, computed } from 'vue';
import * as Mp4Muxer from 'mp4-muxer';
import * as WebMMuxer from 'webm-muxer';

const { song } = useSong();
const audioRef = ref<HTMLAudioElement | null>(null);
const isRendering = ref(false);
const progress = ref(0);
const videoUrl = ref<string | null>(null);

let mediaRecorder: MediaRecorder | null = null;
let isCancelled = false;

const canRender = computed(() => song.value.lines.some((l) => l.time != null) && !!song.value.audioUrl);

const supportsWebCodecs = typeof window !== 'undefined' && 'VideoEncoder' in window && 'AudioEncoder' in window;

const availableFormats = computed(() => {
  const formats = [];
  if (supportsWebCodecs) {
    formats.push({ value: 'mp4', label: '.mp4 (H.264 + AAC) - Fast Offline' });
    formats.push({ value: 'webm', label: '.webm (VP8 + Opus) - Fast Offline' });
  }
  formats.push({ value: 'webm-rt', label: '.webm (VP8) - Real-time Fallback' });
  return formats;
});

const selectedFormat = ref(supportsWebCodecs ? 'mp4' : 'webm-rt');

const startRender = async () => {
  if (!audioRef.value || !song.value.audioUrl) return;

  isRendering.value = true;
  isCancelled = false;
  videoUrl.value = null;
  progress.value = 0;

  if (selectedFormat.value === 'mp4' || selectedFormat.value === 'webm') {
    await renderWithWebCodecs(selectedFormat.value);
  } else {
    await renderWithMediaRecorder();
  }
};

const drawFrameAtTime = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, t: number) => {
  ctx.fillStyle = '#0e0e11';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const timed = song.value.lines
    .filter((l) => l.time != null)
    .sort((a, b) => (a.time! - b.time!));

  let current = null;
  let next = null;
  for (let i = 0; i < timed.length; i++) {
    const item = timed[i]
    if (!item) break
    if (item.time! <= t) {
      current = item;
      next = timed[i + 1] ?? null;
    } else {
      break;
    }
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (next) {
    ctx.font = '36px "DM Mono", monospace';
    ctx.fillStyle = '#6f6f86';
    ctx.fillText(next.text, canvas.width / 2, canvas.height / 2 + 60);
  }

  if (current) {
    ctx.font = 'bold 56px Syne, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(current.text, canvas.width / 2, canvas.height / 2 - 20);
  } else {
    ctx.font = 'bold 48px Syne, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('Ready...', canvas.width / 2, canvas.height / 2);
  }
};

const renderWithWebCodecs = async (format: 'mp4' | 'webm') => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 48000 });
    const response = await fetch(song.value.audioUrl!);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const fps = 30;
    const duration = song.value.duration || audioBuffer.duration;
    const totalFrames = Math.ceil(duration * fps);
    const width = 1280;
    const height = 720;

    let muxer: any;
    
    if (format === 'mp4') {
      muxer = new Mp4Muxer.Muxer({
        target: new Mp4Muxer.ArrayBufferTarget(),
        video: { codec: 'avc', width, height },
        audio: { codec: 'aac', numberOfChannels: audioBuffer.numberOfChannels, sampleRate: audioBuffer.sampleRate },
        fastStart: 'in-memory'
      });
    } else {
      muxer = new WebMMuxer.Muxer({
        target: new WebMMuxer.ArrayBufferTarget(),
        video: { codec: 'V_VP8', width, height },
        audio: { codec: 'A_OPUS', numberOfChannels: audioBuffer.numberOfChannels, sampleRate: 48000 } // Opus uses 48kHz
      });
    }

    const VideoEncoderAny = (window as any).VideoEncoder;
    const AudioEncoderAny = (window as any).AudioEncoder;
    const VideoFrameAny = (window as any).VideoFrame;
    const AudioDataAny = (window as any).AudioData;

    const videoEncoder = new VideoEncoderAny({
      output: (chunk: any, meta: any) => muxer.addVideoChunk(chunk, meta),
      error: (e: any) => console.error(e)
    });
    
    if (format === 'mp4') {
      videoEncoder.configure({ codec: 'avc1.42001f', width, height, bitrate: 2_000_000 });
    } else {
      videoEncoder.configure({ codec: 'vp8', width, height, bitrate: 2_000_000 });
    }

    const audioEncoder = new AudioEncoderAny({
      output: (chunk: any, meta: any) => muxer.addAudioChunk(chunk, meta),
      error: (e: any) => console.error(e)
    });
    
    if (format === 'mp4') {
      audioEncoder.configure({ codec: 'mp4a.40.2', numberOfChannels: audioBuffer.numberOfChannels, sampleRate: audioBuffer.sampleRate, bitrate: 128000 });
    } else {
      audioEncoder.configure({ codec: 'opus', numberOfChannels: audioBuffer.numberOfChannels, sampleRate: 48000, bitrate: 128000 });
    }

    // Encode Audio
    const sampleRate = audioBuffer.sampleRate;
    const numChannels = audioBuffer.numberOfChannels;
    const totalAudioFrames = audioBuffer.length;
    const framesPerChunk = sampleRate; // 1s chunks

    for (let i = 0; i < totalAudioFrames; i += framesPerChunk) {
      if (isCancelled) break;
      const frameCount = Math.min(framesPerChunk, totalAudioFrames - i);
      const planarData = new Float32Array(frameCount * numChannels);
      for (let c = 0; c < numChannels; c++) {
        planarData.set(audioBuffer.getChannelData(c).subarray(i, i + frameCount), c * frameCount);
      }
      const audioData = new AudioDataAny({
        format: 'f32-planar',
        sampleRate,
        numberOfFrames: frameCount,
        numberOfChannels: numChannels,
        timestamp: (i / sampleRate) * 1_000_000,
        data: planarData
      });
      audioEncoder.encode(audioData);
      audioData.close();
    }

    // Encode Video
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

    for (let f = 0; f < totalFrames; f++) {
      if (isCancelled) break;
      const t = f / fps;
      
      drawFrameAtTime(ctx, canvas, t);

      const frame = new VideoFrameAny(canvas, { timestamp: t * 1_000_000 });
      videoEncoder.encode(frame, { keyFrame: f % 30 === 0 });
      frame.close();

      if (f % 15 === 0) {
        progress.value = (f / totalFrames) * 100;
        await new Promise(r => setTimeout(r, 0)); // yield to UI
      }
    }

    if (!isCancelled) {
      await audioEncoder.flush();
      await videoEncoder.flush();
      muxer.finalize();
      
      const target = muxer.target as any;
      const blob = new Blob([target.buffer], { type: format === 'mp4' ? 'video/mp4' : 'video/webm' });
      videoUrl.value = URL.createObjectURL(blob);
      progress.value = 100;
    }
  } catch (err) {
    console.error('WebCodecs render error:', err);
    alert('An error occurred during WebCodecs offline rendering.');
  } finally {
    isRendering.value = false;
  }
};

const renderWithMediaRecorder = async () => {
  const audio = audioRef.value!;
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext('2d')!;

  let audioStream: MediaStream | null = null;
  
  try {
    if ((audio as any).captureStream) {
      audioStream = (audio as any).captureStream();
    } else if ((audio as any).mozCaptureStream) {
      audioStream = (audio as any).mozCaptureStream();
    } else {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioContext();
      const dest = audioCtx.createMediaStreamDestination();
      const source = audioCtx.createMediaElementSource(audio);
      source.connect(dest);
      audioStream = dest.stream;
    }
  } catch {
    audioStream = null;
  }

  const videoStream = canvas.captureStream(30);
  const tracks = [...videoStream.getVideoTracks()];
  if (audioStream) {
    tracks.push(...audioStream.getAudioTracks());
  }

  const combinedStream = new MediaStream(tracks);
  
  let mimeType = 'video/webm';
  if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
    mimeType = 'video/webm;codecs=vp9,opus';
  } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
    mimeType = 'video/webm;codecs=vp8,opus';
  }

  const recorder = new MediaRecorder(combinedStream, { mimeType });
  mediaRecorder = recorder;
  const chunks: BlobPart[] = [];

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  recorder.onstop = () => {
    if (!isCancelled) {
      const blob = new Blob(chunks, { type: mimeType });
      videoUrl.value = URL.createObjectURL(blob);
    }
    isRendering.value = false;
  };

  recorder.start();
  await audio.play();

  const drawFrame = () => {
    if (!isRendering.value || isCancelled) return;

    if (audio && audio.duration) {
      progress.value = (audio.currentTime / audio.duration) * 100;
    }

    const t = audio ? audio.currentTime : 0;
    drawFrameAtTime(ctx, canvas, t);

    if (audio && !audio.ended && !audio.paused) {
      requestAnimationFrame(drawFrame);
    } else if (audio && audio.ended) {
      recorder.stop();
    }
  };

  requestAnimationFrame(drawFrame);
};

const formatDuration = (time: number) => {
  const m = Math.floor(time / 60);
  const s = Math.floor(time % 60);
  return `~${m} min ${s} sec`;
};

const stopRender = () => {
  isCancelled = true;
  if (audioRef.value) {
    audioRef.value.pause();
  }
  isRendering.value = false;
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
};
</script>

<template>
  <div
    class="rounded-2xl p-6 space-y-6 flex flex-col h-full"
    style="background: rgba(19,19,24,0.92); border: 1px solid rgba(30,30,46,1);"
  >
    <div class="flex-1">
      <div class="flex items-center gap-3 mb-4">
        <div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background: rgba(124,58,237,0.1); color: #a78bfa;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
        </div>
        <div>
          <p class="text-[11px] font-bold tracking-widest text-[#555566]" style="font-family: 'DM Mono', monospace;">EXPORT</p>
          <h2 class="text-[20px] font-bold text-[#f0eeff]" style="font-family: 'Syne', sans-serif;">Video</h2>
        </div>
      </div>
      <p class="text-[14px] text-[#666677] leading-relaxed mb-6" style="font-family: 'DM Mono', monospace;">
        {{ selectedFormat === 'webm-rt' ? 'Karaoke .webm rendered in real-time (Fallback Mode).' : 'High-speed offline rendering via WebCodecs & muxer.' }}
      </p>

      <div class="space-y-3 text-[13px]" style="font-family: 'DM Mono', monospace;">
        <div class="flex justify-between items-center">
          <span class="text-[#555566]">Format</span>
          <select v-model="selectedFormat" class="bg-[#1a1a2e] text-[#a78bfa] border border-[#2e2e42] rounded-lg px-2 py-1 outline-none font-sans font-medium cursor-pointer focus:border-violet-500 transition-colors">
            <option v-for="fmt in availableFormats" :key="fmt.value" :value="fmt.value">
              {{ fmt.label }}
            </option>
          </select>
        </div>
        <div class="flex justify-between">
          <span class="text-[#555566]">Render time</span>
          <span class="text-[#fbbf24]">{{ selectedFormat !== 'webm-rt' ? 'Fast (Offline)' : formatDuration(song.duration) + ' (Real-time)' }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-[#555566]">Est. size</span>
          <span class="text-[#666677]">~10-50 MB</span>
        </div>
      </div>

      <div class="mt-6 px-4 py-3 rounded-xl flex items-center gap-3 text-[12px] font-medium" style="background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.2); color: #fbbf24; font-family: 'DM Mono', monospace;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        Keep this tab open during render
      </div>
    </div>

    <div v-show="false">
      <audio ref="audioRef" :src="song.audioUrl ?? ''" crossorigin="anonymous"></audio>
    </div>

    <div v-if="isRendering" class="space-y-3">
      <div class="flex justify-between text-[11px] font-bold tracking-widest text-[#a78bfa]" style="font-family: 'DM Mono', monospace;">
        <span>RENDERING...</span>
        <span>{{ progress.toFixed(1) }}%</span>
      </div>
      <div class="w-full rounded-full h-2.5 overflow-hidden" style="background: rgba(255,255,255,0.06);">
        <div
          class="h-full transition-all duration-300"
          :style="{ width: progress + '%', background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)' }"
        />
      </div>
      <button
        @click="stopRender"
        class="w-full h-12 rounded-xl text-[15px] font-bold flex items-center justify-center gap-2 transition-all duration-200"
        style="background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.25); color: #fecaca; font-family: Syne, sans-serif;"
      >
        Cancel Rendering
      </button>
    </div>

    <div v-else-if="videoUrl" class="space-y-3">
      <video :src="videoUrl" controls class="w-full rounded-xl border" style="background: #0b0b0e; border-color: rgba(255,255,255,0.10);"></video>
      <div class="flex gap-2">
        <a 
          :href="videoUrl" 
          :download="`karaoke-sync.${selectedFormat === 'mp4' ? 'mp4' : 'webm'}`" 
          class="flex-1 h-12 flex items-center justify-center gap-2 rounded-xl text-[15px] font-bold transition-all duration-200"
          style="background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); box-shadow: 0 0 26px rgba(124,58,237,0.18); color: white; font-family: Syne, sans-serif;"
        >
          Download Video
        </a>
        <button
          @click="videoUrl = null"
          class="px-5 h-12 rounded-xl text-[15px] font-bold transition-all duration-200"
          style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.10); color: #d9d6ff; font-family: Syne, sans-serif;"
        >
          Reset
        </button>
      </div>
    </div>

    <button
      v-else
      :disabled="!canRender"
      @click="startRender"
      class="w-full h-12 rounded-xl text-[15px] font-bold flex items-center justify-center gap-2 transition-all duration-200"
      :style="canRender
        ? 'background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); color: #f0eeff; font-family: Syne, sans-serif;'
        : 'background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); color: #555566; font-family: Syne, sans-serif; cursor: not-allowed;'"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      Generate Video
    </button>
  </div>
</template>

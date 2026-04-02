<script setup lang="ts"> 
 const { song } = useSong(); 
 const { toLrc } = useLrc(); 
 
 const canDownload = computed(() => 
   song.value.lines.some((l) => l.time != null) 
 ); 
 
 const downloadLrc = () => { 
   if (!canDownload.value) return; 
   const content = toLrc(song.value.lines); 
   const blob = new Blob([content], { type: 'text/plain;charset=utf-8' }); 
   const url = URL.createObjectURL(blob); 
   const a = document.createElement('a'); 
   a.href = url; 
   a.download = 'lyrics.lrc'; 
   a.click(); 
   URL.revokeObjectURL(url); 
 }; 
 </script> 
 
 <template> 
   <div
     class="rounded-2xl p-6 space-y-6 flex flex-col h-full"
     style="background: rgba(19,19,24,0.92); border: 1px solid rgba(30,30,46,1);"
   >
     <div class="flex-1">
       <div class="flex items-center gap-3 mb-4">
         <div class="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
         </div>
         <div>
           <p class="text-[11px] font-bold tracking-widest text-[#555566]" style="font-family: 'DM Mono', monospace;">EXPORT</p>
           <h2 class="text-[20px] font-bold text-[#f0eeff]" style="font-family: 'Syne', sans-serif;">LRC File</h2>
         </div>
       </div>
       <p class="text-[14px] text-[#666677] leading-relaxed mb-6" style="font-family: 'DM Mono', monospace;">
         Synced lyrics as .lrc — works with any media player.
       </p>
 
       <div class="space-y-3 text-[13px]" style="font-family: 'DM Mono', monospace;">
         <div class="flex justify-between">
           <span class="text-[#555566]">Format</span>
           <span class="text-[#a78bfa]">.lrc (standard)</span>
         </div>
         <div class="flex justify-between">
           <span class="text-[#555566]">Size</span>
           <span class="text-[#666677]">~2 KB</span>
         </div>
         <div class="flex justify-between">
           <span class="text-[#555566]">Ready</span>
           <span class="text-emerald-500 font-medium">Instant download</span>
         </div>
       </div>
     </div>
 
     <button 
       :disabled="!canDownload" 
       @click="downloadLrc" 
       class="w-full h-12 rounded-xl text-[15px] font-bold flex items-center justify-center gap-2 transition-all duration-200" 
       :style="canDownload
         ? 'background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); color: #f0eeff; font-family: Syne, sans-serif;'
         : 'background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); color: #555566; font-family: Syne, sans-serif; cursor: not-allowed;'"
     > 
       <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
       Download LRC 
     </button> 
   </div>
 </template>

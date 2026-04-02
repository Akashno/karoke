<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useSong, wrapLine } from '~/composables/useSong'
import type { LyricLine } from '~/composables/useSong'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

const { song, removeTime, clearAllTimes, undoLastTime } = useSong()
const listContainer = ref<HTMLElement | null>(null)
const editingId = ref<string | null>(null)
const editValue = ref<string>('')

// --- New State for Selection & Editing ---
const selectedIds = ref<Set<string>>(new Set())
const lastSelectedId = ref<string | null>(null)
const editingTextId = ref<string | null>(null)
const editTextValue = ref<string>('')
const hasSeenGuide = ref(false)

// --- New State for Drag & Drop ---
const draggedLineId = ref<string | null>(null)
const dragOverLineId = ref<string | null>(null)
const isDraggingHandle = ref(false)

const activeLineId = computed(() => {
  const t = song.value.currentTime
  const timed = song.value.lines
    .filter((l) => l.time != null)
    .slice()
    .sort((a, b) => a.time! - b.time!)

  let current: LyricLine | null = null
  for (const l of timed) {
    if (l.time! <= t) current = l
    else break
  }
  return current?.id ?? null
})

const syncedCount = computed(() => song.value.lines.filter((l) => l.time != null).length)

// Find the first line that hasn't been synced yet
const nextUnsyncedLine = computed(() => {
  return song.value.lines.find(l => l.time == null) || null
})

const tapTime = (line: LyricLine) => {
  line.time = song.value.currentTime
  scrollToNext()
}

const startGuide = async () => {
  hasSeenGuide.value = true;
  if (import.meta.client) {
    localStorage.setItem('karaoke-has-seen-guide', 'true');
  }
  
  await nextTick();
  
  const driverObj = driver({
    showProgress: true,
    popoverClass: 'karaoke-theme',
    onDestroyStarted: () => {
      // Start playing the audio automatically when the tour is finished or skipped
      window.dispatchEvent(new CustomEvent('request-play'));
      driverObj.destroy();
    },
    steps: [
      {
        element: '#audio-player-container',
        popover: {
          title: 'Audio Controls',
          description: 'Here is your audio player! You can play/pause, adjust the playback speed, mute the track, and monitor the waveform while syncing.',
          side: "bottom",
          align: 'start'
        }
      },
      {
        element: '#global-sync-btn',
        popover: { 
          title: 'Start Syncing', 
          description: 'Listen to the audio! When the singer sings the highlighted line, click this button. The line will be instantly synced to that exact timestamp in the song.',
          side: "left", 
          align: 'start' 
        }
      },
      {
        element: '#lyrics-list-container',
        popover: { 
          title: 'Pro Keyboard Shortcuts', 
          description: '<ul style="margin-left: 1rem; list-style-type: disc;"><li><b>SPACE</b>: Play / Pause</li><li><b>ENTER</b>: Sync the current line</li><li><b>UP/DOWN</b>: Seek audio backward/forward 5s</li><li><b>Z</b>: Undo last sync</li></ul>',
          side: "top", 
          align: 'start' 
        }
      }
    ]
  });
  
  driverObj.drive();
}

const tapNext = () => {
  const line = nextUnsyncedLine.value
  if (line) {
    line.time = song.value.currentTime
    scrollToNext()
  }
}

const handleLineClick = (line: LyricLine, event: MouseEvent) => {
  if (editingTextId.value) return; // Prevent selection while editing

  if (event.metaKey || event.ctrlKey) {
    const newSet = new Set(selectedIds.value);
    if (newSet.has(line.id)) newSet.delete(line.id);
    else newSet.add(line.id);
    selectedIds.value = newSet;
    lastSelectedId.value = line.id;
  } else if (event.shiftKey && lastSelectedId.value) {
    const startIdx = song.value.lines.findIndex(l => l.id === lastSelectedId.value);
    const endIdx = song.value.lines.findIndex(l => l.id === line.id);
    if (startIdx !== -1 && endIdx !== -1) {
      const min = Math.min(startIdx, endIdx);
      const max = Math.max(startIdx, endIdx);
      const newSet = new Set(selectedIds.value);
      for (let i = min; i <= max; i++) {
        const l = song.value.lines[i];
        if (l) newSet.add(l.id);
      }
      selectedIds.value = newSet;
    }
  } else {
    selectedIds.value = new Set([line.id]);
    lastSelectedId.value = line.id;
    if (line.time != null) {
      song.value.currentTime = line.time;
      window.dispatchEvent(new CustomEvent('request-seek', { detail: line.time }));
    }
  }
}

const clearSelection = (e: MouseEvent) => {
  if (e.target === listContainer.value || (e.target as HTMLElement).classList.contains('pb-24')) {
    selectedIds.value.clear();
  }
}

// --- Bulk Actions ---
const mergeSelected = () => {
  const ids = Array.from(selectedIds.value);
  const indices = ids.map(id => song.value.lines.findIndex(l => l.id === id)).sort((a, b) => a - b);
  if (indices.length < 2) return;
  
  const firstLine = song.value.lines[indices[0] as number];
  if (!firstLine) return;
  
  const textsToMerge = indices.map(idx => {
    const l = song.value.lines[idx as number];
    return l ? l.text : '';
  });
  firstLine.text = textsToMerge.join(' ');
  
  const idsToRemove = new Set(indices.slice(1).map(idx => {
    const l = song.value.lines[idx as number];
    return l ? l.id : '';
  }));
  song.value.lines = song.value.lines.filter(l => !idsToRemove.has(l.id));
  
  selectedIds.value = new Set([firstLine.id]);
};

const deleteSelected = () => {
  song.value.lines = song.value.lines.filter(l => !selectedIds.value.has(l.id));
  selectedIds.value.clear();
};

// --- Single Line Actions ---
const deleteLine = (id: string) => {
  song.value.lines = song.value.lines.filter(l => l.id !== id);
  selectedIds.value.delete(id);
}

const insertLineBelow = (id: string) => {
  const idx = song.value.lines.findIndex(l => l.id === id);
  if (idx !== -1) {
    const newLine: LyricLine = {
      id: `${Date.now()}-${Math.random()}`,
      text: '',
      time: null
    };
    song.value.lines.splice(idx + 1, 0, newLine);
    startEditingText(newLine);
  }
}

// --- Inline Text Editing ---
const startEditingText = (line: LyricLine) => {
  editingTextId.value = line.id;
  editTextValue.value = line.text;
}

const saveEditingText = () => {
  if (!editingTextId.value) return;
  
  const idx = song.value.lines.findIndex(l => l.id === editingTextId.value);
  if (idx !== -1) {
    const originalLine = song.value.lines[idx];
    if (originalLine) {
      const wrappedTexts = wrapLine(editTextValue.value.trim(), 70);
      
      // Update original line with the first chunk
      originalLine.text = wrappedTexts[0] || '';
      
      // If text exceeded 70 chars, insert new lines for the remainder
      if (wrappedTexts.length > 1) {
        const newLines: LyricLine[] = wrappedTexts.slice(1).map((text, i) => ({
          id: `${Date.now()}-${Math.random()}-${i}`,
          text: text,
          time: null
        }));
        song.value.lines.splice(idx + 1, 0, ...newLines);
      }
    }
  }
  
  editingTextId.value = null;
}

const cancelEditingText = () => {
  editingTextId.value = null;
}

const handleTextEditKeydown = (e: KeyboardEvent, line: LyricLine) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    const target = e.target as HTMLInputElement;
    const cursor = target.selectionStart || 0;
    const textBefore = editTextValue.value.slice(0, cursor);
    const textAfter = editTextValue.value.slice(cursor);
    
    line.text = textBefore;
    
    const idx = song.value.lines.findIndex(l => l.id === line.id);
    const newLine: LyricLine = {
      id: `${Date.now()}-${Math.random()}`,
      text: textAfter,
      time: null
    };
    song.value.lines.splice(idx + 1, 0, newLine);
    
    editingTextId.value = null;
  } else if (e.key === 'Enter') {
    e.preventDefault();
    saveEditingText();
  } else if (e.key === 'Escape') {
    cancelEditingText();
  }
}

// --- Drag and Drop ---
const onDragStart = (line: LyricLine, e: DragEvent) => {
  if (!isDraggingHandle.value) {
    e.preventDefault();
    return;
  }
  draggedLineId.value = line.id;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', line.id);
  }
}

const onDragOver = (line: LyricLine, e: DragEvent) => {
  e.preventDefault();
  if (draggedLineId.value && draggedLineId.value !== line.id) {
    dragOverLineId.value = line.id;
  }
}

const onDragLeave = (line: LyricLine, e: DragEvent) => {
  if (dragOverLineId.value === line.id) {
    dragOverLineId.value = null;
  }
}

const onDrop = (line: LyricLine, e: DragEvent) => {
  e.preventDefault();
  dragOverLineId.value = null;
  if (!draggedLineId.value || draggedLineId.value === line.id) return;
  
  const fromIdx = song.value.lines.findIndex(l => l.id === draggedLineId.value);
  const toIdx = song.value.lines.findIndex(l => l.id === line.id);
  
  if (fromIdx !== -1 && toIdx !== -1) {
    const item = song.value.lines.splice(fromIdx, 1)[0];
    if (item) {
      song.value.lines.splice(toIdx, 0, item);
    }
  }
  draggedLineId.value = null;
  isDraggingHandle.value = false;
}

const onDragEnd = () => {
  draggedLineId.value = null;
  dragOverLineId.value = null;
  isDraggingHandle.value = false;
}

const handleRemoveTime = (id: string) => {
  removeTime(id)
}

const handleClearAll = () => {
  if (confirm('Are you sure you want to clear all synced times?')) {
    clearAllTimes()
  }
}

const startEditing = (line: LyricLine) => {
  if (line.time == null) return
  editingId.value = line.id
  editValue.value = line.time.toFixed(2)
}

const saveEditing = (line: LyricLine) => {
  if (editingId.value !== line.id) return
  const val = parseFloat(editValue.value)
  if (!isNaN(val) && val >= 0) {
    line.time = val
  }
  editingId.value = null
}

const cancelEditing = () => {
  editingId.value = null
}

const scrollToNext = async () => {
  await nextTick()
  if (!listContainer.value) return
  
  // Find the next unsynced line element or the active element
  const targetLine = nextUnsyncedLine.value 
    ? listContainer.value.querySelector(`[data-line-id="${nextUnsyncedLine.value.id}"]`)
    : listContainer.value.querySelector('.is-active-line')

  if (targetLine) {
    targetLine.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

// Auto-scroll when active line changes during playback
watch(activeLineId, async (newId, oldId) => {
  if (newId && newId !== oldId && !editingId.value) {
    await nextTick()
    if (!listContainer.value) return
    const el = listContainer.value.querySelector(`[data-line-id="${newId}"]`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }
})

const handleKeydown = (e: KeyboardEvent) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
    return;
  }
  
  if (e.code === 'Space') {
    e.preventDefault();
  }

  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    if (!editingTextId.value && selectedIds.value.size === 1) {
      e.preventDefault();
      insertLineBelow(Array.from(selectedIds.value)[0] as string);
    }
  }

  if ((e.ctrlKey || e.metaKey) && (e.key === 'Backspace' || e.key === 'Delete')) {
    if (!editingTextId.value && selectedIds.value.size > 0) {
      e.preventDefault();
      deleteSelected();
    }
  }
}

const handleKeyup = (e: KeyboardEvent) => {
  // Ignore if user is typing in an input
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
    return;
  }
  
  if (e.code === 'Enter') {
    e.preventDefault();
    tapNext();
  } else if (e.code === 'KeyZ') {
    e.preventDefault();
    undoLastTime();
    scrollToNext();
  } else if (e.code === 'ArrowUp') {
    e.preventDefault();
    const t = song.value.currentTime;
    song.value.currentTime = Math.max(0, t - 5);
    // Note: We update the store, but we also emit an event so AudioPlayer can update the actual audio element
    window.dispatchEvent(new CustomEvent('request-seek', { detail: song.value.currentTime }));
  } else if (e.code === 'ArrowDown') {
    e.preventDefault();
    const t = song.value.currentTime;
    song.value.currentTime = Math.min(song.value.duration, t + 5);
    window.dispatchEvent(new CustomEvent('request-seek', { detail: song.value.currentTime }));
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
  window.addEventListener('keyup', handleKeyup);

  if (import.meta.client) {
    const savedGuideState = localStorage.getItem('karaoke-has-seen-guide');
    if (savedGuideState === 'true') {
      hasSeenGuide.value = true;
    }
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('keyup', handleKeyup);
})
</script>
 
 <template> 
   <div
     class="rounded-2xl overflow-hidden flex flex-col h-full"
     style="background: rgba(19,19,24,0.92); border: 1px solid rgba(30,30,46,1);"
   >
     <!-- Header -->
     <div class="flex-none p-6 flex items-start justify-between gap-4 border-b border-[#1e1e2e]/50">
       <div>
         <p class="text-[11px] tracking-widest text-[#666677]" style="font-family: 'DM Mono', monospace;">
           LYRICS
         </p>
         <p class="text-[16px] font-semibold text-[#f0eeff] mt-1" style="font-family: 'Syne', sans-serif;">
           Sync lines
         </p>
       </div>
       
       <div class="flex items-center gap-3">
         <button
           v-if="syncedCount > 0"
           @click="handleClearAll"
           class="h-[38px] px-4 rounded-xl text-[11px] font-bold tracking-widest text-[#666677] hover:text-red-400 hover:bg-red-400/10 transition-colors uppercase flex items-center justify-center"
           style="font-family: 'DM Mono', monospace; border: 1px solid transparent;"
         >
           CLEAR ALL
         </button>
         
         <div class="h-[38px] flex items-center justify-center px-4 rounded-xl text-[11px] tracking-widest text-[#666677] uppercase border border-[#2e2e42] bg-[#131318]" style="font-family: 'DM Mono', monospace;">
           {{ syncedCount }}/{{ song.lines.length }} SYNCED
         </div>
         
         <!-- Global Tap Button / Guide Button -->
        <button
          v-if="syncedCount === 0 && !hasSeenGuide"
          type="button"
          @click="startGuide"
          class="h-[38px] px-6 rounded-xl text-[14px] font-bold tracking-wide transition-all duration-200 shadow-[0_0_20px_rgba(251,191,36,0.3)] hover:shadow-[0_0_25px_rgba(251,191,36,0.5)] hover:-translate-y-0.5 flex items-center justify-center gap-2"
          style="font-family: 'Syne', sans-serif; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #fff;"
        >
          <span>Start Editing</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </button>
        
        <button
          v-else
          id="global-sync-btn"
          type="button"
          @click="tapNext"
          :disabled="!nextUnsyncedLine"
          class="h-[38px] px-6 rounded-xl text-[14px] font-bold tracking-wide transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style="font-family: 'Syne', sans-serif;"
          :style="nextUnsyncedLine
            ? 'background: #7c3aed; color: white;'
            : 'background: #1a1a2e; border: 1px solid #2e2e42; color: #666677;'"
        >
          <span v-if="nextUnsyncedLine">Sync Line</span>
          <span v-else>All Synced</span>
          <svg v-if="nextUnsyncedLine" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
       </div>
     </div>

     <!-- List -->
    <div id="lyrics-list-container" ref="listContainer" class="flex-1 overflow-y-auto px-6 py-4 scroll-smooth relative" @click="clearSelection">
      <div class="flex flex-col gap-2 pb-24">
         <div
            v-for="(line, idx) in song.lines"
            :key="line.id"
            :data-line-id="line.id"
            class="group flex items-center gap-3 py-2 rounded-xl px-2 transition-colors cursor-pointer relative"
            :class="{ 
              'is-active-line': line.id === activeLineId && !selectedIds.has(line.id), 
              'border-t-2 border-t-violet-500': dragOverLineId === line.id
            }"
            :style="selectedIds.has(line.id) ? 'background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2);' : (line.id === activeLineId ? 'background: rgba(124,58,237,0.10); border: 1px solid rgba(124,58,237,0.20);' : 'border: 1px solid transparent')"
            @click="handleLineClick(line, $event)"
            @dblclick="startEditingText(line)"
            :draggable="isDraggingHandle"
            @dragstart="onDragStart(line, $event)"
            @dragover="onDragOver(line, $event)"
            @dragleave="onDragLeave(line, $event)"
            @drop="onDrop(line, $event)"
            @dragend="onDragEnd"
          >
            <!-- Drag Handle -->
            <div 
              class="w-6 h-6 flex items-center justify-center cursor-grab opacity-0 group-hover:opacity-100 text-[#555566] hover:text-[#d9d6ff] transition-opacity flex-none"
              @mousedown="isDraggingHandle = true"
              @mouseup="isDraggingHandle = false"
              @mouseleave="isDraggingHandle = false"
              title="Drag to reorder"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="19" r="1"></circle>
                <circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="19" r="1"></circle>
              </svg>
            </div>

           <!-- 1. Index -->
           <span class="w-6 text-[11px] text-[#3d3d55] flex-none text-right" style="font-family: 'DM Mono', monospace;">
             {{ String(idx + 1).padStart(2, '0') }}
           </span>

           <!-- 2. Lyric Text -->
            <div class="flex-1 min-w-0 flex items-center gap-2 pr-2 pl-2">
              <template v-if="editingTextId === line.id">
                <input 
                  v-model="editTextValue"
                  class="w-full bg-[#13131a] border border-violet-600 rounded px-2 py-1 text-[15px] text-[#f0eeff] outline-none focus:ring-1 focus:ring-violet-500 transition-all"
                  style="font-family: 'DM Mono', monospace;"
                  @keydown.stop="handleTextEditKeydown($event, line)"
                  @blur="saveEditingText"
                  autofocus
                />
              </template>
              <template v-else>
                <span
                  class="text-[15px] leading-snug truncate"
                  style="font-family: 'DM Mono', monospace;"
                  :class="line.id === activeLineId ? 'text-[#f0eeff] font-medium' : 'text-[#bcb6e6] opacity-80'"
                >
                  {{ line.text || '(empty line)' }}
                </span>
                <button @click.stop="startEditingText(line)" class="opacity-0 group-hover:opacity-100 text-[#555566] hover:text-violet-400 p-1 flex-none" title="Edit text">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                </button>
              </template>
            </div>

           <!-- 3. Action / Status Button (Right side) -->
           <div class="flex-none flex items-center justify-end min-w-[120px]">
              
              <!-- Hover actions: Add below, Delete -->
              <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 mr-2 transition-opacity">
                <button @click.stop="insertLineBelow(line.id)" class="p-1.5 text-[#555566] hover:text-emerald-400 rounded-lg hover:bg-emerald-400/10 transition-colors" title="Insert line below (Ctrl+Enter)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
                <button @click.stop="deleteLine(line.id)" class="p-1.5 text-[#555566] hover:text-red-400 rounded-lg hover:bg-red-400/10 transition-colors" title="Delete line (Ctrl+Delete)">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </div>

             <!-- State: Synced (Time + Remove X) -->
             <div v-if="line.time != null" class="flex items-center gap-2">
               
               <input
                 v-if="editingId === line.id"
                 v-model="editValue"
                 type="number"
                 step="0.01"
                 class="w-24 h-9 px-3 rounded-lg text-[13px] tracking-wider text-center bg-[#13131a] border-2 border-violet-600 text-[#d9d6ff] outline-none focus:ring-0 focus:border-violet-400 transition-colors"
                 style="font-family: 'DM Mono', monospace;"
                 @blur="saveEditing(line)"
                 @keyup.enter="saveEditing(line)"
                 @keyup.esc="cancelEditing"
                 autoFocus
               />
               <span 
                 v-else
                 @click.stop="startEditing(line)"
                 class="min-w-[5rem] h-9 px-3 rounded-lg text-[13px] tracking-wider flex items-center justify-center cursor-text hover:bg-[rgba(255,255,255,0.1)] transition-colors" 
                 style="font-family: 'DM Mono', monospace; background: rgba(255,255,255,0.06); border: 1px solid rgba(139,92,246,0.18); color: #d9d6ff;"
               >
                 {{ line.time.toFixed(2) }}s
               </span>

               <button
                 @click.stop="handleRemoveTime(line.id)"
                 class="w-8 h-9 rounded-lg flex items-center justify-center text-[#666677] hover:text-red-400 hover:bg-red-400/10 transition-colors"
                 title="Remove timestamp"
               >
                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                   <line x1="18" y1="6" x2="6" y2="18"></line>
                   <line x1="6" y1="6" x2="18" y2="18"></line>
                 </svg>
               </button>
             </div>
             
             <!-- State: Unsynced (Sync Button) -->
             <button
               v-else
               type="button"
               class="px-4 py-1.5 rounded-lg text-[12px] font-bold tracking-wide transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100"
               style="font-family: 'Syne', sans-serif; background: rgba(124,58,237,0.15); border: 1px solid rgba(124,58,237,0.3); color: #a78bfa;"
               @click.stop="tapTime(line)"
             >
               Sync
             </button>
           </div>
         </div>
       </div>

      <!-- Bulk Actions Floating Bar -->
      <div v-if="selectedIds.size > 1" class="absolute bottom-10 left-1/2 -translate-x-1/2 bg-[#1a1a2e] border border-[#3d3d55] px-6 py-3 rounded-2xl flex items-center gap-6 shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-50">
        <span class="text-[13px] font-bold text-[#f0eeff]" style="font-family: 'Syne', sans-serif;">{{ selectedIds.size }} lines selected</span>
        <div class="w-px h-4 bg-[#3d3d55]"></div>
        <button @click.stop="mergeSelected" class="text-[13px] text-[#a78bfa] hover:text-white font-medium transition-colors flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h13"></path><path d="M8 12h13"></path><path d="M8 18h13"></path><path d="M3 6v12"></path><path d="M3 12l3-3"></path><path d="M3 12l3 3"></path></svg>
          Merge
        </button>
        <button @click.stop="deleteSelected" class="text-[13px] text-red-400 hover:text-red-300 font-medium transition-colors flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          Delete
        </button>
        <button @click.stop="selectedIds.clear()" class="text-[13px] text-[#666677] hover:text-white font-medium transition-colors ml-2">
          Cancel
        </button>
      </div>

     </div>
   </div>
 </template>
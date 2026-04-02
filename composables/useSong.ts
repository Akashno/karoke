// composables/useSong.ts 
 export type LyricLine = { 
   id: string; 
   text: string; 
   time: number | null; 
 }; 
 
 export type SongState = { 
  audioUrl: string | null; 
  audioFileName: string | null;
  instrumentalAudio: string | null;
  duration: number; 
  lines: LyricLine[]; 
  currentTime: number; 
  isReady: boolean; 
}; 

export const wrapLine = (line: string, maxLength: number = 70): string[] => {
  if (line.length <= maxLength) return [line];
  
  const words = line.split(' ');
  const result: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (!currentLine) {
      currentLine = word;
    } else if (currentLine.length + 1 + word.length <= maxLength) {
      currentLine += ' ' + word;
    } else {
      result.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) {
    result.push(currentLine);
  }
  return result;
};

export const useSong = () => { 
  const song = useState<SongState>('song', () => ({ 
    audioUrl: null, 
    audioFileName: null,
    instrumentalAudio: null,
    duration: 0, 
    lines: [], 
    currentTime: 0, 
    isReady: false 
  })); 

  const setAudio = (url: string, fileName: string | null = null) => { 
    if (song.value.audioUrl && song.value.audioUrl.startsWith('blob:')) { 
      URL.revokeObjectURL(song.value.audioUrl); 
    } 
    if (song.value.instrumentalAudio && song.value.instrumentalAudio.startsWith('blob:')) {
      URL.revokeObjectURL(song.value.instrumentalAudio);
    }
    song.value.audioUrl = url; 
    song.value.audioFileName = fileName;
    song.value.instrumentalAudio = null;
    song.value.duration = 0; 
    song.value.currentTime = 0; 
    song.value.isReady = false; 
  }; 

  const setInstrumentalAudio = (url: string) => {
    if (song.value.instrumentalAudio && song.value.instrumentalAudio.startsWith('blob:')) {
      URL.revokeObjectURL(song.value.instrumentalAudio);
    }
    song.value.instrumentalAudio = url;
  };

  const setLyricsFromText = (text: string) => { 
    const MAX_LINE_LENGTH = 70; // Standard optimal length for karaoke/subtitles

    const rawLines = text.split('\n').map((t) => t.trim()).filter(Boolean);
    const processedLines: string[] = [];
    
    for (const line of rawLines) {
      processedLines.push(...wrapLine(line, MAX_LINE_LENGTH));
    }

    song.value.lines = processedLines.map((t, i) => ({ 
      id: `${Date.now()}-${i}`, 
      text: t, 
      time: null 
    })); 
  }; 
 
   const setDuration = (duration: number) => { 
     song.value.duration = duration; 
     song.value.isReady = true; 
   }; 
 
   const setCurrentTime = (time: number) => { 
     song.value.currentTime = time; 
   }; 

   const removeTime = (id: string) => {
     const line = song.value.lines.find(l => l.id === id);
     if (line) line.time = null;
   };

   const clearAllTimes = () => {
     song.value.lines.forEach(l => l.time = null);
   };

   const undoLastTime = () => {
     // Find the line with the highest time that isn't null
     const syncedLines = song.value.lines.filter(l => l.time != null);
     if (!syncedLines.length) return;
     
     // Sort by time descending to find the last synced one
     syncedLines.sort((a, b) => b.time! - a.time!);
     const lastSynced = syncedLines[0];
     
     if (lastSynced) {
       lastSynced.time = null;
     }
   };
 
   return { song, setAudio, setInstrumentalAudio, setLyricsFromText, setDuration, setCurrentTime, removeTime, clearAllTimes, undoLastTime }; 
};
// composables/useLrc.ts 
 import type { LyricLine } from './useSong'; 
 
 export const useLrc = () => { 
   const formatTime = (t: number) => { 
     const totalMs = Math.round(t * 100); 
     const minutes = Math.floor(totalMs / 6000); 
     const seconds = Math.floor((totalMs % 6000) / 100); 
     const hundredths = totalMs % 100; 
     return `[${String(minutes).padStart(2, '0')}:${String(seconds).padStart( 
       2, 
       '0' 
     )}.${String(hundredths).padStart(2, '0')}]`; 
   }; 
 
   const toLrc = (lines: LyricLine[]) => 
     lines 
       .filter((l) => l.time != null) 
       .sort((a, b) => (a.time! - b.time!)) 
       .map((l) => `${formatTime(l.time!)}${l.text}`) 
       .join('\n'); 
 
   return { formatTime, toLrc }; 
 };
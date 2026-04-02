import { ref } from 'vue';

export const useVocalRemover = () => {
  const isProcessing = ref(false);
  const status = ref('');
  const progress = ref(0);

  const removeVocals = async (file: File): Promise<string | null> => {
    try {
      isProcessing.value = true;
      status.value = 'Uploading...';
      progress.value = 5;

      const formData = new FormData();
      formData.append('audiofile', file);

      // 1. Upload to backend
      const uploadRes = await fetch('/api/remove-vocals', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const errorText = await uploadRes.text();
        throw new Error(errorText || 'Failed to start separation.');
      }

      const uploadData = await uploadRes.json();
      const hash = uploadData.hash;

      if (!hash) {
        throw new Error('No hash received from the server.');
      }

      progress.value = 20;

      let isDone = false;
      let finalUrl = '';

      // Check if it's somehow already done in the initial upload response (though usually MVSEP just returns a hash)
      if (uploadData.status === 'done' && uploadData.data && uploadData.data.files) {
        const files = uploadData.data.files;
        const instrumentalFile = files.find((f: any) => f.type === 'Instruments');
        if (instrumentalFile && instrumentalFile.url) {
          isDone = true;
          finalUrl = instrumentalFile.url.replace(/`/g, '').trim();
        }
      }

      // 2. Poll for completion
      while (!isDone) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        
        status.value = 'Processing — may take 1-2 mins...';
        
        if (progress.value < 90) {
          progress.value += Math.random() * 5; // Fake progress
        }

        const checkRes = await fetch(`/api/check-vocals?hash=${hash}`);
        if (!checkRes.ok) {
          const errorText = await checkRes.text();
          throw new Error(errorText || 'Failed to check status.');
        }

        const checkData = await checkRes.json();
        
        // Sometimes MVSEP returns success: true, status: 'done' directly at the root, 
        // or inside checkData.data.status. Let's check both.
        const separationStatus = checkData.status || (checkData.data && checkData.data.status);
        
        if (separationStatus === 'done') {
          isDone = true;
          // Look for files array in root or data
          const files = checkData.files || (checkData.data && checkData.data.files) || [];
          
          // Find instrumental file exactly by type "Instruments" as shown in the payload
          const instrumentalFile = files.find((f: any) => f.type === 'Instruments');
          
          if (instrumentalFile && instrumentalFile.url) {
            finalUrl = instrumentalFile.url.replace(/`/g, '').trim(); // clean any backticks or spaces
          } else if (files.length > 0) {
            // Fallback
            finalUrl = files[0].url.replace(/`/g, '').trim();
          } else {
            throw new Error('Completed but no download URL found in the response files array.');
          }
        } else if (separationStatus === 'error') {
          throw new Error('Separation failed on MVSEP.');
        }
      }

      status.value = 'Done!';
      progress.value = 100;

      // Instead of downloading the Blob here and running into CORS issues,
      // just return the direct MVSEP URL.
      return finalUrl;
    } catch (error: any) {
      console.error('Vocal Removal Error:', error);
      status.value = `Error: ${error.message}`;
      progress.value = 0;
      return null;
    } finally {
      isProcessing.value = false;
    }
  };

  return { isProcessing, status, progress, removeVocals };
};
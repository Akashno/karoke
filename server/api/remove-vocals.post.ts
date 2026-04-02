export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const token = config.mvsepApiToken;

  if (!token) {
    throw createError({
      statusCode: 500,
      statusMessage: 'MVSEP API token is missing in the environment configuration.'
    });
  }

  // Parse multipart/form-data
  const formData = await readFormData(event);
  const audioFile = formData.get('audiofile');

  if (!audioFile) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No audio file provided in the request.'
    });
  }

  // Prepare FormData for MVSEP API
  const mvsepFormData = new FormData();
  mvsepFormData.append('api_token', token);
  mvsepFormData.append('audiofile', audioFile);
  mvsepFormData.append('sep_type', '9');      // Demucs v4
  mvsepFormData.append('add_opt1', '0');      // Default (no vocal removal optimization for other stems)
  mvsepFormData.append('add_opt2', '1');      // Output instrumental stem
  mvsepFormData.append('output_format', '1'); // MP3
  mvsepFormData.append('is_demo', '0');       // Process full track

  try {
    const response = await fetch('https://mvsep.com/api/separation/create', {
      method: 'POST',
      body: mvsepFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MVSEP API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'MVSEP API returned an error.');
    }

    return {
      hash: data.data.hash
    };
  } catch (error: any) {
    console.error('Error starting MVSEP separation:', error);
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Internal Server Error'
    });
  }
});
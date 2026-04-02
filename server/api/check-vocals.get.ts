export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const hash = query.hash as string;

  if (!hash) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing hash parameter.'
    });
  }

  const config = useRuntimeConfig();
  const token = config.mvsepApiToken;

  if (!token) {
    throw createError({
      statusCode: 500,
      statusMessage: 'MVSEP API token is missing in the environment configuration.'
    });
  }

  try {
    const response = await fetch(`https://mvsep.com/api/separation/get?hash=${hash}&api_token=${token}`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MVSEP API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('Error checking MVSEP separation:', error);
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Internal Server Error'
    });
  }
});
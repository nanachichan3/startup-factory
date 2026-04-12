const FACTORY_API_URL = process.env.FACTORY_API_URL || 'http://localhost:3001';
const DASHBOARD_USER = process.env.DASHBOARD_USER || 'admin';
const DASHBOARD_PASS = process.env.DASHBOARD_PASS || 'password';

export { FACTORY_API_URL };

/**
 * Make an authenticated request to the Factory API
 */
export async function factoryApiRequest(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'GET',
  body?: Record<string, any>
): Promise<any> {
  const url = `${FACTORY_API_URL}${endpoint}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add Basic Auth header
  const credentials = Buffer.from(`${DASHBOARD_USER}:${DASHBOARD_PASS}`).toString('base64');
  headers['Authorization'] = `Basic ${credentials}`;

  const options: RequestInit = {
    method,
    headers,
  };

  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(body);
  }

  console.log(`[API Client] ${method} ${url}`);

  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API Client] Error ${response.status}: ${errorText}`);
      throw new Error(`API error ${response.status}: ${errorText}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }

    return await response.text();
  } catch (error) {
    console.error(`[API Client] Request failed:`, error);
    throw error;
  }
}

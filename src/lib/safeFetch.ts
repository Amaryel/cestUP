/**
 * Safe fetch utility that never throws on non-JSON or HTML response bodies.
 */
export async function safeFetchJson<T = any>(
  url: string,
  options?: RequestInit
): Promise<{ ok: boolean; status: number; data?: T; error?: string }> {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      try {
        const data = await res.json();
        return {
          ok: res.ok,
          status: res.status,
          data,
          error: !res.ok ? (data?.error || data?.message || `Erro do servidor (${res.status})`) : undefined,
        };
      } catch (parseErr) {
        return {
          ok: false,
          status: res.status,
          error: `Resposta inválida do servidor (${res.status})`,
        };
      }
    }

    // Response is text / HTML or empty
    const text = await res.text().catch(() => '');
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: `Servidor retornou status ${res.status}.`,
      };
    }

    try {
      const data = JSON.parse(text);
      return { ok: true, status: res.status, data };
    } catch {
      return {
        ok: true,
        status: res.status,
        data: undefined,
      };
    }
  } catch (netErr: any) {
    return {
      ok: false,
      status: 0,
      error: netErr?.message || 'Falha de conexão com o servidor.',
    };
  }
}

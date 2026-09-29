export const PLUGIN_GATEWAY_URL =
  process.env.NEXT_PUBLIC_PLUGIN_GATEWAY_URL ??
  "http://localhost:3210";

export const PLUGIN_GATEWAY_WS_URL =
  process.env.NEXT_PUBLIC_PLUGIN_GATEWAY_WS_URL ??
  "ws://localhost:3210";

export const PLUGIN_GATEWAY_TOKEN =
  process.env.NEXT_PUBLIC_PLUGIN_GATEWAY_TOKEN ?? "";

export function gatewayFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
) {
  const headers = new Headers(init.headers);

  if (PLUGIN_GATEWAY_TOKEN) {
    headers.set(
      "Authorization",
      `Bearer ${PLUGIN_GATEWAY_TOKEN}`,
    );
  }

  return fetch(input, {
    ...init,
    headers,
  });
}

export function createGatewaySocket() {
  const url = new URL(PLUGIN_GATEWAY_WS_URL);

  if (PLUGIN_GATEWAY_TOKEN) {
    url.searchParams.set(
      "token",
      PLUGIN_GATEWAY_TOKEN,
    );
  }

  return new WebSocket(url);
}



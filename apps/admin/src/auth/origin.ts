// 바꾸는 요청이 다른 주소의 페이지에서 왔는지 가린다 — 문(gate.ts)이 onRequest 맨 위에서 부른다 (SPEC 도메인/인증 §7 「인증 적용 범위」)

/**
 * 형제 서브도메인(demo. · game. — 시험 대상)은 같은 site 라 `SameSite=Lax` 가 출입증을 그대로 실어 보낸다 (2026-11-03 S26).
 * `PLATFORM_PUBLIC_URL` 이 아니라 `Host` 와 견준다 — 개발 proxy(changeOrigin 없음)와 옛 주소 qahub. 를 같이 받으려고.
 * trustProxy 가 없어 protocol 은 믿을 값이 없다 — host 만 본다.
 * Origin 이 없으면 브라우저가 아닌 기계 호출이라 지나보낸다(back-channel · 에이전트 토큰 · 웹훅 · MCP)
 */
export function 다른출처인가(method: string, origin: string | undefined, host: string | undefined): boolean {
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS' || origin === undefined) return false;
  try {
    const 보낸곳 = new URL(origin);
    // Host 도 같은 규칙으로 고른다 — 대소문자 · 기본 포트(:443 · :80)가 달라도 같은 주소다
    return host === undefined || 보낸곳.host !== new URL(`${보낸곳.protocol}//${host}`).host;
  } catch {
    // `Origin: null`(sandbox iframe · 파일에서 연 페이지 · Referrer-Policy no-referrer)과 모양이 아닌 값
    return true;
  }
}

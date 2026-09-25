// 역방향 작성 요청의 대상 서버·시작 주소 판정과 대상 서버 줄 읽기 (SPEC 도메인/작성 §3.6 「★ 역방향」 · §7)

/**
 * 시작 주소를 받을 수 있으면 **다시 조립한 href** 를, 아니면 null 을 준다.
 *
 * 대상 서버(`baseUrl`)와 출처(scheme+host+port)가 같은 http·https 주소만 받는다.
 * **실수 방지다 — 자식을 막는 장치가 아니다** (§3.6 출처 규칙). 다시 조립한 값을 저장하므로
 * 에이전트가 받는 글자는 URL 파서가 한 번 정리한 것이다.
 *
 * `baseUrl` 은 설정 화면이 자유 글자로 받은 칸이라 깨져 있을 수 있다 — 던지지 않고 null 이다.
 */
export function 시작주소(startUrl: unknown, baseUrl: unknown): string | null {
  if (typeof startUrl !== 'string' || typeof baseUrl !== 'string') return null;
  let 주소: URL;
  let 서버: URL;
  try {
    주소 = new URL(startUrl);
    서버 = new URL(baseUrl);
  } catch {
    return null;
  }
  if (주소.protocol !== 'http:' && 주소.protocol !== 'https:') return null;
  if (주소.username !== '' || 주소.password !== '') return null;
  return 주소.origin === 서버.origin ? 주소.href : null;
}

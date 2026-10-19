// 작성 요청을 만들기 전에 피그마 파일을 서버가 먼저 열어 보고 안 열리면 거절한다 (SPEC 도메인/작성 §7 「자료」 「미리 열어 보기」)

import { 피그마토큰 } from './store.js';

/**
 * 거절 까닭. `FIGMA_DENIED` 의 detail 로 그대로 나간다.
 * - `NO_TOKEN` 서비스에 피그마 토큰이 없다
 * - `TOKEN` 피그마가 토큰을 받아 주지 않는다(틀렸거나 만료)
 * - `FILE:<주소>` 토큰은 맞는데 그 파일을 못 연다(없거나 이 토큰으로 볼 권한이 없다)
 */
export type 피그마막힘 = 'NO_TOKEN' | 'TOKEN' | `FILE:${string}`;

const 열기시간 = 8_000;

type 열림 = 'OK' | 'TOKEN' | 'FILE' | 'UNKNOWN';

/** 정규화한 주소(`피그마주소정규화` 결과)에서 파일 키를 꺼낸다 — 정규식으로 이미 `[A-Za-z0-9]{1,64}` 로 좁혀진 값이다 */
function 파일키(주소: string): string {
  return new URL(주소).pathname.split('/')[2] ?? '';
}

/**
 * 파일 하나를 그 토큰으로 연다. 이름·쪽 목록만 오는 가벼운 요청(`depth=1`)이다 —
 * 에이전트가 쓰는 `files/:key` 와 같은 권한을 요구해 「여기서는 열리는데 거기서는 안 열리는」 일이 없다.
 *
 * **403 이 둘이다.** 피그마는 토큰이 틀려도 파일 권한이 없어도 403 이고 본문 `err` 로만 가른다(「Invalid token」).
 * **확실한 거절(401 · 403 · 404)만 막는다.** 시간 초과 · 5xx · 429 · 이 서버에서 피그마에 못 닿음은 `UNKNOWN` 이다 —
 * 작성은 다른 기계(맥 · author 컨테이너)가 하고 거기서는 닿을 수 있으므로 여기서 모르는 것을 막지 않는다.
 * `redirect: 'error'` 는 토큰 머리글이 딴 주소로 따라가지 않게 하려는 것이다(undici 는 사용자 지정 머리글을 안 지운다)
 */
async function 열어보기(키: string, 토큰: string): Promise<열림> {
  let res: Response;
  try {
    res = await fetch(`https://api.figma.com/v1/files/${encodeURIComponent(키)}?depth=1`, {
      headers: { 'X-Figma-Token': 토큰 },
      redirect: 'error',
      signal: AbortSignal.timeout(열기시간),
    });
  } catch {
    return 'UNKNOWN';
  }
  if (res.ok) return 'OK';
  if (res.status === 401) return 'TOKEN';
  if (res.status === 404) return 'FILE';
  if (res.status !== 403) return 'UNKNOWN';
  const 본문 = (await res.json().catch(() => null)) as { err?: unknown } | null;
  // 읽기 범위(scope)가 모자란 토큰의 403(「Invalid scope(s)」)도 토큰을 바꿔야 풀린다 — 파일 문제로 알리면 엉뚱한 곳을 본다
  return typeof 본문?.err === 'string' && /token|scope/i.test(본문.err) ? 'TOKEN' : 'FILE';
}

/**
 * 막는 까닭을 돌려준다. 없으면 null — 줄에 세워도 된다.
 * 같은 파일 키는 한 번만 연다(노드 주소가 여럿이어도 같은 파일이다). 여러 개가 막히면 **입력 순서로 먼저 막힌 것**을 알린다 —
 * 토큰 문제가 있으면 모든 파일이 같은 답이라 그것이 먼저 나온다
 */
export async function 피그마막힘판정(주소들: string[], 토큰: string | null): Promise<피그마막힘 | null> {
  if (주소들.length === 0) return null;
  if (토큰 === null) return 'NO_TOKEN';
  const 키들 = [...new Set(주소들.map(파일키))];
  const 답 = new Map(await Promise.all(키들.map(async (키) => [키, await 열어보기(키, 토큰)] as const)));
  for (const 주소 of 주소들) {
    const 열림 = 답.get(파일키(주소));
    if (열림 === 'TOKEN') return 'TOKEN';
    if (열림 === 'FILE') return `FILE:${주소}`;
  }
  return null;
}

/** 서비스의 토큰을 읽어 판정한다. 라우트가 이것만 부른다 */
export async function 피그마막힘(서비스: number, 주소들: string[]): Promise<피그마막힘 | null> {
  return 피그마막힘판정(주소들, 주소들.length === 0 ? null : await 피그마토큰(서비스));
}

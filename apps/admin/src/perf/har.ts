// 녹화(HAR)를 가리고 AI 재료로 줄인다 — 비밀값은 AI 에 넘기기 전에 서버가 가린다 (도메인/성능 §3.9 「시나리오 만들기」 · PERF-F1-04 시작 질문)

export interface 녹화계정 {
  loginId: string | null;
  loginPassword: string | null;
}

interface 머리 {
  name: string;
  value: string;
}

export interface HAR줄 {
  startedDateTime: string;
  time: number;
  request: { method: string; url: string; headers: 머리[]; postData?: { mimeType?: string; text?: string } };
  response: { status: number; headers: 머리[]; content: { mimeType?: string; size?: number; text?: string; encoding?: string } };
  _resourceType?: string;
}

export interface AI녹화줄 {
  i: number;
  method: string;
  url: string;
  status: number;
  gapSec: number;
  reqHeaders: Record<string, string>;
  reqBody?: string;
  resType?: string;
  resBody?: string;
}

const 비밀머리 = /^(authorization|cookie|set-cookie|proxy-authorization|x-[a-z0-9-]*(token|key|secret|auth)[a-z0-9-]*)$/i;
// 칸 이름 전체가 맞아야 한다 — 일부만 보면 author · sessionCount · passenger 같은 보통 값까지 꼬리표가 되어 주소 · id 가 망가진다
const 비밀키 = /^(pass(word|wd)?|pwd|pw|pin|otp|secret|client[-_]?secret|session([-_]?id)?|sid|auth|authorization|api[-_]?key|credentials?|[a-z_-]*token)$/i;
// k6 가 알아서 붙이거나(쿠키 통) 뜻이 없는 브라우저 머리글 — AI 재료에서 뺀다
const 버릴머리 = /^(cookie|user-agent|accept|accept-[a-z]+|sec-[a-z-]+|referer|origin|connection|cache-control|pragma|host|content-length|upgrade-insecure-requests|priority|:.*)$/i;
const 정적종류 = new Set(['image', 'font', 'stylesheet', 'media', 'manifest', 'texttrack']);
const 정적형식 = /^(image|font|audio|video)\/|^text\/css|^application\/(font|x-font)/i;
const 최소비밀길이 = 6;
export const 요청본문상한 = 4000;
export const 응답본문상한 = 2000;
export const AI줄상한 = 300;

/** 이미지 · 폰트 · CSS · 미디어. 스크립트 · 외부 호스트는 AI 가 고른다 */
export function 정적인가(e: HAR줄): boolean {
  if (e._resourceType !== undefined && 정적종류.has(e._resourceType)) return true;
  return 정적형식.test(e.response.content.mimeType ?? '');
}

/** HAR 파일 여럿의 줄을 시각 차례로 하나로 잇는다. 모양이 아닌 줄은 버린다 */
export function 줄잇기(hars: unknown[]): HAR줄[] {
  const 줄: HAR줄[] = [];
  for (const h of hars) {
    const entries = (h as { log?: { entries?: unknown } } | null)?.log?.entries;
    if (!Array.isArray(entries)) continue;
    for (const e of entries as HAR줄[]) {
      if (typeof e?.request?.url === 'string' && typeof e.startedDateTime === 'string' && e.response !== undefined) 줄.push(e);
    }
  }
  return 줄.sort((a, b) => Date.parse(a.startedDateTime) - Date.parse(b.startedDateTime));
}

function 키값들(값: unknown, 담기: (v: string) => void, 비밀자리 = false): void {
  if (typeof 값 === 'string' || typeof 값 === 'number') {
    if (비밀자리) 담기(String(값));
    return;
  }
  if (Array.isArray(값)) {
    for (const v of 값) 키값들(v, 담기, 비밀자리);
    return;
  }
  if (값 !== null && typeof 값 === 'object') {
    for (const [k, v] of Object.entries(값)) 키값들(v, 담기, 비밀자리 || 비밀키.test(k));
  }
}

function 본문비밀(글: string | undefined, 담기: (v: string) => void): void {
  if (글 === undefined || 글 === '') return;
  try {
    키값들(JSON.parse(글), 담기);
    return;
  } catch {
    // JSON 이 아니면 폼(a=1&b=2)으로 본다
  }
  for (const [k, v] of new URLSearchParams(글)) if (비밀키.test(k)) 담기(v);
}

/** 머리글 · 쿠키 · 본문 · 주소의 비밀 칸에서 값을 모은다. Bearer 같은 꼴 앞말은 뗀다 */
export function 비밀값모으기(줄: readonly HAR줄[]): string[] {
  const 값 = new Set<string>();
  const 담기 = (v: string) => {
    const 알맹이 = v.replace(/^(bearer|basic|token)\s+/i, '').trim();
    if (알맹이.length >= 최소비밀길이) 값.add(알맹이);
  };
  for (const e of 줄) {
    for (const h of [...e.request.headers, ...e.response.headers]) {
      if (!비밀머리.test(h.name)) continue;
      if (/cookie/i.test(h.name)) {
        // a=1; b=2 와 set-cookie 의 속성(Path · Expires)에서 값만
        for (const 조각 of h.value.split(/;\s*|\n/)) {
          const 자리 = 조각.indexOf('=');
          const 이름 = 자리 < 0 ? '' : 조각.slice(0, 자리).trim().toLowerCase();
          if (자리 > 0 && !['path', 'expires', 'domain', 'max-age', 'samesite'].includes(이름)) 담기(조각.slice(자리 + 1));
        }
      } else 담기(h.value);
    }
    본문비밀(e.request.postData?.text, 담기);
    본문비밀(e.response.content.text, 담기);
    try {
      for (const [k, v] of new URL(e.request.url).searchParams) if (비밀키.test(k)) 담기(v);
    } catch {
      // 깨진 주소는 그대로 둔다
    }
  }
  return [...값];
}

/**
 * 값 → 꼬리표 표. 계정 아이디 · 비밀번호는 생성기가 아는 ${username} · ${password} 로,
 * 나머지는 같은 값이면 같은 <<비밀N>> 으로 — 값이 같은 자리를 AI 가 이어 봐야 변수 추출을 찾는다
 */
export function 가림표(비밀: readonly string[], 계정들: readonly 녹화계정[]): Map<string, string> {
  const 표 = new Map<string, string>();
  for (const a of 계정들) {
    if (a.loginPassword !== null && a.loginPassword.length >= 4) 표.set(a.loginPassword, '${password}');
    // 짧은 아이디(admin)는 주소의 /admin/ 까지 바꿔 버린다
    if (a.loginId !== null && a.loginId.length >= 최소비밀길이) 표.set(a.loginId, '${username}');
  }
  let n = 0;
  for (const v of 비밀) if (!표.has(v)) 표.set(v, `<<비밀${++n}>>`);
  // 주소 · 폼 본문에는 인코딩된 꼴로 들어간다. 폼(URLSearchParams)은 ! ' ( ) ~ 까지 %XX 로, 공백은 + 로 바꿔 꼴이 하나 더 있다.
  // JSON 본문은 따옴표 · 역빗금 앞에 \ 를 붙인다
  for (const [v, 꼬리표] of [...표]) {
    for (const 인코딩 of [encodeURIComponent(v), new URLSearchParams([['', v]]).toString().slice(1), JSON.stringify(v).slice(1, -1)]) {
      if (인코딩 !== v && !표.has(인코딩)) 표.set(인코딩, 꼬리표);
    }
  }
  return 표;
}

/** 글자 하나하나에 긴 값부터 바꾼다 — 짧은 값이 긴 값의 일부를 먼저 먹지 않게 */
export function 가리기<T>(값: T, 표: Map<string, string>): T {
  const 차례 = [...표.keys()].sort((a, b) => b.length - a.length);
  const 바꾸기 = (글: string) => 차례.reduce((acc, v) => (acc.includes(v) ? acc.split(v).join(표.get(v)!) : acc), 글);
  const 돌기 = (x: unknown): unknown => {
    if (typeof x === 'string') return 바꾸기(x);
    if (Array.isArray(x)) return x.map(돌기);
    if (x !== null && typeof x === 'object') return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, 돌기(v)]));
    return x;
  };
  return 돌기(값) as T;
}

/** 남겨 둘 가린 녹화 — 정적 리소스는 본문을 버려 파일을 줄인다 */
export function 남길녹화(줄: readonly HAR줄[]): { log: { version: string; creator: { name: string; version: string }; entries: HAR줄[] } } {
  const entries = 줄.map((e) => (정적인가(e) ? { ...e, response: { ...e.response, content: { mimeType: e.response.content.mimeType, size: e.response.content.size } } } : e));
  return { log: { version: '1.2', creator: { name: 'Test Commander', version: '1' }, entries } };
}

const 자르기 = (글: string, 상한: number) => (글.length > 상한 ? `${글.slice(0, 상한)}…(${글.length}자 중 ${상한}자)` : 글);

/** 가린 줄을 AI 재료로 — 정적 리소스를 빼고, 다음 요청까지의 간격을 1초 단위로 반올림한다 */
export function AI재료(줄: readonly HAR줄[]): { entries: AI녹화줄[]; total: number; staticExcluded: number; cut: number } {
  const 남은 = 줄.filter((e) => !정적인가(e));
  const 쓸 = 남은.slice(0, AI줄상한);
  const entries = 쓸.map((e, i): AI녹화줄 => {
    const 다음 = 쓸[i + 1];
    const 끝 = Date.parse(e.startedDateTime) + Math.max(0, e.time);
    const gapSec = 다음 === undefined ? 0 : Math.max(0, Math.round((Date.parse(다음.startedDateTime) - 끝) / 1000));
    const reqHeaders = Object.fromEntries(e.request.headers.filter((h) => !버릴머리.test(h.name)).map((h) => [h.name.toLowerCase(), h.value]));
    const 형식 = e.response.content.mimeType;
    const 글응답 = e.response.content.encoding !== 'base64' && /json|text\/(plain|html|xml)|xml/i.test(형식 ?? '');
    return {
      i: i + 1,
      method: e.request.method,
      url: e.request.url,
      status: e.response.status,
      gapSec,
      reqHeaders,
      ...(e.request.postData?.text !== undefined && e.request.postData.text !== '' && { reqBody: 자르기(e.request.postData.text, 요청본문상한) }),
      ...(형식 !== undefined && 형식 !== '' && { resType: 형식 }),
      ...(글응답 && e.response.content.text !== undefined && e.response.content.text !== '' && { resBody: 자르기(e.response.content.text, 응답본문상한) }),
    };
  });
  return { entries, total: 줄.length, staticExcluded: 줄.length - 남은.length, cut: 남은.length - 쓸.length };
}

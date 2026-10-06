// 이어 주기 규칙 — 어떤 요청에 무엇을 걸지 브라우저 없이 판단한다. Playwright 에 닿는 일은 window.ts 가 한다 (SPEC 도메인/시나리오 §3.7 결정 12)

// kit 은 타입만 가져온다 — 값으로 부르면 케이스의 require 와 섞여 러너 이미지에서 죽는다 (parts.ts 머리 · 2026-09-28 이미지 실측)
import type { APIRequest, BrowserContext } from '@playwright/test';
import type { ScenarioPhase } from '@platform/kit/scenario';
import type { ScenarioExecuteRequest, ScenarioLink, ScenarioMethod, ScenarioResponseRef } from '@platform/kit';

type CasePart = Extract<ScenarioExecuteRequest['parts'][number], { kind: 'case' }>;

export type 상태 = Awaited<ReturnType<BrowserContext['storageState']>>;   // 쿠키 · localStorage
export interface 받은응답 { status: number; contentType: string; body: string }

export interface 미룬삭제 {
  fromSeq: number;
  url: string;                                   // 절대 주소 (결정 11)
  headers: Record<string, string>;               // 그 호출에 붙인 headers + 그 도구를 만들 때 준 extraHTTPHeaders
  httpCredentials?: NonNullable<Parameters<APIRequest['newContext']>[0]>['httpCredentials'];
  state: 상태;                                    // 모을 때의 쿠키 — 못 읽으면 부품의 찍은상태 (결정 6)
}

export interface 부품상태 {                        // 케이스 부품 하나. 그 부품이 만든 도구가 끝까지 이것을 본다 (결정 10)
  seq: number;
  links: readonly ScenarioLink[];
  phase: ScenarioPhase;
  오류?: string;                                   // 이음 오류. 처음 것만 (결정 12)
  걸림: Set<number>;                               // links 의 몇 번째가 한 번이라도 걸렸나 — 안 걸린 것을 실패 사유에 싣는다
  찍은상태?: 상태;                                  // 한도에 걸려 창을 닫기 직전에 찍은 것
}

export interface 이음 {
  baseUrl: string;
  가리킴: Array<{ fromSeq: number; method: ScenarioMethod; urlPattern: string }>;   // 중복 없음
  응답: Map<string, Promise<받은응답 | string>>;   // 열쇠 `${fromSeq} ${method} ${urlPattern}` · string 은 못 읽은 사유
  미룸: 미룬삭제[];
  얼림: boolean;                                  // 뒷정리 보내기 직전 true — 그 뒤 삭제는 안 미룬다 (결정 15)
  모킹: Map<string, 받은응답>;                     // API 쪽 모킹. parts.ts 가 mock · unmock 때 고친다
}

export type 가름 =
  | { kind: 'send'; method?: string; url?: string }       // method · url 이 있으면 바꿔 보내기
  | { kind: 'fulfill'; 응답: 받은응답 }
  | { kind: 'defer' }                                      // 부른 쪽이 상태와 함께 이음.미룸 에 넣고 200 {} 를 준다
  | { kind: 'fail'; message: string };                     // 가르기가 부품.오류 ??= message 도 한다

const 빈응답: 받은응답 = { status: 200, contentType: 'application/json', body: '{}' };
const 이름 = { reuse: '앞 응답 돌려주기', block: '요청 막기', rewrite: '바꿔 보내기' } as const;

// Playwright 1.63 globToRegexPattern 을 옮겼다 — 무늬 맞추기 공개 함수가 없다 (결정 7)
const escapedChars = new Set(['$', '^', '+', '.', '*', '(', ')', '|', '\\', '?', '{', '}', '[', ']']);
function globToRegexPattern(glob: string): string {
  const tokens = ['^'];
  let inGroup = false;
  for (let i = 0; i < glob.length; ++i) {
    const c = glob[i]!;
    if (c === '\\' && i + 1 < glob.length) {
      const char = glob[++i]!;
      tokens.push(escapedChars.has(char) ? '\\' + char : char);
      continue;
    }
    if (c === '*') {
      const charBefore = glob[i - 1];
      let starCount = 1;
      while (glob[i + 1] === '*') {
        starCount++;
        i++;
      }
      if (starCount > 1) {
        const charAfter = glob[i + 1];
        if (charAfter === '/') {
          tokens.push(charBefore === '/' ? '((.+/)|)' : '(.*/)');
          ++i;
        } else tokens.push('(.*)');
      } else tokens.push('([^/]*)');
      continue;
    }
    switch (c) {
      case '{':
        if (inGroup) throw new Error(`Invalid glob pattern ${JSON.stringify(glob)}: nested '{' is not supported`);
        inGroup = true;
        tokens.push('(');
        break;
      case '}':
        if (!inGroup) throw new Error(`Invalid glob pattern ${JSON.stringify(glob)}: unmatched '}'`);
        inGroup = false;
        tokens.push(')');
        break;
      case ',':
        tokens.push(inGroup ? '|' : '\\' + c);
        break;
      default:
        tokens.push(escapedChars.has(c) ? '\\' + c : c);
    }
  }
  if (inGroup) throw new Error(`Invalid glob pattern ${JSON.stringify(glob)}: unmatched '{'`);
  tokens.push('$');
  return tokens.join('');
}

// ponytail: Playwright 의 상대 무늬 풀기(resolveGlobBase — 대소문자 · `..` · `?`)를 다 옮기지 않았다. 어긋나면 막기 · 바꿔 보내기가
// 조용히 안 걸린다 — 실패한 부품에 「안 걸린 이어 주기」로 드러난다(결정 12). 흔한 무늬는 브라우저 실측 대조 표(e2e.test)가 지킨다
export function 무늬맞음(무늬: string, url: string, baseUrl: string): boolean {
  const 절대 = 무늬.startsWith('/') && !무늬.startsWith('//') ? new URL(baseUrl).origin + 무늬 : 무늬;
  try {
    return new RegExp(globToRegexPattern(절대)).test(url);
  } catch {
    // 깨진 무늬는 안 걸린 이어 주기로 드러난다 — 여기서 던지면 그 요청 하나가 엉뚱하게 죽는다
    return false;
  }
}

// Playwright APIRequestContext 와 같은 풀이 — new URL(url, baseURL) 이 못 풀면 그대로 · params 는 append (결정 11)
export function 요청주소(url: string, 기준: string | undefined, params?: Record<string, string | number | boolean>): string {
  let 풀린: URL;
  try {
    풀린 = new URL(url, 기준);
  } catch {
    return url;
  }
  for (const [name, value] of Object.entries(params ?? {})) 풀린.searchParams.append(name, String(value));
  return 풀린.toString();
}

export function 값꺼냄(body: string, jsonPath: string): { ok: true; value: unknown } | { ok: false } {
  let 지금: unknown;
  try {
    지금 = JSON.parse(body);
  } catch {
    return { ok: false };
  }
  for (const 칸 of jsonPath.split('.')) {
    // 글자 · 숫자의 length 같은 속성을 값으로 잘못 꺼내지 않게 객체 · 배열의 제 칸만 본다
    if (typeof 지금 !== 'object' || 지금 === null || !Object.hasOwn(지금, 칸)) return { ok: false };
    지금 = (지금 as Record<string, unknown>)[칸];
  }
  return { ok: true, value: 지금 };
}

const 열쇠 = (r: { fromSeq: number; method: string; urlPattern: string }) => `${r.fromSeq} ${r.method} ${r.urlPattern}`;

export function 새부품(seq: number, links: readonly ScenarioLink[] | undefined): 부품상태 {
  return { seq, links: links ?? [], phase: { started: false, inStep: 0, judged: false }, 걸림: new Set() };
}

export function 새이음(parts: ScenarioExecuteRequest['parts'], baseUrl: string): 이음 {
  const 가리킴 = new Map<string, 이음['가리킴'][number]>();
  for (const part of parts) {
    if (part.kind !== 'case') continue;
    for (const link of part.links ?? []) {
      const ref = link.kind === 'reuse' ? link : link.kind === 'rewrite' ? link.to.value : link.kind === 'bind' ? link.value : undefined;
      if (ref !== undefined) 가리킴.set(열쇠(ref), { fromSeq: ref.fromSeq, method: ref.method, urlPattern: ref.urlPattern });
    }
  }
  return { baseUrl, 가리킴: [...가리킴.values()], 응답: new Map(), 미룸: [], 얼림: false, 모킹: new Map() };
}

// 자리는 응답이 오는 순간 동기로 잡는다 — 본문을 다 읽고 잡으면 거의 같이 온 둘째가 첫째를 덮는다 (결정 13)
export function 적기(이음: 이음, seq: number, method: string, url: string, 본문: () => Promise<받은응답>): void {
  let 읽기: Promise<받은응답 | string> | undefined;
  for (const g of 이음.가리킴) {
    const key = 열쇠(g);
    if (g.fromSeq !== seq || g.method !== method.toUpperCase() || 이음.응답.has(key) || !무늬맞음(g.urlPattern, url, 이음.baseUrl)) continue;
    읽기 ??= (async () => 본문())().catch(() => `${seq}번 부품 응답 본문을 못 읽었다`);
    이음.응답.set(key, 읽기);
  }
}

async function 값찾기(이음: 이음, ref: ScenarioResponseRef): Promise<{ ok: true; value: unknown } | { 사유: string }> {
  const 자리 = 이음.응답.get(열쇠(ref));
  if (자리 === undefined) return { 사유: `${ref.fromSeq}번 부품에 맞는 응답이 없다` };
  const 응답 = await 자리;
  if (typeof 응답 === 'string') return { 사유: 응답 };
  const 값 = 값꺼냄(응답.body, ref.jsonPath);
  return 값.ok ? 값 : { 사유: `${ref.fromSeq}번 부품 응답에 ${ref.jsonPath} 가 없다` };
}

async function 걸기(이음: 이음, link: Extract<ScenarioLink, { kind: 'reuse' | 'block' | 'rewrite' }>): Promise<가름> {
  if (link.kind === 'block') return { kind: 'fulfill', 응답: 빈응답 };
  if (link.kind === 'reuse') {
    const 자리 = 이음.응답.get(열쇠(link));
    if (자리 === undefined) return { kind: 'fail', message: `${link.fromSeq}번 부품에 맞는 응답이 없다` };
    const 응답 = await 자리;
    return typeof 응답 === 'string' ? { kind: 'fail', message: 응답 } : { kind: 'fulfill', 응답 };
  }
  const 값 = await 값찾기(이음, link.to.value);
  if ('사유' in 값) return { kind: 'fail', message: 값.사유 };
  // new URL 은 대상 주소의 경로(/shop)를 날리고, 값의 / · .. 는 다른 경로로 샌다 (결정 3)
  const url = 이음.baseUrl.replace(/\/+$/, '') + link.to.path.replace('{}', encodeURIComponent(String(값.value)));
  return { kind: 'send', method: link.to.method, url };
}

export async function 가르기(이음: 이음, 부품: 부품상태 | undefined, 채널: 'browser' | 'api', method: string, url: string): Promise<가름> {
  const m = method.toUpperCase();
  if (부품 !== undefined && !부품.phase.judged) {
    for (const [i, link] of 부품.links.entries()) {
      if (link.kind === 'bind' || link.method !== m || !무늬맞음(link.urlPattern, url, 이음.baseUrl)) continue;
      부품.걸림.add(i);
      const 가름 = await 걸기(이음, link);
      if (가름.kind === 'fail') 부품.오류 ??= 가름.message;
      return 가름;
    }
  }
  if (채널 === 'browser') return { kind: 'send' };
  if (m === 'DELETE' && 부품 !== undefined && 부품.phase.started && 부품.phase.inStep === 0 && !이음.얼림) return { kind: 'defer' };
  // 브라우저 route 처럼 나중에 건 것이 이긴다
  for (const [무늬, 응답] of [...이음.모킹].reverse()) {
    if (무늬맞음(무늬, url, 이음.baseUrl)) return { kind: 'fulfill', 응답 };
  }
  return { kind: 'send' };
}

export async function 꽂기(
  이음: 이음,
  part: CasePart,
  부품: 부품상태,
): Promise<{ params: Record<string, unknown>; bound?: Record<string, unknown> } | { 오류: string }> {
  const binds = 부품.links.filter((link) => link.kind === 'bind');
  if (binds.length === 0) return { params: part.params };
  const bound: Record<string, unknown> = {};
  for (const link of binds) {
    const 값 = await 값찾기(이음, link.value);
    if ('사유' in 값) return { 오류: 값.사유 };
    bound[link.param] = 값.value;
  }
  return { params: { ...part.params, ...bound }, bound };
}

export function 안걸린(부품: 부품상태): string | undefined {
  const 줄 = 부품.links.flatMap((link, i) =>
    link.kind === 'bind' || 부품.걸림.has(i) ? [] : [`${이름[link.kind]} ${link.method} ${link.urlPattern}`],
  );
  return 줄.length === 0 ? undefined : `안 걸린 이어 주기 — ${줄.join(' · ')}`;
}

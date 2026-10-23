// API 케이스는 화면이 없으므로 스크린샷 자리에 요청·응답 원문을 남긴다. 남기기 전에 비밀을 가린다 (SPEC §4 · 도메인/API §3.8 「API 인증」)

import type { APIRequestContext, APIResponse } from '@playwright/test';

import type { ShapeCheck } from '../types.js';

import { 모양확인 } from './apiShape.js';
import { runScope, stepScope } from './context.js';

const 가림 = '********';
const TRACED_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'fetch']);
const TRACE_BODY_LIMIT = 2000;
// 서비스 지도가 항목 하나에서 받는 상한(apps/admin/src/prd/apiMap.ts 지도상한)과 같다 — 폴링 · 대량 시도가 결과 줄을 덮지 않게
const API_CALLS_LIMIT = 200;
// 서비스 지도의 API 틀(apps/admin/src/prd/apiMap.ts API틀)과 같은 규칙 — 번호가 든 경로를 대량으로 불러도 상한이 다른 API 를 밀어내지 않게 틀로 접어 센다
const 틀칸 = (칸: string): string =>
  /^\d+$/.test(칸) ? ':n' : /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(칸) || /^[0-9a-f]{16,}$/i.test(칸) ? ':id' : 칸;

// 정본은 apps/admin/src/catalog/rules.ts 의 SECRET_NAMES 다. kit 은 admin 을 import 할 수 없어 같은 목록을 두고
// 갈라지지 않는지는 check:secret-names 가 본다. 'token' · 'secret' 이 access_token · refresh_token · client_secret 을 덮는다
const SECRET_NAMES = ['password', 'passwd', 'pw', 'token', 'secret', 'apikey', 'credential'];
// 네트워크에만 나오는 이름 — admin 의 trace 가림(execution/traceIngest.ts)과 같다
const 네트워크비밀 = /authori[sz]ation|session|cookie|api[_-]?key|access[_-]?key|private[_-]?key/i;
const 이름값 = /([A-Za-z_][\w.\-[\]]*)=([^&\s"']*)/g;
const 제이슨값 = /"([^"\\]+)"(\s*:\s*)("(?:[^"\\]|\\.)*"|[^,}\]\s]+)/g;
const 인증값 = /\b(Bearer|Basic)\s+[\w.~+/-]+=*/g;

const 비밀이름 = (이름: string): boolean =>
  SECRET_NAMES.some((word) => 이름.toLowerCase().includes(word)) || 네트워크비밀.test(이름);

function 글가린다(글: string, 비밀: ReadonlySet<string>): string {
  let 결과 = 글;
  // 글자 그대로를 먼저 — 이름 없이 본문 한가운데 되비친 토큰은 아래 무늬가 못 본다
  for (const 값 of 비밀) if (값 !== '') 결과 = 결과.split(값).join(가림);
  return 결과
    .replace(이름값, (원래, 이름: string) => (비밀이름(이름) ? `${이름}=${가림}` : 원래))
    .replace(제이슨값, (원래, 이름: string, 사이: string) => (비밀이름(이름) ? `"${이름}"${사이}"${가림}"` : 원래))
    .replace(인증값, (_원래, 꼴: string) => `${꼴} ${가림}`);
}

/** 절차 기록 · 오류 글에 남길 값. 비밀 이름 칸은 통째로, 글은 받은 토큰 · 비밀값 글자와 인증 머리 꼴을 가린다 */
export function 가린다(값: unknown, 비밀: ReadonlySet<string>): unknown {
  if (typeof 값 === 'string') return 글가린다(값, 비밀);
  if (Array.isArray(값)) return 값.map((v) => 가린다(v, 비밀));
  // 평범한 객체만 연다 — Buffer · 스트림을 열면 칸 번호 객체로 바뀐다
  if (typeof 값 === 'object' && 값 !== null && [Object.prototype, null].includes(Object.getPrototypeOf(값))) {
    return Object.fromEntries(Object.entries(값).map(([k, v]) => [k, 비밀이름(k) ? 가림 : 가린다(v, 비밀)]));
  }
  return 값;
}

export function recordHttpTrace(request: unknown, response: unknown): void {
  const scope = stepScope.getStore();
  // 절차 밖의 호출은 남길 자리가 없다. 검증이 아니라 기록이므로 조용히 버린다
  if (!scope) return;
  scope.httpTrace = { request, response };
}

type ApiCall = (url: string, options?: Record<string, unknown>) => Promise<APIResponse>;

/**
 * 게임 항목이 부른 대상 서버 API — android 는 trace 가 없어 이 줄로 서비스 지도의 케이스 줄을 채운다 (공통/3-공유계약 「게임 테스트 타입」).
 * 대상 서버 주소와 같은 곳만, 물음표 뒤 없이, (방식 · 경로 · 코드)마다 한 줄이다. 값 · 본문은 안 싣는다
 */
export function 부른API를적는다(method: string, url: string, status: number, base = process.env.PLATFORM_BASE_URL): void {
  const 모음 = runScope.getStore()?.apiCalls;
  if (모음 === undefined || base === undefined || base === '') return;
  let 주소: URL;
  try {
    주소 = new URL(url, base);
    if (주소.origin !== new URL(base).origin) return;
  } catch {
    return;
  }
  const 줄 = { method: method.toUpperCase(), path: 주소.pathname.split('/').map(틀칸).join('/'), status };
  if (모음.length >= API_CALLS_LIMIT || 모음.some((x) => x.method === 줄.method && x.path === 줄.path && x.status === 줄.status)) return;
  모음.push(줄);
}

async function traceResponse(
  method: string,
  url: string,
  options: Record<string, unknown> | undefined,
  response: APIResponse,
  비밀: ReadonlySet<string>,
  문서: unknown,
): Promise<void> {
  let 원문: string | undefined;
  let body: string;
  try {
    원문 = await response.text();
    // 가린 뒤에 자른다 — 먼저 자르면 잘린 자리에 걸친 비밀값 조각이 가림 무늬에 안 걸린다
    body = 글가린다(원문, 비밀).slice(0, TRACE_BODY_LIMIT);
  } catch (err) {
    body = `본문을 읽지 못했다: ${err instanceof Error ? err.message : String(err)}`;
  }
  const request = {
    method: method.toUpperCase(),
    url,
    ...(options?.headers === undefined ? {} : { headers: options.headers }),
    data: options?.data,
  };
  recordHttpTrace(가린다(request, 비밀), { status: response.status(), body });
  // fetch 는 메서드를 옵션에 싣는다
  const 메서드 = method === 'fetch' && typeof options?.method === 'string' ? options.method : method === 'fetch' ? 'GET' : method;
  부른API를적는다(메서드, url, response.status());
  // 모양은 자르기 전 본문으로 본다 — 절차 기록은 2000자에서 잘린다 (도메인/API §3.8 「응답 모양 확인」)
  const scope = stepScope.getStore();
  // 본문을 못 읽었으면 견줄 것이 없다 — 읽지 못한 것을 모양 실패로 적지 않는다
  if (scope === undefined || 문서 === undefined || 원문 === undefined) return;
  const 확인 = 모양확인(문서, 메서드, url, response.status(), 원문);
  // 문제 줄의 enum 밖 응답 값도 절차 기록과 같은 규칙으로 가린 뒤 싣는다
  if (확인 !== undefined) (scope.shapeChecks ??= []).push(가린다(확인, 비밀) as ShapeCheck);
}

/**
 * 요청마다 절차 기록을 남기는 요청 도구. 비밀 모음은 부르는 쪽이 쥐고 있다가 받은 토큰을 더한다 — 그 뒤 기록부터 가려진다.
 * 요청이 던진 오류도 가린다 — Playwright 는 실패한 요청의 머리(Authorization)를 오류 글에 싣는다.
 * 문서(케이스가 만들어진 판 원문)가 있으면 응답마다 모양을 견준다
 */
export function traced(request: APIRequestContext, 비밀: ReadonlySet<string>, 문서?: unknown): APIRequestContext {
  return new Proxy(request, {
    get(target, prop, receiver) {
      const original: unknown = Reflect.get(target, prop, receiver);
      if (typeof prop !== 'string' || !TRACED_METHODS.has(prop) || typeof original !== 'function') {
        return original;
      }
      const call = (original as ApiCall).bind(target);
      return async (url: string, options?: Record<string, unknown>): Promise<APIResponse> => {
        let response: APIResponse;
        try {
          response = await call(url, options);
        } catch (err) {
          if (err instanceof Error) {
            err.message = 글가린다(err.message, 비밀);
            if (err.stack !== undefined) err.stack = 글가린다(err.stack, 비밀);
          }
          throw err;
        }
        await traceResponse(prop, url, options, response, 비밀, 문서);
        return response;
      };
    },
  });
}

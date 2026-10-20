// 케이스 몸통의 api(이름) — 대상 서버 줄의 API 인증으로 토큰을 받아 Authorization: Bearer 로 붙인다 (SPEC 도메인/API §3.8 「API 인증」)
// 토큰은 항목(프로세스) 안에서만 쥔다. 실행 전체가 나눠 쓰려면 러너가 들어야 하고 그러면 만료 처리가 두 곳으로 갈린다

import type { APIRequestContext, APIResponse } from '@playwright/test';

import type { ApiAuth } from '../types.js';
import { 가린다 } from './http.js';

const 붙이는메서드 = new Set(['get', 'post', 'put', 'patch', 'delete', 'head', 'fetch']);
// 요청 도중에 만료되지 않게 여유를 둔다
const 다시받기여유ms = 30_000;

type ApiCall = (url: string, options?: Record<string, unknown>) => Promise<APIResponse>;

/** 러너가 PLATFORM_API_AUTHS 로 넘긴 인증 목록. 없으면 빈 목록 — 화면 케이스도 같은 길로 온다 */
export function 인증목록(값: string | undefined): ApiAuth[] {
  if (값 === undefined || 값 === '') return [];
  return JSON.parse(값) as ApiAuth[];
}

interface 받은토큰 {
  값: string;
  // 없으면 항목이 끝날 때까지 쓴다 — 응답에 expires_in 이 없었다
  만료?: number;
}

// RFC 6749 2.3.1 — 아이디 · 비밀값을 form 인코딩한 뒤 Basic 으로 싼다
const 기본인증 = (인증: ApiAuth): string =>
  `Basic ${Buffer.from(`${encodeURIComponent(인증.clientId)}:${encodeURIComponent(인증.clientSecret)}`).toString('base64')}`;

async function 토큰받기(인증: ApiAuth, 원래: APIRequestContext, 비밀: ReadonlySet<string>): Promise<받은토큰> {
  const 실패 = (까닭: string): Error => new Error(`API 인증 '${인증.name}' 토큰을 받지 못했습니다 — ${까닭}`);
  let res: APIResponse;
  try {
    // 상대 주소는 케이스의 요청과 같은 규칙으로 대상 서버 주소에 붙는다 (Playwright baseURL)
    res = await 원래.post(인증.tokenUrl, {
      form: { grant_type: 'client_credentials' },
      headers: { Authorization: 기본인증(인증) },
    });
  } catch (err) {
    // 첫 줄만 — 뒤 줄은 Playwright 가 보낸 머리(Basic 인증)를 늘어놓는다
    const 첫줄 = (err instanceof Error ? err.message : String(err)).split('\n')[0] ?? '';
    throw 실패(가린다(첫줄, 비밀) as string);
  }
  if (!res.ok()) throw 실패(String(res.status()));
  let 본문: unknown;
  try {
    본문 = await res.json();
  } catch {
    throw 실패('응답이 JSON 이 아닙니다');
  }
  const { access_token: 토큰, expires_in: 수명 } = (typeof 본문 === 'object' && 본문 !== null ? 본문 : {}) as Record<string, unknown>;
  if (typeof 토큰 !== 'string' || 토큰 === '') throw 실패('응답에 access_token 이 없습니다');
  return { 값: 토큰, ...(typeof 수명 === 'number' && { 만료: Date.now() + 수명 * 1000 }) };
}

/**
 * 몸통의 api 칸. 감싼 것은 절차 기록을 남기는 요청 도구, 원래 것은 토큰 받기에만 쓴다 — 토큰 요청이 그 절차의 기록을 덮지 않게.
 * 받은 토큰은 비밀 모음에 더해 그 뒤 기록 · 오류 글에서 가린다
 */
export function api만들기(
  인증들: readonly ApiAuth[],
  감싼: APIRequestContext,
  원래: APIRequestContext,
  비밀: Set<string>,
): (name: string) => APIRequestContext {
  const 받음 = new Map<string, 받은토큰>();

  const 토큰 = async (인증: ApiAuth): Promise<string> => {
    const 있음 = 받음.get(인증.name);
    if (있음 !== undefined && (있음.만료 === undefined || Date.now() < 있음.만료 - 다시받기여유ms)) return 있음.값;
    const 새것 = await 토큰받기(인증, 원래, 비밀);
    비밀.add(새것.값);
    받음.set(인증.name, 새것);
    return 새것.값;
  };

  return (name) => {
    const 인증 = 인증들.find((a) => a.name === name);
    if (인증 === undefined) throw new Error(`이 대상 서버에 API 인증 '${name}' 가 없습니다`);
    return new Proxy(감싼, {
      get(target, prop, receiver) {
        const original: unknown = Reflect.get(target, prop, receiver);
        if (typeof prop !== 'string' || !붙이는메서드.has(prop) || typeof original !== 'function') return original;
        return async (url: string, options?: Record<string, unknown>): Promise<APIResponse> => {
          const headers = { ...(options?.headers as Record<string, string> | undefined), Authorization: `Bearer ${await 토큰(인증)}` };
          return (original as ApiCall)(url, { ...options, headers });
        };
      },
    });
  };
}

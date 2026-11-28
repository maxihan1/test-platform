import type { AppLaunchIntent } from '@platform/kit/app';

import { 서버 } from './app.helper.js';

const 리디렉트 = 'urn:ietf:wg:oauth:2.0:oob';
const 범위 = 'read write follow push';
const 전체한도 = 15_000;

type 쿠키통 = Map<string, string>;
type OAuth앱 = { clientId: string; clientSecret: string };
type 받은토큰 = OAuth앱 & { token: string };

async function 부르기(통: 쿠키통, 경로: string, 끝: AbortSignal, 본문?: Record<string, string>): Promise<Response> {
  const res = await fetch(new URL(경로, `https://${서버}`), {
    method: 본문 === undefined ? 'GET' : 'POST',
    redirect: 'manual',
    headers: { cookie: [...통].map(([k, v]) => `${k}=${v}`).join('; ') },
    ...(본문 !== undefined && { body: new URLSearchParams(본문) }),
    signal: 끝,
  });
  for (const 줄 of res.headers.getSetCookie()) {
    const [kv = ''] = 줄.split(';');
    const 칸 = kv.indexOf('=');
    if (칸 > 0) 통.set(kv.slice(0, 칸), kv.slice(칸 + 1));
  }
  return res;
}

async function json읽기<T>(res: Response, 단계: string): Promise<T> {
  if (!res.ok) throw new Error(`${단계} 실패 — HTTP ${String(res.status)}`);
  try {
    return (await res.json()) as T;
  } catch {
    throw new Error(`${단계} 응답이 JSON 이 아니다 — HTTP ${String(res.status)}`);
  }
}

function 숨은칸(폼: string): Record<string, string> {
  const 칸: Record<string, string> = {};
  for (const [태그] of 폼.matchAll(/<input[^>]*type="hidden"[^>]*>/g)) {
    const 이름 = /name="([^"]+)"/.exec(태그)?.[1];
    if (이름 !== undefined) 칸[이름] = (/value="([^"]*)"/.exec(태그)?.[1] ?? '').replace(/&amp;/g, '&');
  }
  return 칸;
}

function 코드(주소: string | null): string {
  const 값 = 주소 === null ? null : new URL(주소, `https://${서버}`).searchParams.get('code');
  if (!값) throw new Error(`승인 뒤 code 가 오지 않았다 — 이동한 주소: ${주소?.replace(/\?.*/, '') ?? '없음'}`);
  return 값;
}

let 앱등록: Promise<OAuth앱> | undefined;
const 토큰들 = new Map<string, Promise<받은토큰>>();

async function 앱등록하기(끝: AbortSignal): Promise<OAuth앱> {
  const 앱 = await json읽기<{ client_id?: string; client_secret?: string }>(
    await 부르기(new Map(), '/api/v1/apps', 끝, { client_name: 'QA login inject', redirect_uris: 리디렉트, scopes: 범위 }),
    'OAuth 앱 등록',
  );
  if (!앱.client_id || !앱.client_secret) throw new Error('OAuth 앱 등록 응답에 client_id 가 없다');
  return { clientId: 앱.client_id, clientSecret: 앱.client_secret };
}

async function 새토큰(아이디: string, 암호: string): Promise<받은토큰> {
  const 끝 = AbortSignal.timeout(전체한도);
  앱등록 ??= 앱등록하기(끝).catch((err: unknown) => {
    앱등록 = undefined;
    throw err;
  });
  const 앱 = await 앱등록;
  const 통: 쿠키통 = new Map();
  const 로그인화면 = await (await 부르기(통, '/auth/sign_in', 끝)).text();
  const csrf = /name="authenticity_token" value="([^"]+)"/.exec(로그인화면)?.[1];
  if (csrf === undefined) throw new Error('웹 로그인 화면에서 authenticity_token 을 못 찾았다');
  const 로그인 = await 부르기(통, '/auth/sign_in', 끝, { authenticity_token: csrf, 'user[email]': 아이디, 'user[password]': 암호 });
  const 간곳 = 로그인.headers.get('location') ?? '';
  if (로그인.status !== 302 || new URL(간곳, `https://${서버}`).pathname.startsWith('/auth')) {
    throw new Error(`웹 로그인이 안 됐다 — HTTP ${String(로그인.status)}${간곳 === '' ? '' : ` → ${new URL(간곳, `https://${서버}`).pathname}`}`);
  }
  const 물음 = new URLSearchParams({ response_type: 'code', client_id: 앱.clientId, redirect_uri: 리디렉트, scope: 범위 });
  const 승인화면 = await 부르기(통, `/oauth/authorize?${물음.toString()}`, 끝);
  const 승인글 = 승인화면.status === 200 ? await 승인화면.text() : '';
  let 주소 = 승인화면.headers.get('location');
  if (승인화면.status === 200) {
    const 폼 = [...승인글.matchAll(/<form[\s\S]*?<\/form>/g)].map(([f]) => f).find((f) => !f.includes('name="_method"'));
    if (폼 === undefined) throw new Error('승인 화면에서 승인 폼을 못 찾았다');
    주소 = (await 부르기(통, '/oauth/authorize', 끝, 숨은칸(폼))).headers.get('location');
  }
  const 토큰 = await json읽기<{ access_token?: string }>(
    await 부르기(통, '/oauth/token', 끝, {
      grant_type: 'authorization_code',
      code: 코드(주소),
      client_id: 앱.clientId,
      client_secret: 앱.clientSecret,
      redirect_uri: 리디렉트,
      scope: 범위,
    }),
    '토큰 받기',
  );
  if (!토큰.access_token) throw new Error('토큰 받기 응답에 access_token 이 없다');
  const 로그아웃키 = /name="csrf-token" content="([^"]+)"/.exec(승인글)?.[1];
  if (로그아웃키 !== undefined) {
    await 부르기(통, '/auth/sign_out', 끝, { _method: 'delete', authenticity_token: 로그아웃키 }).catch(() => undefined);
  }
  return { ...앱, token: 토큰.access_token };
}

export function 토큰버리기(아이디: string, 암호: string): void {
  토큰들.delete(`${아이디}\n${암호}`);
}

async function 토큰살아있나(토큰: string): Promise<boolean> {
  const res = await fetch(new URL('/api/v1/accounts/verify_credentials', `https://${서버}`), {
    headers: { authorization: `Bearer ${토큰}` },
    signal: AbortSignal.timeout(전체한도),
  });
  return res.status !== 401 && res.status !== 403;
}

export async function 살아있는토큰받기(아이디: string, 암호: string): Promise<받은토큰> {
  const 받음 = await 토큰받기(아이디, 암호);
  if (await 토큰살아있나(받음.token)) return 받음;
  토큰버리기(아이디, 암호);
  return 토큰받기(아이디, 암호);
}

export function 토큰받기(아이디: string, 암호: string): Promise<받은토큰> {
  const 열쇠 = `${아이디}\n${암호}`;
  const 있음 = 토큰들.get(열쇠);
  if (있음 !== undefined) return 있음;
  const 받음 = 새토큰(아이디, 암호).catch((err: unknown) => {
    토큰들.delete(열쇠);
    throw err;
  });
  토큰들.set(열쇠, 받음);
  return 받음;
}

export function 로그인된채켜기<칸 extends string>(아이디칸: 칸, 암호칸: 칸): (params: Partial<Record<칸, string>>) => Promise<AppLaunchIntent> {
  return async (params) => {
    const 아이디 = params[아이디칸];
    const 암호 = params[암호칸];
    if (!아이디 || !암호) throw new Error(`${아이디칸} · ${암호칸} 값이 비어 로그인된 채로 켜지 않는다`);
    const 받음 = await 살아있는토큰받기(아이디, 암호);
    return { activity: '.QaLoginActivity', extras: { server: 서버, token: 받음.token, clientId: 받음.clientId, clientSecret: 받음.clientSecret } };
  };
}

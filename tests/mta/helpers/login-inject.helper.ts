import type { AppLaunchIntent } from '@platform/kit/app';

import { 서버 } from './app.helper.js';

const 리디렉트 = 'urn:ietf:wg:oauth:2.0:oob';
const 범위 = 'read write follow push';
const 한도 = 10_000;

type 쿠키통 = Map<string, string>;

async function 부르기(통: 쿠키통, 경로: string, 본문?: Record<string, string>): Promise<Response> {
  const res = await fetch(new URL(경로, `https://${서버}`), {
    method: 본문 === undefined ? 'GET' : 'POST',
    redirect: 'manual',
    headers: { cookie: [...통].map(([k, v]) => `${k}=${v}`).join('; ') },
    ...(본문 !== undefined && { body: new URLSearchParams(본문) }),
    signal: AbortSignal.timeout(한도),
  });
  for (const 줄 of res.headers.getSetCookie()) {
    const [kv = ''] = 줄.split(';');
    const 칸 = kv.indexOf('=');
    if (칸 > 0) 통.set(kv.slice(0, 칸), kv.slice(칸 + 1));
  }
  return res;
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

export async function 토큰받기(아이디: string, 암호: string): Promise<{ token: string; clientId: string; clientSecret: string }> {
  const 통: 쿠키통 = new Map();
  const 앱 = (await (await 부르기(통, '/api/v1/apps', { client_name: 'QA login inject', redirect_uris: 리디렉트, scopes: 범위 })).json()) as { client_id?: string; client_secret?: string };
  if (!앱.client_id || !앱.client_secret) throw new Error('OAuth 앱을 등록하지 못했다');
  const 로그인화면 = await (await 부르기(통, '/auth/sign_in')).text();
  const csrf = /name="authenticity_token" value="([^"]+)"/.exec(로그인화면)?.[1];
  if (csrf === undefined) throw new Error('웹 로그인 화면에서 authenticity_token 을 못 찾았다');
  const 로그인 = await 부르기(통, '/auth/sign_in', { authenticity_token: csrf, 'user[email]': 아이디, 'user[password]': 암호 });
  if (로그인.status !== 302) throw new Error(`웹 로그인이 안 됐다 — HTTP ${String(로그인.status)}`);
  const 물음 = new URLSearchParams({ response_type: 'code', client_id: 앱.client_id, redirect_uri: 리디렉트, scope: 범위 });
  const 승인화면 = await 부르기(통, `/oauth/authorize?${물음.toString()}`);
  let 주소 = 승인화면.headers.get('location');
  if (승인화면.status === 200) {
    const 폼 = [...(await 승인화면.text()).matchAll(/<form[\s\S]*?<\/form>/g)].map(([f]) => f).find((f) => !f.includes('name="_method"'));
    if (폼 === undefined) throw new Error('승인 화면에서 승인 폼을 못 찾았다');
    주소 = (await 부르기(통, '/oauth/authorize', 숨은칸(폼))).headers.get('location');
  }
  const 토큰 = (await (
    await 부르기(통, '/oauth/token', {
      grant_type: 'authorization_code',
      code: 코드(주소),
      client_id: 앱.client_id,
      client_secret: 앱.client_secret,
      redirect_uri: 리디렉트,
      scope: 범위,
    })
  ).json()) as { access_token?: string; error?: string };
  if (!토큰.access_token) throw new Error(`토큰을 받지 못했다 — ${토큰.error ?? '응답에 access_token 이 없다'}`);
  return { token: 토큰.access_token, clientId: 앱.client_id, clientSecret: 앱.client_secret };
}

export function 로그인된채켜기<칸 extends string>(아이디칸: 칸, 암호칸: 칸): (params: Partial<Record<칸, string>>) => Promise<AppLaunchIntent> {
  return async (params) => {
    const 아이디 = params[아이디칸];
    const 암호 = params[암호칸];
    if (!아이디 || !암호) throw new Error(`${아이디칸} · ${암호칸} 값이 비어 로그인된 채로 켜지 않는다`);
    const 받음 = await 토큰받기(아이디, 암호);
    return { activity: '.QaLoginActivity', extras: { server: 서버, token: 받음.token, clientId: 받음.clientId, clientSecret: 받음.clientSecret } };
  };
}

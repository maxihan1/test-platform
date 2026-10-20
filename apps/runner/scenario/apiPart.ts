// E2E 의 API 호출 단계 하나 — API 인증 토큰을 붙이고, 앞 단계 값을 주소 · 본문에 넣고, 응답 값을 확인한다 (SPEC 도메인/시나리오 §3.7 결정 14)
// 토큰 받기는 kit 의 api(이름)와 같은 규칙이다. 고정 spec 은 kit 을 값으로 못 불러(parts.ts 머리) 여기 따로 둔다

import { isDeepStrictEqual } from 'node:util';

import type { ApiAuth, ScenarioExecuteRequest } from '@platform/kit';

import { 값꺼냄, 값찾기, 요청주소, 적기, 주소, type 이음 } from './links.js';
import type { 창 } from './parts.js';

export type ApiPart = Extract<ScenarioExecuteRequest['parts'][number], { kind: 'api' }>;

// 시나리오 하나 안에서 단계 주소 · 이름마다 받은 토큰 — 같은 인증을 쓰는 단계끼리 나눠 쓴다
export type 토큰모음 = Map<string, { 값: string; 만료?: number }>;

// 요청 도중에 만료되지 않게 여유를 둔다 — kit 과 같다 (도메인/API §3.8 「API 인증」)
const 다시받기여유ms = 30_000;
const 보일글자 = 50;

export interface 단계결과 {
  error?: string;
  bound?: Record<string, unknown>;
}

// Playwright 오류 글의 호출 기록(Call log)이 보낸 머리(Bearer · Basic)를 늘어놓는다. 받은 토큰 · 비밀값 · Basic 머리를 다 가린다
function 가림(글: string, 비밀: ReadonlySet<string>): string {
  let 결과 = 글;
  for (const 값 of 비밀) if (값 !== '') 결과 = 결과.split(값).join('********');
  return 결과;
}

async function 토큰받기(지금창: 창, 모음: 토큰모음, 인증: ApiAuth, 기준: string, 비밀: Set<string>): Promise<string> {
  const 열쇠 = `${기준} ${인증.name}`;
  const 있음 = 모음.get(열쇠);
  if (있음 !== undefined && (있음.만료 === undefined || Date.now() < 있음.만료 - 다시받기여유ms)) return 있음.값;

  const 실패 = (까닭: string) => new Error(`API 인증 '${인증.name}' 토큰을 받지 못했습니다 — ${까닭}`);
  // RFC 6749 4.4 — 원문 그대로 싼다. 까닭은 kit apiAuth.ts 기본인증
  const basic = Buffer.from(`${인증.clientId}:${인증.clientSecret}`).toString('base64');
  비밀.add(basic);
  let res: Awaited<ReturnType<창['fetch']>>;
  try {
    // 상대 주소는 케이스 요청과 같은 Playwright baseURL 규칙으로 단계 주소에 붙는다 (도메인/API §3.8)
    res = await 지금창.fetch(요청주소(인증.tokenUrl, 기준), {
      method: 'POST',
      form: { grant_type: 'client_credentials' },
      headers: { Authorization: `Basic ${basic}` },
    });
  } catch (err) {
    throw 실패(가림((err instanceof Error ? err.message : String(err)).split('\n')[0] ?? '', 비밀));
  }
  if (res.status() < 200 || res.status() > 299) throw 실패(String(res.status()));
  const 글 = await res.text();
  const 본문 = 값꺼냄(글, 'access_token');
  if (!본문.ok || typeof 본문.value !== 'string' || 본문.value === '') throw 실패('응답에 access_token 이 없습니다');
  const 수명 = 값꺼냄(글, 'expires_in');
  // 글자로 주는 서버도 있다('3600')
  const 초 = 수명.ok && (typeof 수명.value === 'number' || (typeof 수명.value === 'string' && 수명.value !== '')) ? Number(수명.value) : NaN;
  비밀.add(본문.value);
  모음.set(열쇠, { 값: 본문.value, ...(Number.isFinite(초) && { 만료: Date.now() + 초 * 1000 }) });
  return 본문.value;
}

// 글자 안의 {이름} 을 값 글자로 바꾼다. 글자 전체가 {이름} 하나면 값을 형 그대로 넣는다 — 숫자 칸에 숫자가 가게
function 본문에넣기(값: unknown, 넣을: Readonly<Record<string, unknown>>): unknown {
  if (typeof 값 === 'string') {
    for (const [이름, v] of Object.entries(넣을)) {
      if (값 === `{${이름}}`) return v;
    }
    let 글 = 값;
    for (const [이름, v] of Object.entries(넣을)) 글 = 글.split(`{${이름}}`).join(typeof v === 'string' ? v : JSON.stringify(v));
    return 글;
  }
  if (Array.isArray(값)) return 값.map((x) => 본문에넣기(x, 넣을));
  if (typeof 값 === 'object' && 값 !== null) return Object.fromEntries(Object.entries(값).map(([k, x]) => [k, 본문에넣기(x, 넣을)]));
  return 값;
}

const 보임 = (v: unknown): string => {
  const 글 = typeof v === 'string' ? v : JSON.stringify(v) ?? String(v);
  return 글.length > 보일글자 ? `${글.slice(0, 보일글자)}…` : 글;
};

/** API 호출 단계 하나를 부른다. 실패면 error 에 사람 말 한 줄 — 던지지 않는다 */
export async function API단계(
  지금창: 창,
  이음값: 이음,
  part: ApiPart,
  seq: number,
  기준: string,
  모음: 토큰모음,
): Promise<단계결과> {
  const 비밀 = new Set((part.apiAuths ?? []).map((a) => a.clientSecret));
  const 넣을: Record<string, unknown> = {};
  for (const v of part.values ?? []) {
    const 값 = await 값찾기(이음값, v.value);
    if ('사유' in 값) return { error: 값.사유 };
    넣을[v.name] = 값.value;
  }
  const bound = part.values === undefined || part.values.length === 0 ? undefined : { ...넣을 };
  const 끝 = (error?: string): 단계결과 => ({ ...(error === undefined ? {} : { error: 가림(error, 비밀) }), ...(bound === undefined ? {} : { bound }) });

  let 경로 = part.path;
  for (const v of part.values ?? []) {
    if (!경로.includes(`{${v.name}}`)) continue;
    const 글자 = typeof 넣을[v.name] === 'string' ? (넣을[v.name] as string) : JSON.stringify(넣을[v.name]);
    // 빈 글자 · . · .. 는 모음 주소나 상위로 풀린다 — 바꿔 보내기와 같은 규칙 (결정 12 「값 꺼내기」)
    if (글자 === '' || 글자 === '.' || 글자 === '..') {
      return 끝(`${v.value.fromSeq}번 단계 응답의 ${v.value.jsonPath} 값 「${글자}」 은 주소에 넣을 수 없다`);
    }
    경로 = 경로.split(`{${v.name}}`).join(encodeURIComponent(글자));
  }

  try {
    const headers: Record<string, string> = {};
    if (part.auth !== undefined) {
      const 인증 = (part.apiAuths ?? []).find((a) => a.name === part.auth);
      if (인증 === undefined) return 끝(`이 대상 서버에 API 인증 '${part.auth}' 가 없습니다`);
      headers.Authorization = `Bearer ${await 토큰받기(지금창, 모음, 인증, 기준, 비밀)}`;
    }
    const url = 주소(기준, 경로);
    const res = await 지금창.fetch(url, {
      method: part.method,
      ...(part.body === undefined ? {} : { data: 본문에넣기(part.body, 넣을) }),
      ...(Object.keys(headers).length === 0 ? {} : { headers }),
    });
    // 뒤 단계의 값 주입이 이 응답을 가리키면 자리를 잡는다. 창이 닫히기 전에 다 읽는다
    적기(이음값, seq, part.method, url, async () => ({ status: res.status(), contentType: res.headers()['content-type'] ?? '', body: await res.text() }));
    await Promise.all(이음값.응답.values());

    if (res.status() !== part.expectStatus) return 끝(`응답 코드 ${res.status()} — 기대 ${part.expectStatus}`);
    if (part.expectJson === undefined || part.expectJson.length === 0) return 끝();
    const 본문 = await res.text();
    for (const c of part.expectJson) {
      const 받음 = 값꺼냄(본문, c.jsonPath);
      if (받음.ok && isDeepStrictEqual(받음.value, c.equals)) continue;
      return 끝(`응답 값이 다릅니다 — ${c.jsonPath} (기대 ${보임(c.equals)} · 받은 값 ${받음.ok ? 보임(받음.value) : '없음'})`);
    }
    return 끝();
  } catch (err) {
    // 스택은 버린다 — 오류 글과 같은 호출 기록이 들어 있다
    return 끝((err instanceof Error ? err.message : String(err)).split('\n')[0] ?? '');
  }
}

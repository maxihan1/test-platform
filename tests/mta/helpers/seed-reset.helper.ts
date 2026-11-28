import { 서버 } from './app.helper.js';
import { 토큰받기 } from './login-inject.helper.js';

export const 시드기준시각 = '2026-11-19T00:00:00Z';

type 계정 = { 아이디: string; 암호: string };
type 글 = { id: string; created_at: string; reblog: { id: string } | null };

async function 부르기(토큰: string, 방법: 'GET' | 'POST' | 'DELETE', 경로: string): Promise<Response> {
  const res = await fetch(new URL(경로, `https://${서버}`), {
    method: 방법,
    headers: { authorization: `Bearer ${토큰}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok && res.status !== 404) throw new Error(`${방법} ${경로.replace(/\?.*/, '')} 실패 — HTTP ${String(res.status)}`);
  return res;
}

async function 최근글들(토큰: string, 계정id: string, 기준: string): Promise<글[]> {
  const 모음: 글[] = [];
  let 앞 = '';
  for (let 쪽 = 0; 쪽 < 10; 쪽++) {
    const res = await 부르기(토큰, 'GET', `/api/v1/accounts/${계정id}/statuses?limit=40${앞}`);
    const 묶음 = (await res.json()) as 글[];
    const 새것 = 묶음.filter((x) => x.created_at >= 기준);
    모음.push(...새것);
    if (묶음.length === 0 || 새것.length < 묶음.length) break;
    앞 = `&max_id=${묶음[묶음.length - 1]!.id}`;
  }
  return 모음;
}

export async function 시드로비우기(계정들: 계정[], 기준 = 시드기준시각): Promise<number> {
  let 지운수 = 0;
  for (const { 아이디, 암호 } of 계정들) {
    const { token } = await 토큰받기(아이디, 암호);
    const 나 = (await (await 부르기(token, 'GET', '/api/v1/accounts/verify_credentials')).json()) as { id: string };
    for (const x of await 최근글들(token, 나.id, 기준)) {
      if (x.reblog) await 부르기(token, 'POST', `/api/v1/statuses/${x.reblog.id}/unreblog`);
      else await 부르기(token, 'DELETE', `/api/v1/statuses/${x.id}`);
      지운수++;
    }
  }
  return 지운수;
}

function 환경계정(역할: string): 계정 {
  const 줄 = (JSON.parse(process.env.PLATFORM_ACCOUNTS ?? '[]') as { role?: string; loginId?: string; loginPassword?: string }[]).find(
    (a) => a.role === 역할,
  );
  if (!줄?.loginId || !줄.loginPassword) throw new Error(`「${역할}」 계정 값이 없다 — 대상 서버 계정(PLATFORM_ACCOUNTS)이 채워지지 않았다`);
  return { 아이디: 줄.loginId, 암호: 줄.loginPassword };
}

if (process.argv[1]?.endsWith('seed-reset.helper.ts') === true) {
  const 기준 = process.argv[2] ?? 시드기준시각;
  시드로비우기([환경계정('일반 회원'), 환경계정('두 번째 사용자')], 기준).then(
    (수) => console.log(`[시드로비우기] ${기준} 뒤에 쓴 글 · 부스트 ${String(수)}개를 지웠다`),
    (err: unknown) => {
      console.error(`[시드로비우기] 실패 — ${err instanceof Error ? err.message : String(err)}`);
      process.exitCode = 1;
    },
  );
}

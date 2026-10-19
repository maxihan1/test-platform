// 작성 에이전트가 AI 를 띄우기 전에 부르는 통로 — 폰 옆 러너(LOCAL_RUNNER_URL)에서 앱 첫 화면을 읽어 온다 (도메인/작성 §7 「앱 화면 통로」)
// AI 는 러너에 닿지 않는다. 읽는 것은 에이전트이고 이 라우트가 중계한다

import type { FastifyInstance } from 'fastify';

import { 폰을놓는다, 폰을바로잡는다 } from '../execution/phone.js';
import { 켜진내컴퓨터러너 } from '../execution/runner.js';
import { 도는집은요청 } from '../prd/agentRoutes.js';

import { 대상줄들읽기 } from './reverse.js';

export type 앱화면답 = { screen: string | null; reason: string | null };

// 러너의 연결 열기 60초 + 화면 받기 30초 + 닫기 10초에 여유를 더한다
// 에이전트의 기다림(130초)이 이보다 길어야 러너가 폰을 읽는 중에 에이전트가 먼저 끊지 않는다
const 러너_기다림_ms = 110_000;
const 까닭_상한 = 200;

const 짧게 = (글: string): string => (글.length > 까닭_상한 ? `${글.slice(0, 까닭_상한)}…` : 글);

/**
 * 러너에 화면을 부탁한다. 읽지 못하면 까닭을 돌려줄 뿐 던지지 않는다 — 작성은 화면 없이도 간다.
 * 앱 파일 경로가 없으면 앱이 없는 서비스다 — 까닭도 없이 비운다.
 * admin 의 폰 잠금(정식 실행의 디바이스 줄)을 쥐고 읽는다 — 안 쥐면 도는 android 실행의 연결을 가로챈다. 기다리지 않고 바쁘면 까닭만 돌려준다
 */
export async function 앱화면읽기(appPath: string | null, 러너: string | undefined, 부르기: typeof fetch = fetch): Promise<앱화면답> {
  if (appPath === null) return { screen: null, reason: null };
  if (러너 === undefined) return { screen: null, reason: '내 컴퓨터 러너(LOCAL_RUNNER_URL)가 꺼져 있다' };
  if (!폰을바로잡는다()) return { screen: null, reason: '폰이 다른 실행에 쓰이는 중이다' };
  try {
    const res = await 부르기(`${러너}/app-screen`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ app: appPath }),
      signal: AbortSignal.timeout(러너_기다림_ms),
    });
    const 몸 = (await res.json().catch(() => null)) as { screen?: unknown; error?: unknown; detail?: unknown } | null;
    if (res.ok && typeof 몸?.screen === 'string') return { screen: 몸.screen, reason: null };
    if (res.status === 409) return { screen: null, reason: '폰이 다른 실행에 쓰이는 중이다' };
    const 말 = typeof 몸?.detail === 'string' ? 몸.detail : typeof 몸?.error === 'string' ? 몸.error : `HTTP ${res.status}`;
    return { screen: null, reason: `러너가 화면을 못 읽었다: ${짧게(말)}` };
  } catch (err) {
    return { screen: null, reason: `러너에 닿지 못했다: ${짧게(err instanceof Error ? err.name : '알 수 없는 오류')}` };
  } finally {
    폰을놓는다();
  }
}

/** 요청에 대상 서버가 있으면 그 줄의 앱 파일 경로, 없으면 앱 파일 경로가 있는 첫 줄(env 순). 「운영 서버」 줄은 어느 쪽이든 건너뛴다 (§3.6 「★ 역할별 계정」 「운영 서버」) */
export function 앱파일고르기(줄들: { env: string; appPath: string | null; isProd: boolean }[], env: string | null): string | null {
  const 줄 = 줄들.filter((j) => !j.isProd).find((j) => (env === null ? j.appPath !== null : j.env === env));
  return 줄?.appPath ?? null;
}

export default async function appScreenAgentRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { id: string } }>('/authoring/requests/:id/app-screen', async (req, reply) => {
    const 행 = await 도는집은요청(req, reply);
    if (행 === null) return reply;
    const appPath = 앱파일고르기(await 대상줄들읽기(행.serviceId), 행.env);
    return 앱화면읽기(appPath, appPath === null ? undefined : await 켜진내컴퓨터러너());
  });
}

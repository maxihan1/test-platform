// 작성 에이전트가 AI 를 띄우기 전에 부르는 통로 — 서버 러너가 디바이스 팜의 폰에서 앱 · 게임 첫 화면을 읽어 온다 (도메인/작성 §7 「앱 화면 통로」 · 도메인/게임 §7 「게임 첫 화면」)
// AI 는 러너에 닿지 않는다. 읽는 것은 에이전트이고 이 라우트가 중계한다

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

import { 깔앱파일 } from '../execution/buildFile.js';
import { 거를패키지, 팜주소, 팜폰으로 } from '../execution/farm.js';
import { 서버팜토큰 } from '../execution/farmToken.js';
import { 폰을놓는다, 폰을바로잡는다 } from '../execution/phone.js';
import { runnerUrl, 러너머리 } from '../execution/runnerAddr.js';
import { 도는집은요청 } from '../prd/agentRoutes.js';
import { 게임서비스인가 } from '../prd/gameMap.js';

import { 대상줄들읽기, 앱줄고르기 } from './reverse.js';

export type 앱화면답 = { screen: string | null; reason: string | null };
/**
 * 작성 AI 가 appium-cli 로 폰을 눌러 가며 읽을 때 붙을 팜 Appium 주소와 앱 파일 — 첫 화면을 못 읽었어도 준다 (§3.6 「앱 화면」 「눌러 가며 읽기」).
 * token 은 첫 화면의 폰을 잡은 서버 몫 대신 PAT 다. 에이전트가 자식의 PLATFORM_APPIUM_TOKEN 으로 넘긴다 (§7 「앱 화면 통로」 appium.token)
 */
export type 앱탐색 = { url: string; app: string; token?: string };

/** 팜에서 폰을 잡아 그 번호로 일을 맡기고 놓는다 — 라우트는 팜폰으로, 검사는 가짜를 넘긴다 */
export type 폰잡기 = (일: (udid: string) => Promise<앱화면답>, 못잡음: (까닭: string) => 앱화면답) => Promise<앱화면답>;

/** 러너의 어느 통로를 얼마나 기다리나. 에이전트의 기다림이 이보다 길어야 러너가 폰을 읽는 중에 에이전트가 먼저 끊지 않는다 —
 * 앞뒤의 팜 잡기 · 놓기(farm.ts — 정리 중 기다림 20초 · 부를 때마다 10초)를 더해도 남게 잡았다 */
export type 읽을곳 = { 길: '/app-screen' | '/game-screen'; 기다림_ms: number };
// 러너의 연결 열기 60초 + 화면 받기 30초 + 닫기 10초에 여유를 더한다 (에이전트 180초)
export const 앱길: 읽을곳 = { 길: '/app-screen', 기다림_ms: 110_000 };
// 열기 60초 + 게임이 답하기까지 120초(kit openGame — 마지막 ping 이 20초 더 넘길 수 있다) + 트리 20초 + 닫기 10초에 여유를 더한다 (에이전트 360초).
// 먼저 끊으면 아래 finally 가 팜 폰을 놓는데 러너는 아직 그 폰에서 읽고 있다
export const 게임길: 읽을곳 = { 길: '/game-screen', 기다림_ms: 260_000 };
const 까닭_상한 = 200;

const 짧게 = (글: string): string => (글.length > 까닭_상한 ? `${글.slice(0, 까닭_상한)}…` : 글);

/**
 * 러너에 화면을 부탁한다. 읽지 못하면 까닭을 돌려줄 뿐 던지지 않는다 — 작성은 화면 없이도 간다.
 * 앱 파일 경로가 없으면 앱이 없는 서비스다 — 까닭도 없이 비운다.
 * admin 의 폰 잠금(정식 실행의 디바이스 줄)을 쥐고 읽는다 — 안 쥐면 도는 android 실행의 연결을 가로챈다. 기다리지 않고 바쁘면 까닭만 돌려준다.
 * 팜 폰은 잠금 안에서 잡고 놓는다 — 정식 실행과 같은 길이다 (러너 §5.2 「디바이스 팜 접속 방식」).
 * 토큰은 폰을 잡은 팜 토큰이다. 러너가 연결을 열고 닫을 때 같은 주인이어야 팜이 받는다 (러너 §5.2 「팜 토큰은 누른 사람 것이 먼저다」)
 */
export async function 앱화면읽기(
  appPath: string | null,
  러너: string,
  잡기: 폰잡기 | undefined,
  부르기: typeof fetch = fetch,
  곳: 읽을곳 = 앱길,
  토큰?: string,
): Promise<앱화면답> {
  if (appPath === null) return { screen: null, reason: null };
  if (잡기 === undefined) return { screen: null, reason: 'Device VISION(DEVICE_FARM_URL)이 연결되어 있지 않다' };
  if (!폰을바로잡는다()) return { screen: null, reason: '폰이 다른 실행에 쓰이는 중이다' };
  try {
    return await 잡기((udid) => 러너에묻는다(appPath, udid, 러너, 부르기, 곳, 토큰), (까닭) => ({ screen: null, reason: 까닭 }));
  } finally {
    폰을놓는다();
  }
}

async function 러너에묻는다(appPath: string, udid: string, 러너: string, 부르기: typeof fetch, 곳: 읽을곳, 토큰: string | undefined): Promise<앱화면답> {
  try {
    const res = await 부르기(`${러너}${곳.길}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...러너머리() },
      body: JSON.stringify({ app: appPath, udid, ...(토큰 !== undefined && { farmToken: 토큰 }) }),
      signal: AbortSignal.timeout(곳.기다림_ms),
    });
    const 몸 = (await res.json().catch(() => null)) as { screen?: unknown; error?: unknown; detail?: unknown } | null;
    if (res.ok && typeof 몸?.screen === 'string') return { screen: 몸.screen, reason: null };
    if (res.status === 409) return { screen: null, reason: '폰이 다른 실행에 쓰이는 중이다' };
    const 말 = typeof 몸?.detail === 'string' ? 몸.detail : typeof 몸?.error === 'string' ? 몸.error : `HTTP ${res.status}`;
    return { screen: null, reason: `러너가 화면을 못 읽었다: ${짧게(말)}` };
  } catch (err) {
    return { screen: null, reason: `러너에 닿지 못했다: ${짧게(err instanceof Error ? err.name : '알 수 없는 오류')}` };
  }
}

/**
 * 앱이 있고 팜이 붙었을 때만. 팜 주소는 admin 이 보는 주소 그대로다 — 작성 컨테이너도 같은 이름으로 닿는다(docker-compose author extra_hosts).
 * DEVICE_FARM_URL 은 `/wd/hub` 가 붙은 꼴로 안내한다(SETUP 「디바이스 팜」) — 붙었든 안 붙었든 한 번만 붙인다
 */
export function 앱탐색주소(appPath: string | null, 팜: string | undefined, 토큰?: string): 앱탐색 | null {
  return appPath === null || 팜 === undefined ? null : { url: `${팜.replace(/\/wd\/hub$/, '')}/wd/hub`, app: appPath, ...(토큰 !== undefined && { token: 토큰 }) };
}


const 비움 = { screen: null, reason: null };

/**
 * 작성 에이전트에 줄 앱 — app-screen 과 app-link 가 같은 줄 · 같은 규칙으로 고른다. 줄은 집기 계정 · 대상 서버와 같은 규칙(앱줄고르기)이고
 * 그 줄의 최신 빌드가 앱 파일 경로보다 앞선다 (도메인/실행 §3.11)
 */
async function 작성앱파일(행: { serviceId: number; env: string | null }, 고정?: number): Promise<string | null> {
  const 줄 = 앱줄고르기(await 대상줄들읽기(행.serviceId), 행.env);
  return 줄 === undefined ? null : 깔앱파일(행.serviceId, 줄.env, 줄.appPath, 고정);
}

export default async function appScreenAgentRoutes(app: FastifyInstance): Promise<void> {
  // 게임은 앱 화면을 안 읽는다 — Unity 화면은 Appium 에게 빈 판 하나다. 게임 첫 화면은 아래 game-screen 이 준다 (도메인/게임 §3.10 「작성 — 한 바퀴」 앱 규칙과 다른 곳)
  const 읽어준다 = (게임만: boolean, 곳: 읽을곳, 칸: 'appium' | 'game') => async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const 행 = await 도는집은요청(req, reply);
    if (행 === null) return reply;
    if ((await 게임서비스인가(행.serviceId)) !== 게임만) return { ...비움, [칸]: null };
    const appPath = await 작성앱파일(행);
    // 게임은 앱 파일이 없으면 켤 게임이 없다 — 앱처럼 「앱 없는 서비스」로 비우면 AI 가 까닭을 모른다
    if (게임만 && appPath === null) return { screen: null, reason: '대상 서버 줄에 게임 앱 파일 경로가 없다', game: null };
    const 팜 = 팜주소();
    // 작성 AI 는 서버 몫이다. 한 번 고른 토큰으로 폰을 잡고 러너가 붙고, AI 가 눌러 가며 읽을 때도 같은 주인으로 붙게 넘긴다 (러너 §5.2 「팜 토큰은 누른 사람 것이 먼저다」)
    const 토큰 = 팜 === undefined || appPath === null ? undefined : await 서버팜토큰();
    // 스토어 앱(패키지 이름)이면 그 앱이 깔린 폰만 잡는다 — 깔지 않고 켜서다 (러너 §5.2 「플레이스토어 앱 — 패키지 이름」)
    const 잡기: 폰잡기 | undefined = 팜 === undefined ? undefined : (일, 못잡음) => 팜폰으로(팜, 일, 못잡음, fetch, undefined, undefined, 토큰, 거를패키지(appPath));
    const 답 = await 앱화면읽기(appPath, runnerUrl(), 잡기, fetch, 곳, 토큰);
    return { ...답, [칸]: 앱탐색주소(appPath, 팜, 토큰) };
  };
  app.get('/authoring/requests/:id/app-screen', 읽어준다(false, 앱길, 'appium'));
  app.get('/authoring/requests/:id/game-screen', 읽어준다(true, 게임길, 'game'));
  // 링크만 — 서명 링크는 길어야 2시간이라 작성 동안 에이전트가 30분마다 다시 받아 자식의 링크 파일에 갈아 끼운다. 폰을 안 잡고 러너도 안 부른다 (§7 「앱 화면 통로」 app-link)
  // build 는 에이전트가 시작 때 받은 링크의 빌드 번호다 — 그 빌드가 남았으면 같은 빌드로 다시 서명한다(케이스를 쓴 빌드와 돌려 보는 빌드가 같게)
  // 팜 토큰도 같이 준다 — 대신 PAT 는 3시간이라 시작 때 것 하나로는 긴 작성 도중에 401 이다(11-14 MTA #15375). 서버는 2시간 아래로 남으면 새로 받는다
  app.get('/authoring/requests/:id/app-link', async (req: FastifyRequest<{ Params: { id: string }; Querystring: { build?: string } }>, reply: FastifyReply) => {
    const 행 = await 도는집은요청(req, reply);
    if (행 === null) return reply;
    const 고정 = /^\d{1,12}$/.test(req.query.build ?? '') ? Number(req.query.build) : undefined;
    const 링크 = await 작성앱파일(행, 고정);
    // 링크가 없어도(도중에 앱 줄이 바뀜) 준다 — 잡은 폰은 그 토큰으로 놓아야 한다
    const 토큰 = 팜주소() === undefined ? undefined : await 서버팜토큰();
    return { app: 링크, ...(토큰 !== undefined && { token: 토큰 }) };
  });
}

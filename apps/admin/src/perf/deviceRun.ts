// 기기 성능 실행의 엔진 갈래 — 기록기 켜기 · 5초마다 새 줄 받기 · Appium 조작 · 닫기 (도메인/성능 §7 「PERF-F1-08 이 연 통로」)
// 도는 실행은 이 파일의 자기 Map 에 둔다 — 부하 에이전트가 없어 engine 의 도는것(에이전트 일 목록)에 들지 않는다

import { rm } from 'node:fs/promises';
import { join } from 'node:path';

import type { ExecuteRequest, ExecuteResponse } from '@platform/kit';

import { type 대상줄, 대상줄읽기 } from '../authoring/reverse.js';
import { 저장값을채운다 } from '../execution/savedInput.js';
import { 엔진칸 } from '../execution/engineField.js';
import { artifactsDir } from '../execution/routes.js';
import { abortRunner, httpTimeoutMs, 러너에보낸다 } from '../execution/runner.js';
import { type 기록기, 로컬기록기, 팜기록기 } from './deviceRecorder.js';
import { 구간붙이기, 줄넣기, 실행시간채우기, type 구간표시 } from './deviceStore.js';
import type { 끝 } from './finish.js';
import * as 표 from './store.js';
import type { DeviceRunConfig } from './types.js';

// 간격 · 제한은 한 곳에 둔다 — 검사가 짧게 줄여 쓴다
export const 설정 = { 틱ms: 5000, 무소식ms: 30_000, 정리대기ms: 15_000 };
const 잡기남은분 = 10;
const 케이스제한ms = 300_000;

interface 기기상태 {
  index: number;
  serial: string;
  model: string;
  rec: 기록기;
  오프셋: number;
  본마지막: number;
  마지막줄: number;
  켰음: boolean;
  실행시간씀: boolean;
  경고함: boolean;
  구간들: 구간표시[];
}

interface 조작재료 {
  줄: 대상줄;
  /** 애플리케이션 종류 — 게임이면 실행 요청에 엔진을 싣는다 */
  종류: string | undefined;
  케이스들: { tcId: string; filePath: string; params: Record<string, unknown>; expected: Record<string, unknown> }[];
}

interface 도는기기 {
  runId: number;
  cfg: DeviceRunConfig;
  startMs: number;
  devices: 기기상태[];
  ending: boolean;
  알림함: boolean;
  시작됨: boolean;
  시작약속: Promise<void>;
  타이머: NodeJS.Timeout | undefined;
  틱중: Promise<void> | null;
  조작: Promise<void> | null;
  보낸것: Set<number>;
  닫는중: Promise<void> | null;
  // 폰을 놓기 시작한 뒤 — 늦게 끝난 케이스가 닫힌 실행에 구간 · 로그를 쓰지 않게 한다
  놓는중: boolean;
  onEnd: (runId: number, 끝: 끝) => void;
}

const 도는기기들 = new Map<number, 도는기기>();
export const 기기실행중인가 = (runId: number): boolean => 도는기기들.has(runId);
export const 기기지우기 = (runId: number): void => {
  도는기기들.delete(runId);
};

const 글 = (e: unknown) => (e instanceof Error ? e.message : String(e));
const 쉬기 = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const 경고 = (s: 도는기기, message: string) => 표.로그(s.runId, message, 'WARN').catch((e: unknown) => console.error('성능 실행 로그를 남기지 못했습니다', e));
const 초 = (s: 도는기기, ms: number) => Math.max(0, Math.floor((ms - s.startMs) / 1000));

// 직접 플레이는 측정 시간 + 5분을 넘는 가장 짧은 값, Appium 케이스는 120분 (§7 「팜 폰」)
function 잡을분(cfg: DeviceRunConfig): number {
  return cfg.drive === 'MANUAL' ? ([30, 60, 120].find((m) => m > cfg.durationSec / 60 + 5) ?? 120) : 120;
}

function 알리기(s: 도는기기, 끝: 끝): void {
  if (s.알림함) return;
  s.알림함 = true;
  s.onEnd(s.runId, 끝);
}

/** 대기열의 DEVICE 실행 하나를 시작한다. 맵에는 바로 올려 대기열이 같은 실행을 또 집지 않게 한다 */
export function 기기실행시작(run: 표.실행행, onEnd: 도는기기['onEnd']): Promise<void> {
  const cfg = run.config as unknown as DeviceRunConfig;
  const 로컬 = process.env.LOCAL_RUNNER_URL?.replace(/\/+$/, '') ?? '';
  const s: 도는기기 = {
    runId: run.id, cfg, startMs: Date.now(), ending: false, 알림함: false, 시작됨: false, 시작약속: Promise.resolve(), 타이머: undefined, 틱중: null,
    조작: null, 보낸것: new Set(), 닫는중: null, 놓는중: false, onEnd,
    devices: cfg.devices.map((d, index) => ({
      index, serial: d.serial, model: d.model, rec: d.where === 'FARM' ? 팜기록기(d.serial) : 로컬기록기(d.serial, 로컬),
      오프셋: 0, 본마지막: -1, 마지막줄: Date.now(), 켰음: false, 실행시간씀: d.launchMs !== null, 경고함: false, 구간들: [],
    })),
  };
  도는기기들.set(run.id, s);
  s.시작약속 = 시작하기(run, s).catch((e: unknown) => 알리기(s, { kind: 'ERROR', why: 글(e) }));
  return s.시작약속;
}

async function 조작재료읽기(run: 표.실행행, cfg: DeviceRunConfig): Promise<조작재료> {
  const 줄 = await 대상줄읽기(run.serviceId, run.env);
  if (줄 === null || 줄.appPath === null) throw new Error('대상 서버 줄이나 앱 파일이 없어졌습니다');
  const pool = await 표.풀();
  const 종류 = (await pool.query<{ kind: string }>('SELECT kind FROM service WHERE id = $1', [run.serviceId])).rows[0]?.kind;
  const r = await pool.query<{ tc_id: string; file_path: string; param_schema: unknown; expected_schema: unknown }>(
    'SELECT tc_id, file_path, param_schema, expected_schema FROM test_case WHERE tc_id = ANY($1::text[])',
    [cfg.caseIds],
  );
  const 행 = new Map(r.rows.map((x) => [x.tc_id, x]));
  const 아이템 = cfg.caseIds.map((tcId) => {
    if (!행.has(tcId)) throw new Error(`케이스 ${tcId} 가 없어졌습니다`);
    return { tcId, params: {} as Record<string, unknown>, expected: {} as Record<string, unknown> };
  });
  const 채움 = await 저장값을채운다(pool, 아이템, new Map(r.rows.map((x) => [x.tc_id, { param_schema: x.param_schema, expected_schema: x.expected_schema }])), 줄.계정들);
  return { 줄, 종류, 케이스들: 채움.map((c) => ({ ...c, filePath: 행.get(c.tcId)?.file_path ?? '' })) };
}

async function 시작하기(run: 표.실행행, s: 도는기기): Promise<void> {
  if (!(await 표.대기에서시작(run.id, 'RUNNING'))) {
    도는기기들.delete(run.id);
    return;
  }
  s.startMs = Date.now();
  const { cfg } = s;
  if (cfg.devices.some((d) => d.where === 'LOCAL') && (process.env.LOCAL_RUNNER_URL ?? '') === '') throw new Error('내 컴퓨터 러너(LOCAL_RUNNER_URL)가 연결되어 있지 않습니다');
  const 재료 = cfg.drive === 'APPIUM' ? await 조작재료읽기(run, cfg) : null;
  if (s.ending) return;
  const 결과 = await Promise.allSettled(s.devices.map(async (d) => {
    await d.rec.켜기({ runId: run.id, package: cfg.package, intervalSec: cfg.intervalSec, record: cfg.record, holdMinutes: 잡을분(cfg) });
    d.켰음 = true;
    d.오프셋 = Math.max(0, Math.round((Date.now() - s.startMs) / 1000));
    d.마지막줄 = Date.now();
  }));
  const 실패 = 결과.flatMap((x, i) => (x.status === 'rejected' ? [`${s.devices[i]?.model ?? ''}(${s.devices[i]?.serial ?? ''}): ${글(x.reason)}`] : []));
  if (실패.length > 0) throw new Error(`기기를 잡거나 기록기를 켜지 못했습니다 — ${실패.join(' / ')}`);
  if (s.ending) return;
  s.시작됨 = true;
  await 표.로그(run.id, `기록기를 켰습니다 — ${s.devices.map((d) => d.model).join(', ')}`);
  s.타이머 = setInterval(() => void 틱(s), 설정.틱ms);
  s.타이머.unref();
  // 조작이 깨지면(DB · 러너) 기다리는 쪽이 없어 실행이 RUNNING 에 남는다 — 여기서 오류로 닫는다
  if (재료 !== null) s.조작 = Promise.all(s.devices.map((d) => 기기조작(s, d, 재료))).then(
    () => {
      if (!s.ending) 알리기(s, { kind: 'DONE' });
    },
    (e: unknown) => {
      if (!s.ending) 알리기(s, { kind: 'ERROR', why: `케이스를 돌리다 멈췄습니다 — ${글(e)}` });
    },
  );
}

/** 새 줄을 받아 넣는다. 실패는 그 기기만 한 번 경고하고 무소식 시간이 중단을 가른다 */
async function 읽기(s: 도는기기): Promise<void> {
  await Promise.all(s.devices.filter((d) => d.켰음).map(async (d) => {
    try {
      const r = await d.rec.새줄(d.본마지막);
      if (r.rows.length > 0) {
        await 줄넣기(s.runId, d.serial, d.model, d.오프셋, r.rows);
        d.본마지막 = Math.max(d.본마지막, ...r.rows.map((x) => x.sec));
        d.마지막줄 = Date.now();
        // 늦게 온 줄도 구간에 붙게, 새 줄이 닿는 구간만 다시 붙인다
        const 처음 = Math.min(...r.rows.map((x) => x.sec)) + d.오프셋;
        for (const g of d.구간들.filter((x) => x.toSec >= 처음)) await 구간붙이기(s.runId, d.serial, g);
      }
      if (r.launchMs !== null && !d.실행시간씀) {
        d.실행시간씀 = true;
        await 실행시간채우기(s.runId, d.index, r.launchMs);
      }
    } catch (e) {
      if (!d.경고함) {
        d.경고함 = true;
        await 경고(s, `${d.model} 측정값을 받지 못했습니다 — ${글(e)}`);
      }
    }
  }));
}

async function 틱(s: 도는기기): Promise<void> {
  if (s.ending || s.틱중 !== null) return;
  s.틱중 = (async () => {
    await 읽기(s);
    for (const d of s.devices) {
      const 끝 = d.rec.잡음끝();
      if (끝 === null || 끝 - Date.now() >= 잡기남은분 * 60_000) continue;
      await d.rec.늘리기().catch((e: unknown) => 경고(s, `${d.model} 잡는 시간을 늘리지 못했습니다 — ${글(e)}`));
    }
    const 조용 = s.devices.find((d) => Date.now() - d.마지막줄 > 설정.무소식ms);
    if (조용 !== undefined) {
      await 경고(s, `${조용.model} 에서 ${Math.round(설정.무소식ms / 1000)}초 넘게 측정값이 오지 않아 중단합니다`);
      알리기(s, { kind: 'STOP', stop: { reason: 'AGENT_LOST' } });
    } else if (s.cfg.drive === 'MANUAL' && Date.now() - s.startMs >= s.cfg.durationSec * 1000) {
      알리기(s, { kind: 'DONE' });
    }
  })()
    .catch((e: unknown) => console.error(`기기 성능 실행 ${s.runId} 살피기가 깨졌습니다`, e))
    .finally(() => {
      s.틱중 = null;
    });
  await s.틱중;
}

let 보낸수 = 0;

async function 기기조작(s: 도는기기, d: 기기상태, 재료: 조작재료): Promise<void> {
  for (let loop = 1; loop <= s.cfg.repeat; loop++) {
    for (const c of 재료.케이스들) {
      if (s.ending) return;
      await 케이스보내기(s, d, loop, c, 재료);
    }
  }
}

async function 케이스보내기(s: 도는기기, d: 기기상태, loop: number, c: 조작재료['케이스들'][number], { 줄, 종류 }: 조작재료): Promise<void> {
  const historyId = Date.now() * 100 + (보낸수++ % 100);
  const 요청: ExecuteRequest = {
    runId: 0, historyId, tcId: c.tcId, platform: 'android', filePath: c.filePath, baseUrl: 줄.baseUrl, params: c.params, expected: c.expected,
    timeoutMs: 케이스제한ms, udid: d.serial, ...(줄.appPath !== null && { app: 줄.appPath }), ...엔진칸(종류, 'android', 줄.adminKey),
  };
  s.보낸것.add(historyId);
  const t0 = Date.now();
  let 응답: ExecuteResponse | null = null;
  let 문제: string | null = null;
  try {
    const r = await 러너에보낸다('/execute', 요청, httpTimeoutMs(케이스제한ms));
    if (r.status >= 200 && r.status < 300) 응답 = r.json as ExecuteResponse;
    else 문제 = `러너가 ${r.status} 로 거절했습니다`;
  } catch (e) {
    문제 = `러너에 닿지 못했습니다 — ${글(e)}`;
  } finally {
    s.보낸것.delete(historyId);
    await rm(join(artifactsDir(), 'runs', '0', String(historyId)), { recursive: true, force: true }).catch(() => undefined);
  }
  const t1 = Date.now();
  if (s.놓는중) return;
  // 회차는 케이스를 보낸 때부터 끝날 때까지, 구간 이름은 절차마다 걸린 시간으로 이어 붙인다.
  // 절차는 끝에서 거꾸로 놓는다 — 앞쪽엔 연결 · 앱 설치가 끼어 있어 보낸 때부터 세면 구간이 앞으로 밀린다
  const 표시: 구간표시[] = [{ loop, segment: null, fromSec: 초(s, t0), toSec: 초(s, t1) }];
  let 지남 = Math.max(t0, t1 - (응답?.steps ?? []).reduce((a, st) => a + st.durationMs, 0));
  for (const st of 응답?.steps ?? []) {
    표시.push({ loop, segment: `${c.tcId} · ${st.title}`, fromSec: 초(s, 지남), toSec: 초(s, 지남 + st.durationMs) });
    지남 += st.durationMs;
  }
  for (const g of 표시) {
    d.구간들.push(g);
    await 구간붙이기(s.runId, d.serial, g);
  }
  const 까닭 = 문제 ?? 응답?.error?.message;
  if (!s.ending && (응답 === null || 응답.status !== 'PASS')) {
    await 경고(s, `${d.model} ${loop}회차 ${c.tcId} 가 ${응답?.status ?? 'NA'} 로 끝났습니다${까닭 === undefined ? '' : ` — ${까닭}`}`);
  }
}

async function 정리(s: 도는기기): Promise<void> {
  if (s.타이머 !== undefined) clearInterval(s.타이머);
  await s.시작약속.catch(() => undefined);
  for (const id of s.보낸것) await abortRunner(id);
  if (s.조작 !== null) await Promise.race([s.조작.catch(() => undefined), 쉬기(설정.정리대기ms)]);
  if (s.틱중 !== null) await s.틱중;
  if (s.시작됨) {
    await 읽기(s);
    for (const d of s.devices) for (const g of d.구간들) await 구간붙이기(s.runId, d.serial, g).catch((e: unknown) => 경고(s, `구간을 붙이지 못했습니다 — ${글(e)}`));
  }
  s.놓는중 = true;
  for (const d of s.devices) {
    const 폴더 = join(artifactsDir(), 'perf', String(s.runId), d.serial);
    if (s.시작됨 && s.cfg.record) await d.rec.파일받기(폴더, d.오프셋).catch((e: unknown) => 경고(s, `${d.model} 녹화를 받지 못했습니다 — ${글(e)}`));
    await d.rec.놓기().catch((e: unknown) => 경고(s, `${d.model} 을 놓지 못했습니다 — ${글(e)}`));
  }
}

/**
 * 끝내기가 부른다 — 기록기를 닫고 폰을 놓는다. 이 호출이 닫기를 맡았으면 true, 다른 호출이 이미 닫고 있으면 그것을 기다린 뒤 false.
 * 이 실행이 맵에 없으면(대기 중 중단) 할 일이 없어 true. 던지지 않는다
 */
export async function 기기닫기(runId: number): Promise<boolean> {
  const s = 도는기기들.get(runId);
  if (s === undefined) return true;
  if (s.닫는중 !== null) {
    await s.닫는중;
    return false;
  }
  s.ending = true;
  s.닫는중 = 정리(s).catch((e: unknown) => console.error(`기기 성능 실행 ${runId} 정리가 깨졌습니다`, e));
  await s.닫는중;
  return true;
}

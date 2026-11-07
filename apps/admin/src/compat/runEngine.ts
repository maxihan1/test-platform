// 호환성 실행 엔진 — 점검 상태를 차례로 잡고 케이스를 돌리고 바로 놓은 뒤, AI 점검 결과를 받아 화면 줄로 남긴다 (도메인/호환성 §3.13 「실행」 · 「화면 찾기」)
// 차례 돌기 · 잡기 기다리기 · 점검 기다리기는 이 프로세스 메모리에 산다 — admin 이 다시 켜지면 runStore 호환성정리 가 닫는다

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { ExecuteRequest, ExecuteResponse } from '@platform/kit';
import { FARM_EVIDENCE_DIR, runDir } from '@platform/kit';

import { 주소틀 } from '../../../../scripts/authoring-crawl-rules.js';
import { 볼륨파일읽기 } from '../artifactFile.js';
import { 대상줄읽기 } from '../authoring/reverse.js';
import { testsRoot } from '../catalog/scanner.js';
import { 엔진칸 } from '../execution/engineField.js';
import { 잡기를늘린다, 잡는다, 팜머리, 팜주소, 폰을돌려준다 } from '../execution/farm.js';
import { 실행팜토큰 } from '../execution/farmToken.js';
import { abortRunner, 보낸다 } from '../execution/runner.js';
import { 저장값을채운다 } from '../execution/savedInput.js';
import { db } from '../settings/store.js';
import { type 호환성디바이스, 호환성디바이스목록 } from './devices.js';
import {
  type 실행케이스, 빈점검닫기, 상태놓음, 상태닫기, 상태들읽기, 상태잡음, 실행머리읽기, 실행끝내기, 실행멈추기, 점검저장, 케이스끝, 케이스들읽기, 케이스시작, 호환성정리,
} from './runStore.js';
import { type 점검파일, type 화면파일, 그림이름, 점검읽기, 화면줄들 } from './uiCheck.js';

// 간격 · 상한은 한 곳에 둔다 — 검사가 짧게 줄여 쓴다
export const 설정 = {
  /** 남은 상태가 모두 사용 중이면 다시 보는 간격 */
  다시잡기ms: 30_000,
  /** 한 상태를 이만큼 못 잡으면 건너뛴다 */
  잡기상한ms: 30 * 60_000,
  /** 점검 결과를 다시 보는 간격 — 러너가 1분마다 받는다 */
  점검간격ms: 60_000,
  /** 케이스가 끝난 뒤 이만큼 지나도 점검이 안 끝나면 미점검 — 러너가 그만 받는 때와 같은 잣대다 (§7 「러너 · kit」) */
  점검상한ms: 60 * 60_000,
};

const 팜제한ms = 10_000;
const Chrome제한ms = 40_000;
const 쉬기 = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const 글 = (e: unknown) => (e instanceof Error ? e.message : String(e));

interface 도는실행 {
  멈춤: boolean;
  도는케이스: number | null;
  점검들: Promise<void>[];
}

const 도는들 = new Map<number, 도는실행>();
export const 도는호환성인가 = (runId: number): boolean => 도는들.has(runId);

interface 케이스재료 {
  platform: 'android' | 'mobile';
  params: Record<string, unknown>;
  expected: Record<string, unknown>;
  파일들: 화면파일[];
}

interface 실행재료 {
  runId: number;
  팜: string;
  토큰: string | undefined;
  baseUrl: string;
  app: string | null;
  serviceKind: string;
  adminKey: Parameters<typeof 엔진칸>[2];
  onePerModel: boolean;
  케이스: Map<string, 케이스재료>;
}

/** 세운 실행을 돌리기 시작한다. 기다리지 않는다 — 실행 하나가 수십 분이다 */
export function 실행돌리기(runId: number): void {
  const s: 도는실행 = { 멈춤: false, 도는케이스: null, 점검들: [] };
  도는들.set(runId, s);
  void 돌기(runId, s)
    .catch(async (e: unknown) => {
      console.error(`[compat] 실행 ${runId} 이 깨졌다: ${글(e)}`);
      // 깨진 채 RUNNING 으로 남으면 알림 줄 · 실행 기록이 영원히 「도는 중」이다
      await 실행멈추기(runId, `실행이 멈췄습니다: ${글(e)}`).catch(() => undefined);
    })
    .finally(() => 도는들.delete(runId));
}

async function 재료읽기(runId: number): Promise<실행재료 | { 까닭: string }> {
  const 머리 = await 실행머리읽기(runId);
  if (머리 === null) throw new Error('호환성 실행이 아닙니다');
  const 팜 = 팜주소();
  if (팜 === undefined) return { 까닭: '이 서버에는 Device VISION(DEVICE_FARM_URL)이 연결되어 있지 않습니다' };
  let 토큰: string | undefined;
  try {
    토큰 = await 실행팜토큰(runId);
  } catch (e) {
    return { 까닭: `누른 사람의 팜 토큰을 고르지 못했습니다: ${글(e)}` };
  }
  const 줄 = await 대상줄읽기(머리.serviceId, 머리.env);
  if (줄 === null) return { 까닭: `${머리.env} 대상 서버가 없어졌습니다` };
  const pool = await db();
  const 번호들 = [...new Set((await 케이스들읽기(runId)).map((c) => c.tcId))];
  const [행, 화면] = await Promise.all([
    pool.query<{ tc_id: string; platforms: string[]; param_schema: unknown; expected_schema: unknown }>(
      'SELECT tc_id, platforms, param_schema, expected_schema FROM test_case WHERE tc_id = ANY($1::text[]) AND is_active',
      [번호들],
    ),
    pool.query<{ tc_id: string; file: string; screen_url: string }>(
      'SELECT tc_id, file, screen_url FROM case_screen WHERE tc_id = ANY($1::text[]) AND screen_url IS NOT NULL',
      [번호들],
    ),
  ]);
  const 채움 = await 저장값을채운다(
    pool,
    행.rows.map((r) => ({ tcId: r.tc_id, params: {} as Record<string, unknown>, expected: {} as Record<string, unknown> })),
    new Map(행.rows.map((r) => [r.tc_id, r])),
    줄.계정들,
  );
  // 화면 파일 글은 앱 locator · 게임 대상 이름을 찾는 데만 쓴다 — 못 읽으면 빈 글이라 그 화면은 「화면 모름」이 된다
  const 글들 = new Map<string, string>();
  for (const f of new Set(화면.rows.map((r) => r.file))) 글들.set(f, await readFile(join(testsRoot(), f.replace(/^tests\//, '')), 'utf8').catch(() => ''));
  const 케이스 = new Map<string, 케이스재료>();
  for (const c of 채움) {
    const platforms = 행.rows.find((r) => r.tc_id === c.tcId)?.platforms ?? [];
    케이스.set(c.tcId, {
      platform: platforms.includes('android') ? 'android' : 'mobile',
      params: c.params,
      expected: c.expected,
      파일들: 화면.rows.filter((r) => r.tc_id === c.tcId).flatMap((r) => { const key = 주소틀(r.screen_url); return key === null ? [] : [{ file: r.file, key, 글: 글들.get(r.file) ?? '' }]; }),
    });
  }
  return { runId, 팜, 토큰, baseUrl: 줄.baseUrl, app: 줄.appPath, serviceKind: 머리.serviceKind, adminKey: 줄.adminKey, onePerModel: 머리.onePerModel, 케이스 };
}

async function 돌기(runId: number, s: 도는실행): Promise<void> {
  const 재 = await 재료읽기(runId);
  const 상태들 = (await 상태들읽기(runId)).filter((d) => d.state === 'WAIT');
  if ('까닭' in 재) {
    for (const d of 상태들) await 상태닫기(runId, d.seq, 'SKIPPED', 재.까닭);
    await 실행끝내기(runId);
    return;
  }
  const 케이스들 = await 케이스들읽기(runId);
  const 처음 = new Map<number, number>();
  const 남은 = [...상태들];
  while (남은.length > 0 && !s.멈춤) {
    let 돌았다 = false;
    for (const d of [...남은]) {
      if (s.멈춤) break;
      const 폰 = await 잡아보기(재, d.serial, d.model, 케이스들.filter((c) => c.seq === d.seq).length);
      if (폰 !== null) {
        남은.splice(남은.indexOf(d), 1);
        await 상태돌기(재, s, d.seq, 폰, 케이스들.filter((c) => c.seq === d.seq));
        돌았다 = true;
        // 앞 차례가 비었을 수 있다 — 다시 처음부터 본다
        break;
      }
      const 시작 = 처음.get(d.seq) ?? Date.now();
      처음.set(d.seq, 시작);
      if (Date.now() - 시작 >= 설정.잡기상한ms) {
        남은.splice(남은.indexOf(d), 1);
        await 상태닫기(runId, d.seq, 'SKIPPED', '디바이스를 잡지 못했습니다');
      }
    }
    if (!돌았다 && 남은.length > 0 && !s.멈춤) await 쉬기(설정.다시잡기ms);
  }
  await Promise.all(s.점검들);
  await 빈점검닫기(runId);
  await 실행끝내기(runId);
}

// 케이스 하나의 상한은 5분이다 — 그 상태 몫을 팜이 받는 30 · 60 · 120분 가운데 고르고, 모자라면 케이스마다 늘린다
const 잡을분 = (케이스수: number) => [30, 60, 120].find((m) => m >= 케이스수 * 5 + 5) ?? 120;

/** 고른 디바이스를 잡는다. 못 잡았고 「모델별 1대」 세트면 같은 모델의 빈 디바이스를 찾는다. 못 잡으면 null */
async function 잡아보기(재: 실행재료, serial: string, model: string, 케이스수: number): Promise<{ serial: string; 기기: 호환성디바이스 | undefined } | null> {
  const 목록 = await 호환성디바이스목록();
  const 후보 = [serial, ...(재.onePerModel ? (목록 ?? []).filter((d) => d.serial !== serial && d.model === model && d.state === 'IDLE').map((d) => d.serial) : [])];
  for (const x of 후보) {
    try {
      const 잡음 = await 잡는다(재.팜, x, fetch, 잡을분(케이스수), 재.토큰);
      if ('화면' in 잡음) return { serial: x, 기기: 목록?.find((d) => d.serial === x) };
    } catch (e) {
      // 답이 늦게 왔을 뿐 팜은 잡았을 수 있다 — 놓고 다음 차례에 다시 본다
      console.error(`[compat] 실행 ${재.runId} 이 ${x} 를 잡다 닿지 못했다: ${글(e)}`);
      await 폰을돌려준다(재.팜, x, fetch, 재.토큰);
    }
  }
  return null;
}

async function 상태돌기(재: 실행재료, s: 도는실행, seq: number, 폰: { serial: string; 기기: 호환성디바이스 | undefined }, 케이스들: 실행케이스[]): Promise<void> {
  const fold = 폰.기기?.fold === 'folded' ? 'FOLDED' : 폰.기기?.fold === 'unfolded' ? 'OPEN' : null;
  try {
    // 중단이 먼저 STOPPED 로 닫았으면 돌지 않는다
    if (!(await 상태잡음(재.runId, seq, 폰.serial, 폰.기기 ?? { serial: 폰.serial }, fold))) return;
    for (const c of 케이스들) {
      if (s.멈춤) break;
      await 잡기를늘린다(재.팜, 폰.serial, fetch, 재.토큰);
      await 케이스돌기(재, s, 폰.serial, c);
    }
  } finally {
    await 폰을돌려준다(재.팜, 폰.serial, fetch, 재.토큰);
    await 상태놓음(재.runId, seq);
  }
}

const 단계꼴 = (r: ExecuteResponse) => r.steps.map((x) => ({ seq: x.seq, title: x.title, status: x.status, durationMs: x.durationMs }));

async function 케이스돌기(재: 실행재료, s: 도는실행, serial: string, c: 실행케이스): Promise<void> {
  const 재료 = 재.케이스.get(c.tcId);
  // 지워졌거나 폰에서 안 도는 케이스 — 세트에는 남고 실행 때 건너뛴다 (§3.13 「호환성 세트」)
  if (재료 === undefined) {
    await 케이스끝(c.id, { status: 'NA', failedStep: null, steps: [], error: { message: '케이스가 없어졌거나 폰에서 돌지 않습니다' }, checkState: null });
    return;
  }
  const 요청: ExecuteRequest = {
    runId: 재.runId, historyId: c.id, tcId: c.tcId, platform: 재료.platform, filePath: c.filePath, baseUrl: 재.baseUrl,
    params: 재료.params, expected: 재료.expected, timeoutMs: c.timeoutMs, udid: serial, ...(재.토큰 !== undefined && { farmToken: 재.토큰 }),
  };
  let Chrome세션: string | undefined;
  if (재료.platform === 'android') {
    Object.assign(요청, { uiCheck: true as const }, 재.app !== null && { app: 재.app }, 엔진칸(재.serviceKind, 'android', 재.adminKey));
  } else {
    // 모바일 웹은 admin 이 Chrome 을 켤 때 점검을 켜고, 끝나면 그 세션의 점검 파일을 받는다 (비전 안내서 13절 「UI 점검」)
    const 켬 = await Chrome켜기(재, serial);
    if ('까닭' in 켬) {
      await 케이스끝(c.id, { status: 'NA', failedStep: null, steps: [], error: { message: 켬.까닭 }, checkState: null });
      return;
    }
    요청.cdpUrl = 켬.cdpUrl;
    Chrome세션 = 켬.sessionId;
  }
  await 케이스시작(c.id);
  s.도는케이스 = c.id;
  const 결과 = await 보낸다({ historyId: c.id, timeoutMs: c.timeoutMs }, 요청);
  s.도는케이스 = null;
  const 끝 = Date.now();
  const 점검받나 = 재료.platform === 'android' || Chrome세션 !== undefined;
  await 케이스끝(c.id, {
    status: 결과.status,
    failedStep: 결과.steps.find((x) => x.status === 'FAIL')?.seq ?? null,
    steps: 단계꼴(결과),
    error: 결과.error ?? null,
    checkState: 점검받나 ? 'checking' : null,
  });
  if (점검받나) s.점검들.push(점검기다리기(재, c, 재료.파일들, 끝, 결과, Chrome세션).catch((e: unknown) => console.error(`[compat] 케이스 ${c.id} 점검 결과를 못 받았다: ${글(e)}`)));
}

async function Chrome켜기(재: 실행재료, serial: string): Promise<{ cdpUrl: string; sessionId: string | undefined } | { 까닭: string }> {
  try {
    const res = await fetch(`${재.팜}/api/devices/${encodeURIComponent(serial)}/chrome`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...팜머리(process.env, 재.토큰) },
      body: JSON.stringify({ uiCheck: true }),
      signal: AbortSignal.timeout(Chrome제한ms),
    });
    const 값 = ((await res.json().catch(() => null)) as { value?: { cdpUrl?: unknown; sessionId?: unknown; message?: unknown } } | null)?.value;
    if (!res.ok) return { 까닭: `Device VISION 이 폰 Chrome 을 켜지 못했습니다: ${typeof 값?.message === 'string' ? 값.message : `HTTP ${res.status}`}` };
    if (typeof 값?.cdpUrl !== 'string' || !/^wss?:\/\//.test(값.cdpUrl)) return { 까닭: 'Device VISION 이 폰 Chrome 연결 주소를 주지 않았습니다' };
    // 세션 번호를 안 주는 옛 비전이면 점검 없이 돈다 — 그 화면은 미점검이다
    return { cdpUrl: 값.cdpUrl, sessionId: typeof 값.sessionId === 'string' && /^[\w-]+$/.test(값.sessionId) ? 값.sessionId : undefined };
  } catch (e) {
    return { 까닭: `Device VISION 에 닿지 못했습니다: ${글(e)}` };
  }
}

const 폴더 = (runId: number, id: number) => join(runDir(String(runId), String(id)), FARM_EVIDENCE_DIR);

/** 러너가 받아 둔 끝난 점검 파일(앱 · 게임). 아직 없으면 null */
async function 러너점검(runId: number, id: number): Promise<점검파일 | null> {
  try {
    return 점검읽기(JSON.parse((await 볼륨파일읽기(join(폴더(runId, id), 'ui-check.json'))).toString('utf8')));
  } catch {
    return null;
  }
}

/** 팜에서 Chrome 세션의 점검 파일을 받는다. 끝났으면 의심 화면 그림도 실행 폴더에 받아 둔다 — 팜 30일 보관과 상관없이 남게 */
async function Chrome점검(재: 실행재료, c: 실행케이스, sid: string): Promise<점검파일 | null> {
  const 주소 = `${재.팜}/api/sessions/${encodeURIComponent(sid)}/artifacts`;
  const res = await fetch(`${주소}/ui-check.json`, { headers: 팜머리(process.env, 재.토큰), signal: AbortSignal.timeout(팜제한ms) }).catch(() => null);
  if (res === null || !res.ok) return null;
  const 점검 = 점검읽기(await res.json().catch(() => null));
  if (점검 === null || 점검.status === 'checking') return 점검;
  const 곳 = 폴더(재.runId, c.id);
  await mkdir(곳, { recursive: true });
  for (const f of new Set(점검.screens.flatMap((x) => (x.file !== undefined && 그림이름.test(x.file) ? [x.file] : [])))) {
    const 그림 = await fetch(`${주소}/${f}`, { headers: 팜머리(process.env, 재.토큰), signal: AbortSignal.timeout(팜제한ms) }).catch(() => null);
    if (그림?.ok === true) await writeFile(join(곳, f), Buffer.from(await 그림.arrayBuffer()));
  }
  return 점검;
}

/** 점검이 끝날 때까지 받아 화면 줄로 남긴다. 케이스가 끝난 뒤 60분이 지나면 미점검(missing)이다 */
async function 점검기다리기(재: 실행재료, c: 실행케이스, 파일들: 화면파일[], 끝: number, 결과: ExecuteResponse, Chrome세션: string | undefined): Promise<void> {
  for (;;) {
    await 쉬기(설정.점검간격ms);
    const 점검 = Chrome세션 === undefined ? await 러너점검(재.runId, c.id) : await Chrome점검(재, c, Chrome세션);
    if (점검 !== null && 점검.status !== 'checking') {
      await 점검저장(c.id, 점검.status, 화면줄들(점검, c.tcId, 파일들, 끝, 결과.steps));
      return;
    }
    if (Date.now() - 끝 >= 설정.점검상한ms) {
      await 점검저장(c.id, 'missing', []);
      return;
    }
  }
}

/**
 * 중단 — 도는 케이스를 러너에서 끊고 남은 상태를 닫는다. 실행은 바로 ABORTED 이고 돌던 상태의 점검은 마저 받는다.
 * 엔진이 메모리에 없으면(다시 켜진 뒤) 잡혀 있던 디바이스를 여기서 놓는다. 끊은 케이스 수, 도는 실행이 아니면 null
 */
export async function 호환성중단(runId: number): Promise<{ aborted: number } | null> {
  const s = 도는들.get(runId);
  const 멈춤 = await 실행멈추기(runId, '실행을 중단했습니다');
  if (멈춤 === null) return null;
  if (s === undefined) {
    const 팜 = 팜주소();
    const 토큰 = await 실행팜토큰(runId).catch(() => undefined);
    if (팜 !== undefined) for (const serial of 멈춤.held) await 폰을돌려준다(팜, serial, fetch, 토큰);
    return { aborted: 0 };
  }
  s.멈춤 = true;
  const 도는 = s.도는케이스;
  if (도는 === null) return { aborted: 0 };
  await abortRunner(도는);
  return { aborted: 1 };
}

/** admin 이 뜰 때 한 번 — 도는 호환성 실행은 멈추고 점검 중인 케이스는 미점검으로 닫고 잡혀 있던 디바이스를 놓는다 (§3.13 「실행」 6) */
export async function 호환성다시켜기(): Promise<number> {
  const 놓을 = await 호환성정리();
  const 팜 = 팜주소();
  if (팜 !== undefined) for (const x of 놓을) await 폰을돌려준다(팜, x.serial, fetch, await 실행팜토큰(x.runId).catch(() => undefined));
  return 놓을.length;
}

// 기기 성능 — 측정 요청 검사 · 실행 만들기 · 고를 수 있는 기기 목록 (도메인/성능 §3.9 「기기 성능」 · §7 「PERF-F1-08 이 연 통로」)

import { PC항목인가 } from '@platform/kit';
import { 패키지이름인가 } from '@platform/kit/protocol';
import { z } from 'zod';

import { 대상줄읽기 } from '../authoring/reverse.js';
import { 게임시나리오인가 } from '../catalog/rules.js';
import { PC기기인가, 팜머리, 팜주소 } from '../execution/farm.js';
import { 서버팜토큰 } from '../execution/farmToken.js';
import { 최신PC빌드파일 } from '../execution/pcTrial.js';
import { PC가비었나 } from '../execution/phone.js';
import { 러너머리, 프로시저못도는러너인가 } from '../execution/runnerAddr.js';
import { 기기목표 } from './deviceStats.js';
import * as 표 from './store.js';
import type { DeviceRunConfig } from './types.js';

export const 시리얼 = /^\w[\w.:-]{0,63}$/;
const 앱이름 = /^[A-Za-z]\w*(\.[A-Za-z]\w*)+$/;

// GPU 는 PC 만 — GPU 사용률과 VRAM 그래프 (§7 「측정 요청」)
export const 측정지표들 = ['FPS', 'JANK', 'CPU', 'MEM', 'TEMP', 'BATTERY', 'GPU'] as const;

export const 측정본문 = z.object({
  serviceId: z.number().int().positive(),
  env: z.string().min(1).max(100),
  drive: z.enum(['APPIUM', 'GAME', 'MANUAL']),
  caseIds: z.array(z.string().min(1).max(100)).min(1).max(20).optional(),
  durationSec: z.number().int().min(60).max(3600).optional(),
  // Windows 애플리케이션은 쓰지 않는다 — 실행 빌드 zip 을 깐다. 그 밖은 측정세우기가 꼭 받는다
  build: z.object({ package: z.string().regex(앱이름).max(200) }).optional(),
  devices: z.array(z.object({ serial: z.string().regex(시리얼), where: z.enum(['FARM', 'LOCAL']) })).min(1).max(5),
  repeat: z.number().int().min(1).max(20),
  targets: z.array(기기목표).max(20),
  metrics: z.array(z.enum(측정지표들)).min(1).max(7),
  intervalSec: z.union([z.literal(1), z.literal(2), z.literal(5)]),
  record: z.boolean(),
}).superRefine((b, ctx) => {
  const 막음 = (message: string) => ctx.addIssue({ code: 'custom', message });
  if (new Set(b.devices.map((d) => d.serial)).size !== b.devices.length) 막음('디바이스가 중복됩니다');
  if (new Set(b.metrics).size !== b.metrics.length) 막음('측정 항목이 중복됩니다');
  if (b.caseIds !== undefined && new Set(b.caseIds).size !== b.caseIds.length) 막음('케이스가 중복됩니다');
  if (b.drive !== 'MANUAL' && b.caseIds === undefined) 막음('Appium · 게임 케이스는 케이스를 선택합니다');
  if (b.drive === 'MANUAL' && (b.durationSec === undefined || b.repeat !== 1)) 막음('직접 플레이는 측정 시간을 적고 반복은 1회입니다');
});

type 거절 = { status: number; error: string; detail?: string };

export interface 기기 {
  serial: string;
  model: string;
  os: string;
  where: 'FARM' | 'LOCAL';
  status: 'IDLE' | 'BUSY';
}

const 목록제한ms = 5_000;
const 내컴퓨터러너 = () => process.env.LOCAL_RUNNER_URL?.replace(/\/+$/, '') || undefined;

/** 애플리케이션이 PC 게임(windows)인가 — 측정 기기 목록 · 측정 요청이 갈린다 (§3.9 「기기 성능: PC 게임과 측정 정의」) */
export async function PC게임인가(serviceId: number): Promise<boolean> {
  const r = await (await 표.풀()).query<{ pc: boolean }>(`SELECT kind = 'GAME' AND game_platform = 'windows' AS pc FROM service WHERE id = $1`, [serviceId]);
  return r.rows[0]?.pc === true;
}

/**
 * 팜 기기(팜이 빈 폰이라 하면 IDLE)와 내 컴퓨터 러너 폰(늘 IDLE)을 합친다. 한쪽이 꺼졌거나 닿지 않으면 그쪽은 빈 목록이다.
 * PC 게임이면 팜의 PC 줄만 싣고 내 컴퓨터 러너 폰은 싣지 않는다. 아니면 PC 를 뺀다
 */
export async function 기기목록(PC = false): Promise<기기[]> {
  const 팜 = 팜주소();
  const 로컬 = 내컴퓨터러너();
  const [팜쪽, 로컬쪽] = await Promise.all([
    팜 === undefined ? [] : 팜기기들(팜, PC),
    로컬 === undefined || PC ? [] : 로컬기기들(로컬),
  ]);
  return [...팜쪽, ...로컬쪽];
}

async function 팜기기들(팜: string, PC: boolean): Promise<기기[]> {
  try {
    const res = await fetch(`${팜}/api/devices`, { headers: 팜머리(process.env, await 서버팜토큰()), signal: AbortSignal.timeout(목록제한ms) });
    if (!res.ok) return [];
    const 몸 = (await res.json()) as { value?: { devices?: { serial?: unknown; state?: unknown; model?: unknown; osVersion?: unknown; platform?: unknown }[] } };
    // PC 게임은 PC 줄만, 그 밖은 폰만 — 폰 자리에 PC 를 잡으면 Appium 이 400 이다 (도메인/게임 §3.10 「폰을 고르는 길은 PC 를 거른다」)
    return (몸.value?.devices ?? []).flatMap((d) =>
      typeof d.serial === 'string' && 시리얼.test(d.serial) && PC기기인가(d) === PC
        ? [{ serial: d.serial, model: typeof d.model === 'string' ? d.model : d.serial, os: typeof d.osVersion === 'string' ? d.osVersion : '', where: 'FARM' as const, status: d.state === 'IDLE' ? ('IDLE' as const) : ('BUSY' as const) }]
        : [],
    );
  } catch {
    return [];
  }
}

async function 로컬기기들(로컬: string): Promise<기기[]> {
  try {
    const res = await fetch(`${로컬}/perf/devices`, { headers: 러너머리(), signal: AbortSignal.timeout(목록제한ms) });
    if (!res.ok) return [];
    const 몸 = (await res.json()) as { devices?: { serial?: unknown; model?: unknown; os?: unknown }[] };
    return (몸.devices ?? []).flatMap((d) =>
      typeof d.serial === 'string' && 시리얼.test(d.serial)
        ? [{ serial: d.serial, model: typeof d.model === 'string' ? d.model : d.serial, os: typeof d.os === 'string' ? d.os : '', where: 'LOCAL' as const, status: 'IDLE' as const }]
        : [],
    );
  } catch {
    return [];
  }
}

/** 팜 기기 목록만 — 기기 추천 재료. 일련번호 · 모델 · Android 판 · 해상도 */
export async function 팜기기재료(): Promise<{ serial: string; model: string; osVersion: string; resolution: string }[]> {
  const 팜 = 팜주소();
  if (팜 === undefined) return [];
  try {
    const res = await fetch(`${팜}/api/devices`, { headers: 팜머리(process.env, await 서버팜토큰()), signal: AbortSignal.timeout(목록제한ms) });
    if (!res.ok) return [];
    const 몸 = (await res.json()) as { value?: { devices?: { serial?: unknown; model?: unknown; osVersion?: unknown; resolution?: unknown; platform?: unknown }[] } };
    const 글 = (v: unknown) => (typeof v === 'string' ? v : '');
    return (몸.value?.devices ?? []).flatMap((d) =>
      typeof d.serial === 'string' && 시리얼.test(d.serial) && !PC기기인가(d) ? [{ serial: d.serial, model: 글(d.model), osVersion: 글(d.osVersion), resolution: 글(d.resolution) }] : [],
    );
  } catch {
    return [];
  }
}

/**
 * 스토어 앱은 깔지 않고 켜서, 사람이 고른 팜 폰에 그 앱이 남아 있어야 한다 — 없는 첫 폰을 까닭으로 돌려준다.
 * 목록을 못 읽어도 까닭이다 — 보지 못한 채 재면 측정이 앱을 못 연다 (러너 §5.2 「플레이스토어 앱 — 패키지 이름」 · VISION 안내서 11절 「스토어 앱」)
 */
async function 앱없는폰(팜: string, 패키지: string, serials: string[]): Promise<string | null> {
  try {
    const res = await fetch(`${팜}/api/devices?app=${encodeURIComponent(패키지)}`, { headers: 팜머리(process.env, await 서버팜토큰()), signal: AbortSignal.timeout(목록제한ms) });
    if (!res.ok) return `Device VISION 이 디바이스 목록을 주지 않았습니다 (HTTP ${res.status})`;
    // 주소가 틀려 다른 쪽이 HTML 을 주면 「닿지 못했다」가 아니라 주소를 보라고 한다 (execution/farm.ts 와 같은 말)
    const 몸 = (await res.json().catch(() => null)) as { value?: { devices?: { serial?: unknown }[] } } | null;
    if (몸 === null) return 'Device VISION 의 디바이스 목록을 읽지 못했습니다 — DEVICE_FARM_URL 을 확인하세요';
    const 깔린 = new Set((몸.value?.devices ?? []).map((d) => d.serial));
    const 없는 = serials.find((serial) => !깔린.has(serial));
    return 없는 === undefined ? null : `선택한 디바이스 ${없는} 에 ${패키지} 가 설치되어 있지 않습니다 — Device VISION 「남길 앱」에 넣어 둔 디바이스를 선택합니다`;
  } catch (err) {
    return `Device VISION 에 닿지 못했습니다: ${err instanceof Error ? err.message : String(err)}`;
  }
}

/** 요청한 케이스가 이 애플리케이션의 그 디바이스 케이스인가(모바일 게임 케이스도 android, PC 게임은 windows) — 아니면 까닭 */
async function 케이스검사(serviceId: number, caseIds: string[], 이름: string, 플랫폼: 'android' | 'windows'): Promise<string | null> {
  const 접두사 = (await (await 표.풀()).query<{ prefix: string }>('SELECT prefix FROM service WHERE id = $1', [serviceId])).rows[0]?.prefix;
  if (접두사 === undefined) return '애플리케이션이 없습니다';
  const r = await (await 표.풀()).query<{ tc_id: string; platforms: string[]; dropped: boolean }>(
    `SELECT tc_id, platforms, proc_id IS NOT NULL AND NOT is_active AS dropped FROM test_case WHERE tc_id = ANY($1::text[]) AND split_part(tc_id, '-', 1) = $2`,
    [caseIds, 접두사],
  );
  const 행 = new Map(r.rows.map((x) => [x.tc_id, x]));
  for (const id of caseIds) {
    const x = 행.get(id);
    if (게임시나리오인가(id)) return `게임 시나리오는 디바이스 성능에 쓰지 않습니다: ${id}`;
    if (x === undefined) return `이 애플리케이션의 케이스가 아닙니다: ${id}`;
    // 패드 케이스는 windows-ps5 처럼 패드가 붙은 플랫폼만 선언하기도 한다 — 다 PC 에서 돈다
    if (!x.platforms.some((p) => (플랫폼 === 'windows' ? PC항목인가(p) : p === 플랫폼))) return `${이름} 케이스가 아닙니다: ${id}`;
    // 프로시저에서 빠져 내려간 케이스는 같이 돌 수도 혼자 돌 수도 없다 (실행 §3.2 「반영」)
    if (x.dropped) return `테스트 프로시저에서 빠진 케이스입니다: ${id}`;
  }
  return null;
}

export async function 측정세우기(b: z.infer<typeof 측정본문>, 누가: { username: string | null; name: string | null }): Promise<{ runId: number } | 거절> {
  const 나쁨 = (detail: string): 거절 => ({ status: 400, error: 'INVALID_REQUEST', detail });
  const 줄0 = (await (await 표.풀()).query<{ kind: string; game_platform: string | null }>('SELECT kind, game_platform FROM service WHERE id = $1', [b.serviceId])).rows[0];
  const 종류 = 줄0?.kind;
  if (종류 === undefined) return 나쁨('애플리케이션이 없습니다');
  // PC 게임은 VISION PC 한 대 · 실행 빌드 zip · 배터리 온도 없음 (§3.9 「기기 성능: PC 게임과 측정 정의」 · §7 「조작과 기기」)
  const PC = 종류 === 'GAME' && 줄0?.game_platform === 'windows';
  if (종류 === 'API') return 나쁨('API 애플리케이션은 디바이스 성능을 잴 수 없습니다');
  // 게임 화면은 엔진이 그림으로 그려 Appium 이 버튼을 못 찾는다 — 게임은 게임 케이스로만 (§3.9 「조작 셋」)
  if (b.drive === 'GAME' && 종류 !== 'GAME') return 나쁨('게임 케이스는 게임 애플리케이션만 선택합니다');
  if (b.drive === 'APPIUM' && 종류 === 'GAME') return 나쁨('게임 애플리케이션은 게임 케이스로 잽니다');
  if (PC) {
    if (b.devices.length !== 1 || b.devices[0]?.where !== 'FARM') return 나쁨('PC 게임은 Device VISION PC 한 대만 잴 수 있습니다');
    if (b.targets.some((t) => t.metric === 'MAX_TEMP')) return 나쁨('PC 게임은 배터리 온도를 재지 않습니다');
  } else {
    if (b.metrics.includes('GPU')) return 나쁨('GPU · VRAM 은 PC 게임만 잽니다');
    if (b.build === undefined) return 나쁨('앱 패키지 이름을 적어 주세요');
  }
  const 줄 = await 대상줄읽기(b.serviceId, b.env);
  if (줄 === null) return 나쁨('대상 서버가 없습니다');
  // 폰처럼 대상 서버 줄의 앱 파일로 물러서지 않는다 — PC 에 깔 것은 올린 zip 뿐이다 (정식 실행과 같은 문구 · 도메인/게임 「윈도우 PC」)
  if (PC && (await 최신PC빌드파일(b.serviceId, b.env)) === null) return 나쁨('Windows 빌드가 없습니다');
  if (b.drive !== 'MANUAL') {
    const 케이스 = b.caseIds ?? [];
    const 까닭 = await 케이스검사(b.serviceId, 케이스, b.drive === 'GAME' ? '게임' : 'Android 앱', PC ? 'windows' : 'android');
    if (까닭 !== null) return 나쁨(까닭);
    if (!PC && 줄.appPath === null) return 나쁨('대상 서버 줄에 앱 파일이 없습니다');
    // 케이스는 서버 러너가 팜에서 잡은 폰으로 돌린다 — 내 컴퓨터 러너 폰에는 보낼 길이 없다
    if (b.devices.some((d) => d.where !== 'FARM')) return 나쁨(`${b.drive === 'GAME' ? '게임' : 'Appium'} 케이스는 Device VISION 디바이스만 잴 수 있습니다`);
    // 프로시저 안 케이스는 그 프로시저를 통째로 보낸다 — 못 돌리는 러너면 측정을 만들지 않는다 (§3.9 「기기 성능」)
    const 프로시저 = await (await 표.풀()).query('SELECT 1 FROM test_case WHERE tc_id = ANY($1::text[]) AND proc_id IS NOT NULL AND is_active LIMIT 1', [케이스]);
    if ((프로시저.rowCount ?? 0) > 0 && (await 프로시저못도는러너인가())) return { status: 409, error: 'RUNNER_NO_PROCEDURE' };
  }
  const 팜 = 팜주소();
  if (b.devices.some((d) => d.where === 'FARM') && 팜 === undefined) return { status: 409, error: 'FARM_OFF' };
  // 케이스로 재는 길만 앱 파일 칸을 연다 — 직접 플레이는 빌드 칸의 패키지를 사람이 켠다. 케이스 길은 위에서 팜 폰만 남겼다
  if (!PC && b.drive !== 'MANUAL' && 팜 !== undefined && 줄.appPath !== null && 패키지이름인가(줄.appPath)) {
    const 까닭 = await 앱없는폰(팜, 줄.appPath, b.devices.map((d) => d.serial));
    if (까닭 !== null) return 나쁨(까닭);
  }
  if (b.devices.some((d) => d.where === 'LOCAL') && 내컴퓨터러너() === undefined) return 나쁨('이 서버에는 내 컴퓨터 러너(LOCAL_RUNNER_URL)가 연결되어 있지 않습니다');

  const 목록 = await 기기목록(PC);
  // PC 게임에 폰, 폰 앱에 PC 를 고르면 거절한다. 폰은 목록을 못 읽어도 막지 않는다 — 잡기가 가른다(앞 판 그대로)
  const 팜PC = PC ? new Set(목록.map((d) => d.serial)) : new Set(팜 === undefined ? [] : (await 팜기기들(팜, true)).map((d) => d.serial));
  const 어긋남 = b.devices.find((d) => (PC ? !팜PC.has(d.serial) : 팜PC.has(d.serial)));
  if (어긋남 !== undefined) return 나쁨(PC ? `Device VISION 의 Windows PC 가 아닙니다: ${어긋남.serial}` : `Windows PC 는 PC 게임만 잽니다: ${어긋남.serial}`);
  // 다른 실행이 PC 를 쓰는 중이면 기다리지 않는다 — 시작할 때 다시 잡고 못 잡으면 오류로 끝낸다
  if (PC && !PC가비었나()) return { status: 409, error: 'DEVICE_BUSY' };
  const 모델 = new Map(목록.map((d) => [`${d.where}:${d.serial}`, d.model]));
  const config: DeviceRunConfig = {
    drive: b.drive, caseIds: b.caseIds ?? [], durationSec: b.durationSec ?? 0, package: PC ? '' : (b.build?.package ?? ''),
    devices: b.devices.map((d) => ({ serial: d.serial, where: d.where, model: 모델.get(`${d.where}:${d.serial}`) ?? d.serial, launchMs: null })),
    repeat: b.repeat, metrics: b.metrics, intervalSec: b.intervalSec, record: b.record, targets: b.targets, agentIds: [], monitorIds: [],
  };
  const r = await (await 표.풀()).query<{ id: string }>(
    `INSERT INTO perf_run (kind, service_id, env, base_url, config, status, origin, triggered_by, triggered_by_name)
     VALUES ('DEVICE', $1, $2, $3, $4, 'QUEUED', 'MANUAL', $5, $6) RETURNING id`,
    [b.serviceId, b.env, 줄.baseUrl, JSON.stringify(config), 누가.username, 누가.name],
  );
  const runId = Number(r.rows[0]?.id);
  await 표.로그(runId, `디바이스 성능 측정을 만들었습니다 — 디바이스 ${b.devices.length}대`);
  return { runId };
}

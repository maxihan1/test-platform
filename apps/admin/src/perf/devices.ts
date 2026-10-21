// 기기 성능 — 측정 요청 검사 · 실행 만들기 · 고를 수 있는 기기 목록 (도메인/성능 §3.9 「기기 성능」 · §7 「PERF-F1-08 이 연 통로」)

import { z } from 'zod';

import { 대상줄읽기 } from '../authoring/reverse.js';
import { 팜주소 } from '../execution/farm.js';
import { 기기목표 } from './deviceStats.js';
import * as 표 from './store.js';
import type { DeviceRunConfig } from './types.js';

export const 시리얼 = /^\w[\w.:-]{0,63}$/;
const 앱이름 = /^[A-Za-z]\w*(\.[A-Za-z]\w*)+$/;

export const 측정지표들 = ['FPS', 'JANK', 'CPU', 'MEM', 'TEMP', 'BATTERY'] as const;

export const 측정본문 = z.object({
  serviceId: z.number().int().positive(),
  env: z.string().min(1).max(100),
  drive: z.enum(['APPIUM', 'ALTTESTER', 'MANUAL']),
  caseIds: z.array(z.string().min(1).max(100)).min(1).max(20).optional(),
  durationSec: z.number().int().min(60).max(3600).optional(),
  build: z.object({ package: z.string().regex(앱이름).max(200) }),
  devices: z.array(z.object({ serial: z.string().regex(시리얼), where: z.enum(['FARM', 'LOCAL']) })).min(1).max(5),
  repeat: z.number().int().min(1).max(20),
  targets: z.array(기기목표).max(20),
  metrics: z.array(z.enum(측정지표들)).min(1).max(6),
  intervalSec: z.union([z.literal(1), z.literal(2), z.literal(5)]),
  record: z.boolean(),
}).superRefine((b, ctx) => {
  const 막음 = (message: string) => ctx.addIssue({ code: 'custom', message });
  if (new Set(b.devices.map((d) => d.serial)).size !== b.devices.length) 막음('기기가 겹칩니다');
  if (new Set(b.metrics).size !== b.metrics.length) 막음('측정 항목이 겹칩니다');
  if (b.caseIds !== undefined && new Set(b.caseIds).size !== b.caseIds.length) 막음('케이스가 겹칩니다');
  if (b.drive === 'APPIUM' && b.caseIds === undefined) 막음('Appium 은 케이스를 고릅니다');
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

/** 팜 기기(팜이 빈 폰이라 하면 IDLE)와 내 컴퓨터 러너 폰(늘 IDLE)을 합친다. 한쪽이 꺼졌거나 닿지 않으면 그쪽은 빈 목록이다 */
export async function 기기목록(): Promise<기기[]> {
  const 팜 = 팜주소();
  const 로컬 = 내컴퓨터러너();
  const [팜쪽, 로컬쪽] = await Promise.all([
    팜 === undefined ? [] : 팜기기들(팜),
    로컬 === undefined ? [] : 로컬기기들(로컬),
  ]);
  return [...팜쪽, ...로컬쪽];
}

async function 팜기기들(팜: string): Promise<기기[]> {
  try {
    const res = await fetch(`${팜}/api/devices`, { signal: AbortSignal.timeout(목록제한ms) });
    if (!res.ok) return [];
    const 몸 = (await res.json()) as { value?: { devices?: { serial?: unknown; state?: unknown; model?: unknown; osVersion?: unknown }[] } };
    return (몸.value?.devices ?? []).flatMap((d) =>
      typeof d.serial === 'string' && 시리얼.test(d.serial)
        ? [{ serial: d.serial, model: typeof d.model === 'string' ? d.model : d.serial, os: typeof d.osVersion === 'string' ? d.osVersion : '', where: 'FARM' as const, status: d.state === 'IDLE' ? ('IDLE' as const) : ('BUSY' as const) }]
        : [],
    );
  } catch {
    return [];
  }
}

async function 로컬기기들(로컬: string): Promise<기기[]> {
  try {
    const res = await fetch(`${로컬}/perf/devices`, { signal: AbortSignal.timeout(목록제한ms) });
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
    const res = await fetch(`${팜}/api/devices`, { signal: AbortSignal.timeout(목록제한ms) });
    if (!res.ok) return [];
    const 몸 = (await res.json()) as { value?: { devices?: { serial?: unknown; model?: unknown; osVersion?: unknown; resolution?: unknown }[] } };
    const 글 = (v: unknown) => (typeof v === 'string' ? v : '');
    return (몸.value?.devices ?? []).flatMap((d) =>
      typeof d.serial === 'string' && 시리얼.test(d.serial) ? [{ serial: d.serial, model: 글(d.model), osVersion: 글(d.osVersion), resolution: 글(d.resolution) }] : [],
    );
  } catch {
    return [];
  }
}

/** 요청한 케이스가 이 애플리케이션의 Android 케이스인가 — 아니면 까닭 */
async function 케이스검사(serviceId: number, caseIds: string[]): Promise<string | null> {
  const 접두사 = (await (await 표.풀()).query<{ prefix: string }>('SELECT prefix FROM service WHERE id = $1', [serviceId])).rows[0]?.prefix;
  if (접두사 === undefined) return '애플리케이션이 없습니다';
  const r = await (await 표.풀()).query<{ tc_id: string; platforms: string[] }>(
    `SELECT tc_id, platforms FROM test_case WHERE tc_id = ANY($1::text[]) AND split_part(tc_id, '-', 1) = $2`,
    [caseIds, 접두사],
  );
  const 행 = new Map(r.rows.map((x) => [x.tc_id, x]));
  for (const id of caseIds) {
    const x = 행.get(id);
    if (x === undefined) return `이 애플리케이션의 케이스가 아닙니다: ${id}`;
    if (!x.platforms.includes('android')) return `Android 앱 케이스가 아닙니다: ${id}`;
  }
  return null;
}

export async function 측정세우기(b: z.infer<typeof 측정본문>, 누가: { username: string | null; name: string | null }): Promise<{ runId: number } | 거절> {
  const 나쁨 = (detail: string): 거절 => ({ status: 400, error: 'INVALID_REQUEST', detail });
  const 종류 = (await (await 표.풀()).query<{ kind: string }>('SELECT kind FROM service WHERE id = $1', [b.serviceId])).rows[0]?.kind;
  if (종류 === undefined) return 나쁨('애플리케이션이 없습니다');
  if (종류 === 'API') return 나쁨('API 애플리케이션은 기기 성능을 잴 수 없습니다');
  if (b.drive === 'ALTTESTER') return 나쁨('AltTester 시나리오는 아직 못 합니다');
  const 줄 = await 대상줄읽기(b.serviceId, b.env);
  if (줄 === null) return 나쁨('대상 서버가 없습니다');
  if (b.drive === 'APPIUM') {
    const 케이스 = b.caseIds ?? [];
    const 까닭 = await 케이스검사(b.serviceId, 케이스);
    if (까닭 !== null) return 나쁨(까닭);
    if (줄.appPath === null) return 나쁨('대상 서버 줄에 앱 파일이 없습니다');
    if (b.devices.some((d) => d.where !== 'FARM')) return 나쁨('Appium 케이스는 팜 폰만 잴 수 있습니다');
  }
  if (b.devices.some((d) => d.where === 'FARM') && 팜주소() === undefined) return { status: 409, error: 'FARM_OFF' };
  if (b.devices.some((d) => d.where === 'LOCAL') && 내컴퓨터러너() === undefined) return 나쁨('이 서버에는 내 컴퓨터 러너(LOCAL_RUNNER_URL)가 연결되어 있지 않습니다');

  const 모델 = new Map((await 기기목록()).map((d) => [`${d.where}:${d.serial}`, d.model]));
  const config: DeviceRunConfig = {
    drive: b.drive, caseIds: b.caseIds ?? [], durationSec: b.durationSec ?? 0, package: b.build.package,
    devices: b.devices.map((d) => ({ serial: d.serial, where: d.where, model: 모델.get(`${d.where}:${d.serial}`) ?? d.serial, launchMs: null })),
    repeat: b.repeat, metrics: b.metrics, intervalSec: b.intervalSec, record: b.record, targets: b.targets, agentIds: [], monitorIds: [],
  };
  const r = await (await 표.풀()).query<{ id: string }>(
    `INSERT INTO perf_run (kind, service_id, env, base_url, config, status, origin, triggered_by, triggered_by_name)
     VALUES ('DEVICE', $1, $2, $3, $4, 'QUEUED', 'MANUAL', $5, $6) RETURNING id`,
    [b.serviceId, b.env, 줄.baseUrl, JSON.stringify(config), 누가.username, 누가.name],
  );
  const runId = Number(r.rows[0]?.id);
  await 표.로그(runId, `기기 성능 측정을 만들었습니다 — 기기 ${b.devices.length}대`);
  return { runId };
}

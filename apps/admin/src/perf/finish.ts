// 성능 실행을 닫는다 — 끝난 모양마다 상태 · 판정 · 까닭 짝을 정하고 요약 · 성능 저하를 쓴다 (도메인/성능 §3.9 「끝난 모양마다 상태 · 판정 · 까닭」)

import { 끝난뒤 } from './afterFinish.js';
import { 기기닫기, 기기지우기 } from './deviceRun.js';
import { 기기요약하기, 기기판정 } from './deviceStats.js';
import { 줄읽기 as 기기줄읽기 } from './deviceStore.js';
import { degraded, judge, judgeWindow, summary, type SecRow, type Stop } from './judge.js';
import { 단독쓰기 } from './pages.js';
import { 가운데값, 목표줄들, type 페이지표본 } from './pageStats.js';
import { 사유 } from './reasons.js';
import { 도는것 } from './state.js';
import * as 표 from './store.js';
import type { DeviceRunConfig, PageRunConfig } from './types.js';

// 배경에서 도는 뒷일 — 검사가 끝나기를 기다릴 수 있게만 붙들어 둔다
const 뒷일 = new Set<Promise<void>>();
export const 뒷일기다리기 = async (): Promise<void> => {
  await Promise.all([...뒷일]);
};

export type 끝 = { kind: 'DONE' } | { kind: 'STOP'; stop: Stop | { reason: 'USER' | 'AGENT_LOST' | 'SMOKE_FAILED' } } | { kind: 'ERROR'; why: string };

function 끝줄(v: 표.끝값): string {
  if (v.stopReason !== null) return 사유[v.stopReason] ?? v.stopReason;
  if (v.status === 'DONE') return `실행이 끝났습니다 — ${v.verdict === 'PASS' ? '통과' : '실패'}`;
  return '실행이 오류로 끝났습니다';
}

// 전체 줄과 성능 목표가 가리키는 트랜잭션 줄만 읽는다 — 24시간 실행의 모든 트랜잭션 줄을 메모리에 올리지 않는다
async function 판정줄(runId: number, scopes: string[]) {
  return 표.초읽기(runId, 0, 2 ** 31 - 1, ['', ...scopes]);
}

const 빈끝: 표.끝값 = { status: 'ERROR', verdict: null, stopReason: null, targets: null, peakVus: null, maxTps: null, p95: null, errorRate: null, degraded: null };

/**
 * 페이지 단독 측정 닫기 — 표본을 가운데 값으로 줄여 쓰고 판정한다. 못 잰 페이지가 하나라도 있으면 실패다.
 * 줄을 먼저 쓴다 — 화면이 「끝」을 보고 읽을 때 줄이 없으면 빈 표가 된다
 */
async function 페이지닫기(run: 표.실행행, samples: 페이지표본[], 끝: 끝): Promise<표.끝값 | null> {
  const cfg = run.config as unknown as PageRunConfig;
  const rows = 가운데값(samples);
  let 값 = 빈끝;
  let 오류: string | null = null;
  if (끝.kind === 'ERROR') 오류 = 끝.why;
  else if (끝.kind === 'STOP') 값 = { ...빈끝, status: 'STOPPED', stopReason: 끝.stop.reason };
  else if (rows.length === 0) 오류 = '페이지를 하나도 재지 못했습니다';
  else {
    const 못잰 = cfg.pages.filter((p) => !rows.some((r) => r.url === p.url));
    const targets = 목표줄들(rows);
    값 = { ...빈끝, status: 'DONE', verdict: 못잰.length === 0 && targets.every((t) => t.verdict === 'PASS') ? 'PASS' : 'FAIL', targets };
    if (못잰.length > 0) await 표.로그(run.id, `재지 못한 페이지 — ${못잰.map((p) => p.url).join(', ')}`, 'WARN');
    await 단독쓰기(run.id, cfg, rows);
  }
  if (오류 !== null) await 표.로그(run.id, `실행이 오류로 끝났습니다 — ${오류}`, 'WARN');
  if (!(await 표.끝쓰기(run.id, 값))) return null;
  await 표.로그(run.id, 끝줄(값));
  return 값;
}

/**
 * 기기 성능 닫기 — 기록기를 닫고 폰을 놓은 뒤 DB 줄로 기기마다 요약 · 판정한다(끝까지 재서 끝난 때만).
 * 앱 실행 시간은 기록기가 중간에 채우니 닫은 뒤에 실행을 다시 읽는다. 다른 닫기가 이미 하고 있으면 null
 */
async function 기기끝내기(runId: number, 끝: 끝): Promise<표.끝값 | null> {
  if (!(await 기기닫기(runId))) return null;
  // 맵에서 지우는 것은 끝쓰기까지 마친 뒤다 — 그 전에 지우면 고아닫기가 도는 실행을 오류로 닫는다
  try {
    const run = await 표.실행하나(runId);
    if (run === null) return null;
    const cfg = run.config as unknown as DeviceRunConfig;
    let 값 = 빈끝;
    let 오류: string | null = null;
    let 멈춤글: string | null = null;
    if (끝.kind === 'ERROR') 오류 = 끝.why;
    else if (끝.kind === 'STOP') {
      값 = { ...빈끝, status: 'STOPPED', stopReason: 끝.stop.reason };
      멈춤글 = 끝.stop.reason === 'AGENT_LOST' ? '기기에서 측정값이 오지 않아 중단했습니다' : (사유[끝.stop.reason] ?? 끝.stop.reason);
    } else {
      const rows = await 기기줄읽기(runId);
      if (rows.length === 0) 오류 = '기기 숫자를 하나도 받지 못했습니다';
      else {
        const targets = cfg.devices.flatMap((d) => 기기판정(d.serial, cfg.targets, 기기요약하기(rows.filter((r) => r.serial === d.serial)), d.launchMs));
        // 목표가 없어도 숫자를 한 줄도 안 보낸 기기가 통과로 세지면 안 된다
        const 빈기기 = cfg.devices.filter((d) => !rows.some((r) => r.serial === d.serial));
        if (빈기기.length > 0) await 표.로그(runId, `숫자를 받지 못한 기기 — ${빈기기.map((d) => `${d.model}(${d.serial})`).join(', ')}`, 'WARN');
        값 = { ...빈끝, status: 'DONE', verdict: 빈기기.length === 0 && targets.every((t) => t.verdict === 'PASS') ? 'PASS' : 'FAIL', targets };
      }
    }
    if (오류 !== null) await 표.로그(runId, `실행이 오류로 끝났습니다 — ${오류}`, 'WARN');
    if (!(await 표.끝쓰기(runId, 값))) return null;
    await 표.로그(runId, 멈춤글 ?? 끝줄(값));
    return 값;
  } finally {
    기기지우기(runId);
  }
}

async function 부하닫기(run: 표.실행행, 끝: 끝): Promise<{ 값: 표.끝값; 전체줄: SecRow[] } | null> {
  const runId = run.id;
  const targets = run.config.targets ?? [];
  const rows = await 판정줄(runId, targets.flatMap((t) => (t.scope ? [t.scope] : [])));
  const s = summary(rows);
  const base: 표.끝값 = { status: 'ERROR', verdict: null, stopReason: null, targets: null, peakVus: s.maxVus || null, maxTps: s.maxTps, p95: s.p95, errorRate: s.errorRate, degraded: null };
  let 값 = base;
  if (끝.kind === 'ERROR') {
    await 표.로그(runId, `실행이 오류로 끝났습니다 — ${끝.why}`, 'WARN');
  } else if (끝.kind === 'STOP' && !(끝.stop.reason === 'ERROR_LIMIT' || 끝.stop.reason === 'TARGET_EXCEEDED')) {
    값 = { ...base, status: 'STOPPED', stopReason: 끝.stop.reason };
  } else {
    const stop = 끝.kind === 'STOP' && (끝.stop.reason === 'ERROR_LIMIT' || 끝.stop.reason === 'TARGET_EXCEEDED') ? 끝.stop : null;
    const j = judge(judgeWindow(rows, stop?.atSec ?? null), targets);
    const prevId = await 표.이전실행(run);
    값 = {
      ...base,
      status: stop?.reason === 'ERROR_LIMIT' ? 'STOPPED' : 'DONE',
      verdict: stop === null ? j.verdict : 'FAIL',
      stopReason: stop?.reason ?? null,
      targets: j.targets,
      peakVus: stop?.reason === 'TARGET_EXCEEDED' ? stop.peakVus : base.peakVus,
      degraded: prevId === null ? null : degraded(rows, await 표.초읽기(prevId, 0, 2 ** 31 - 1, [''])),
    };
  }
  if (!(await 표.끝쓰기(runId, 값))) return null;
  await 표.로그(runId, 끝줄(값));
  return { 값, 전체줄: rows.filter((r) => r.tx === '') };
}

export async function 끝내기(runId: number, 끝: 끝): Promise<void> {
  const live = 도는것.get(runId);
  if (live?.ending) return;
  if (live) live.ending = true;
  // 닫힌 뒤에 할 일 — 분석 재료를 세고 Slack 을 부르는 동안 끝내기가 붙들려 있지 않게 finally 뒤에서 기다리지 않고 돌린다
  let 후속: { 값: 표.끝값; 전체줄: SecRow[]; 페이지: boolean } | null = null;
  try {
    const run = await 표.실행하나(runId);
    if (run === null) return;
    if (run.kind === 'DEVICE') {
      const 값 = await 기기끝내기(run.id, 끝);
      if (값 !== null) 후속 = { 값, 전체줄: [], 페이지: true };
    } else if (run.kind === 'PAGE') {
      const 값 = await 페이지닫기(run, live?.pageSamples ?? [], 끝);
      if (값 !== null) 후속 = { 값, 전체줄: [], 페이지: true };
    } else {
      const 닫음 = await 부하닫기(run, 끝);
      if (닫음 !== null) 후속 = { ...닫음, 페이지: false };
    }
  } finally {
    도는것.delete(runId);
  }
  if (후속 !== null) {
    const 일 = 끝난뒤(runId, 후속.값, 후속.전체줄, 후속.페이지)
      .catch((e: unknown) => console.error(`성능 실행 ${runId} 의 끝난 뒤 할 일이 깨졌습니다`, e))
      .finally(() => 뒷일.delete(일));
    뒷일.add(일);
  }
}

/** 타이머 · 배경에서 부르는 끝내기 — 던지면 admin 이 죽으므로 여기서 잡아 남긴다 */
export function 끝내기배경(runId: number, 끝: 끝): void {
  끝내기(runId, 끝).catch((e: unknown) => console.error(`성능 실행 ${runId} 을 닫지 못했습니다`, e));
}

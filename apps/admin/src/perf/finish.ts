// 성능 실행을 닫는다 — 끝난 모양마다 상태 · 판정 · 까닭 짝을 정하고 요약 · 성능 저하를 쓴다 (도메인/성능 §3.9 「끝난 모양마다 상태 · 판정 · 까닭」)

import { 끝난뒤 } from './afterFinish.js';
import { degraded, judge, judgeWindow, summary, type SecRow, type Stop } from './judge.js';
import { 사유 } from './reasons.js';
import { 도는것 } from './state.js';
import * as 표 from './store.js';

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

export async function 끝내기(runId: number, 끝: 끝): Promise<void> {
  const live = 도는것.get(runId);
  if (live?.ending) return;
  if (live) live.ending = true;
  // 닫힌 뒤에 할 일 — 분석 재료를 세고 Slack 을 부르는 동안 끝내기가 붙들려 있지 않게 finally 뒤에서 기다리지 않고 돌린다
  let 후속: { 값: 표.끝값; 전체줄: SecRow[] } | null = null;
  try {
    const run = await 표.실행하나(runId);
    if (run === null) return;
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
    if (await 표.끝쓰기(runId, 값)) {
      await 표.로그(runId, 끝줄(값));
      후속 = { 값, 전체줄: rows.filter((r) => r.tx === '') };
    }
  } finally {
    도는것.delete(runId);
  }
  if (후속 !== null) {
    const 일 = 끝난뒤(runId, 후속.값, 후속.전체줄)
      .catch((e: unknown) => console.error(`성능 실행 ${runId} 의 끝난 뒤 할 일이 깨졌습니다`, e))
      .finally(() => 뒷일.delete(일));
    뒷일.add(일);
  }
}

/** 타이머 · 배경에서 부르는 끝내기 — 던지면 admin 이 죽으므로 여기서 잡아 남긴다 */
export function 끝내기배경(runId: number, 끝: 끝): void {
  끝내기(runId, 끝).catch((e: unknown) => console.error(`성능 실행 ${runId} 을 닫지 못했습니다`, e));
}

// 성능 실행을 닫는다 — 끝난 모양마다 상태 · 판정 · 까닭 짝을 정하고 요약 · 성능 저하를 쓴다 (도메인/성능 §3.9 「끝난 모양마다 상태 · 판정 · 까닭」)

import { AGENT_LOST_SEC, ERROR_LIMIT_PCT, STREAK_SEC, degraded, judge, judgeWindow, summary, type Stop } from './judge.js';
import { 끝난뒤 } from './afterFinish.js';
import { 도는것 } from './state.js';
import * as 표 from './store.js';

export type 끝 = { kind: 'DONE' } | { kind: 'STOP'; stop: Stop | { reason: 'USER' | 'AGENT_LOST' | 'SMOKE_FAILED' } } | { kind: 'ERROR'; why: string };

const 사유: Record<string, string> = {
  TARGET_EXCEEDED: `성능 목표를 ${STREAK_SEC}초 이어 벗어나 자동 중단했습니다`,
  ERROR_LIMIT: `에러율 ${ERROR_LIMIT_PCT}% 이상이 ${STREAK_SEC}초 이어져 대상 서버를 지키려고 자동 중단했습니다`,
  AGENT_LOST: `부하 발생 에이전트가 ${AGENT_LOST_SEC}초 동안 연락이 없어 중단했습니다`,
  SMOKE_FAILED: '스모크 테스트에서 에러가 나 본 테스트를 하지 않았습니다',
  USER: '실행을 중단했습니다',
};

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
      await 끝난뒤(runId, 값);
    }
  } finally {
    도는것.delete(runId);
  }
}

/** 타이머 · 배경에서 부르는 끝내기 — 던지면 admin 이 죽으므로 여기서 잡아 남긴다 */
export function 끝내기배경(runId: number, 끝: 끝): void {
  끝내기(runId, 끝).catch((e: unknown) => console.error(`성능 실행 ${runId} 을 닫지 못했습니다`, e));
}

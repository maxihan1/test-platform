// 더미 클라이언트가 표준 출력에 한 줄씩 쓰는 결과를 1초 · 트랜잭션별 숫자로 묶고, 가상 사용자 수는 단계에서 셈한다 (도메인/성능 §3.9 「게임 서버 부하」)

import { bucketOf, emptyHist } from './hist.js';
import type { LoadSecond, TxSecond } from './types.js';

export interface Stage {
  durationSec: number;
  target: number;
}

// QA Hub 가 받는 1초 숫자의 상한(§5.4 — 이름 200자 · 한 초에 트랜잭션 500개)과 같다. 넘는 줄은 버린다 — 그 초 숫자가 통째로 거절되지 않게
const TX_NAME_MAX = 200;
const TX_PER_SEC_MAX = 500;
// 실행 시간 뒤로 이만큼까지만 센다. 단위가 틀린 시각(µs) 하나가 빈 초 수만 개를 보내게 하지 않으려고
const LATE_SEC = 60;

export interface DummyLine {
  t: number;
  tx: string;
  ms: number;
  ok: boolean;
}

/** 깨진 줄 · 꼴이 틀린 줄은 null — 던지지 않는다. 회사가 만든 프로그램의 출력이라 무슨 줄이든 올 수 있다 */
export function parseLine(line: string): DummyLine | null {
  if (!line.startsWith('{')) return null;
  try {
    const x = JSON.parse(line) as Partial<DummyLine> | null;
    if (typeof x?.t !== 'number' || !Number.isFinite(x.t) || typeof x.tx !== 'string' || x.tx === '' || x.tx.length > TX_NAME_MAX || typeof x.ms !== 'number' || !Number.isFinite(x.ms) || x.ms < 0 || typeof x.ok !== 'boolean') return null;
    return { t: x.t, tx: x.tx, ms: x.ms, ok: x.ok };
  } catch {
    return null;
  }
}

/** QAHUB_STAGES 를 읽는다. 깨졌으면 사용자 수를 실행 시간 내내 두는 한 단계로 본다 */
export function parseStages(json: string | undefined, users: number, durationSec: number): Stage[] {
  try {
    const x = JSON.parse(json ?? '') as unknown;
    if (Array.isArray(x) && x.length > 0 && x.every((s): s is Stage => typeof s?.durationSec === 'number' && typeof s?.target === 'number' && s.durationSec > 0 && s.target >= 0)) return x;
  } catch {
    // 아래의 한 단계로 간다
  }
  return [{ durationSec, target: users }];
}

/** 그 초가 끝나는 때의 계획 사용자 수 — k6 ramping-vus 처럼 0 에서 단계마다 선형으로 오른다. 단계가 끝난 뒤는 0 이다 */
export function plannedVus(stages: Stage[], sec: number): number {
  const t = sec + 1;
  let from = 0;
  let prev = 0;
  for (const s of stages) {
    if (t <= from + s.durationSec) return Math.round(prev + ((s.target - prev) * (t - from)) / s.durationSec);
    from += s.durationSec;
    prev = s.target;
  }
  return 0;
}

export class DummySeconds {
  private bins = new Map<number, Map<string, TxSecond>>();
  // 한 번 보낸 초. 늦게 온 조각의 vus 를 0 으로 둬야 QA Hub 가 더해도 두 번 세지 않는다(§5.4)
  private taken = new Set<number>();

  private readonly lastSec: number;

  // startMs 는 이 에이전트 시계로 옮긴 startAt 이다
  constructor(private readonly startMs: number, private readonly stages: Stage[]) {
    this.lastSec = stages.reduce((n, s) => n + s.durationSec, 0) + LATE_SEC;
  }

  add(line: string): void {
    const p = parseLine(line);
    if (p === null) return;
    const sec = Math.max(0, Math.floor((p.t - this.startMs) / 1000));
    if (sec > this.lastSec) return;
    let bin = this.bins.get(sec);
    if (!bin) this.bins.set(sec, (bin = new Map()));
    let tx = bin.get(p.tx);
    if (!tx) {
      if (bin.size >= TX_PER_SEC_MAX) return;
      bin.set(p.tx, (tx = { name: p.tx, requests: 0, errors: 0, hist: emptyHist() }));
    }
    tx.requests += 1;
    tx.hist[bucketOf(p.ms)] += 1;
    if (!p.ok) tx.errors += 1;
  }

  // 줄이 하나도 없던 초도 보낸다 — 실행 중에는 1초 숫자가 곧 연락이라서다(§5.4)
  take(sec: number): LoadSecond {
    const bin = this.bins.get(sec);
    this.bins.delete(sec);
    const vus = this.taken.has(sec) ? 0 : plannedVus(this.stages, sec);
    this.taken.add(sec);
    return { sec, vus, txs: bin ? [...bin.values()] : [] };
  }

  leftovers(): number[] {
    return [...this.bins.keys()].sort((a, b) => a - b);
  }
}

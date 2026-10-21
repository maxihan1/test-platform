// k6 JSON 출력 줄을 1초 · 트랜잭션별 요청 수 · 에러 수 · 분포로 묶는다 (도메인/성능 §5.4 「1초 숫자」)

import { bucketOf, emptyHist } from './hist.js';
import type { LoadSecond, TxSecond } from './types.js';

// 요청 하나에 k6 가 14줄을 내는데 쓰는 것은 넷뿐이다. 높은 TPS 에서 JSON.parse 가 CPU 를 가장 많이 먹어 머리 글자로 먼저 거른다
const WANTED = ['{"metric":"http_req_duration","type":"Point"', '{"metric":"http_req_failed","type":"Point"', '{"metric":"checks","type":"Point"', '{"metric":"vus","type":"Point"'];

interface Point {
  metric: string;
  data: { time: string; value: number; tags: Record<string, string> | null };
}

interface Bin {
  vus: number;
  txs: Map<string, TxSecond>;
}

export class Seconds {
  private bins = new Map<number, Bin>();
  // 한 번 보낸 초. 늦게 온 조각의 vus 를 0 으로 둬야 QA Hub 가 더해도 두 번 세지 않는다(§5.4)
  private taken = new Set<number>();

  // startMs 는 이 에이전트 시계로 옮긴 startAt 이다. sec 는 거기서 센 초다
  constructor(private readonly startMs: number) {}

  add(line: string): void {
    if (!WANTED.some((w) => line.startsWith(w))) return;
    const p = JSON.parse(line) as Point;
    const sec = Math.max(0, Math.floor((Date.parse(p.data.time) - this.startMs) / 1000));
    const bin = this.bin(sec);
    if (p.metric === 'vus') {
      bin.vus = p.data.value;
      return;
    }
    // 생성기는 요청마다 tx 꼬리표를 단다(§3.9 「스크립트는 생성기가 만든다」). 꼬리표 없는 요청은 셀 트랜잭션이 없다
    const name = p.data.tags?.tx;
    if (!name) return;
    let tx = bin.txs.get(name);
    if (!tx) {
      tx = { name, requests: 0, errors: 0, hist: emptyHist() };
      bin.txs.set(name, tx);
    }
    if (p.metric === 'http_req_duration') {
      tx.requests += 1;
      tx.hist[bucketOf(p.data.value)] += 1;
    } else if (p.metric === 'http_req_failed' ? p.data.value === 1 : p.data.value === 0) {
      // 상태 코드가 어긋난 요청은 http_req_failed 로, 본문 검증 실패는 checks 로 센다 — 생성기가 둘을 겹치지 않게 쓴다(§3.9)
      tx.errors += 1;
    }
  }

  // 그 초를 꺼내 지운다. 줄이 하나도 없던 초도 보낸다 — 실행 중에는 1초 숫자가 곧 연락이라서다(§5.4)
  take(sec: number): LoadSecond {
    const bin = this.bins.get(sec);
    this.bins.delete(sec);
    const vus = this.taken.has(sec) ? 0 : (bin?.vus ?? 0);
    this.taken.add(sec);
    return { sec, vus, txs: bin ? [...bin.txs.values()] : [] };
  }

  // 이미 보낸 초에 늦게 온 줄이 남긴 칸. QA Hub 는 늦게 온 숫자를 그 행에 더한다(§5.4)
  leftovers(): number[] {
    return [...this.bins.keys()].sort((a, b) => a - b);
  }

  private bin(sec: number): Bin {
    let bin = this.bins.get(sec);
    if (!bin) {
      bin = { vus: 0, txs: new Map() };
      this.bins.set(sec, bin);
    }
    return bin;
  }
}

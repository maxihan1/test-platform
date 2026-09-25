// 실행 조회 응답의 모양 (SPEC 도메인/실행 §7). queries.ts 가 300줄을 넘어 떼어 냈다

import type { ItemStatus, Platform, StepResult } from '@platform/kit';

export interface RunCounts {
  total: number;
  pass: number;
  fail: number;
  na: number;
  running: number;
  // 미확정 항목 묶음. total 은 진행 중까지, pass·fail·na 는 끝난 것만이다 (SPEC 실행 §3.2 · §7)
  unconfirmed: { total: number; pass: number; fail: number; na: number };
}

export interface RunSummary {
  runId: number;
  title: string;
  triggeredBy: string;
  // 그때의 이름을 박제한 값. 계정 이름을 바꾸거나 지워도 과거 기록이 흔들리지 않는다 (SPEC §6 · §8.7)
  triggeredByName: string | null;
  env: string;
  // 그날 실제로 친 주소. env→주소 대응표가 바뀌어도 남는다 (SPEC §6 · §8.3 RUN 머리)
  baseUrl: string;
  // 실행 시점 서비스 이름. 설정에서 이름을 고쳐도 과거 기록은 그대로다 (SPEC §6 · §8.4)
  serviceName: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  counts: RunCounts;
}

export interface RunItemSummary {
  historyId: number;
  tcId: string;
  tcName: string;
  platform: Platform;
  // 목록의 「어떤 값으로 돌린 결과인가」 한 줄이 쓴다 (SPEC §8.3).
  // 라벨은 항목에 박제된 스키마에서 읽는다 — 카탈로그를 읽으면 과거 증적의 라벨이 바뀐다 (§3.3)
  params: Record<string, unknown>;
  paramSchema: Record<string, unknown>;
  // 같은 케이스×디바이스를 몇 번째로 돌렸는지. 목록의 회차 요약이 이 값으로 센다 (SPEC §8.3)
  attempt: number;
  status: ItemStatus;
  durationMs: number | null;
  error: { message: string; stack?: string } | null;
  startedAt: string;
  finishedAt: string | null;
  // 실행을 만들 때 박제한 미확정 사유. 지금의 케이스를 읽으면 확정된 뒤 옛 실행이 바뀌어 보인다 (SPEC 실행 §8.3)
  unconfirmed: string | null;
}

export interface RunItemDetail extends RunItemSummary {
  runId: number;
  runTitle: string;
  precondition: string[];
  expected: Record<string, unknown>;
  // 기대결과 칸의 라벨. 카탈로그는 스캔 때마다 덮어쓰는 캐시라 못 믿는다 (SPEC §3.3 · §6).
  // params·paramSchema 는 RunItemSummary 에 있다 — 목록도 같은 값을 쓴다 (§8.3)
  expectedSchema: Record<string, unknown>;
  steps: StepResult[];
}

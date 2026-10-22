// 더미 클라이언트 실행의 일 만들기 — 환경값 · 에이전트별 사용자 몫 · 단계 줄이기 (도메인/성능 §3.9 「게임 서버 부하」 · §5.4)

import type { Job } from './state.js';
import { 풀 } from './store.js';
import type { Stage } from './types.js';

export const 스모크초 = 60;
// 0 에서 선형으로 오르는 셈(에이전트 · 클라이언트)이 첫 초부터 1명이 되게 1초 만에 오른다 — k6 스모크(constant-vus 1명)와 같다
export const 스모크단계: Stage[] = [{ durationSec: 1, target: 1 }, { durationSec: 스모크초 - 1, target: 1 }];

export interface 더미 {
  id: number;
  command: string;
}

export async function 더미읽기(id: number): Promise<더미 | null> {
  const r = await (await 풀()).query<{ command: string }>('SELECT command FROM perf_dummy_client WHERE id = $1', [id]);
  return r.rows[0] === undefined ? null : { id, command: r.rows[0].command };
}

/** 합이 total 이 되게 weights 비율로 나눈다(최대 나머지 방식 — 같으면 앞 에이전트가 먼저 받는다). 몫이 0 인 에이전트도 생긴다 */
export function 몫나누기(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  const base = weights.map((w) => Math.floor((total * w) / sum));
  const order = weights.map((w, i) => ({ i, rem: (total * w) % sum })).sort((a, b) => b.rem - a.rem || a.i - b.i);
  let left = total - base.reduce((a, b) => a + b, 0);
  for (const { i } of order) {
    if (left <= 0) break;
    base[i] = (base[i] ?? 0) + 1;
    left -= 1;
  }
  return base;
}

/** 단계마다 목표를 에이전트 몫(users) 비율로 나눈다 — 단계마다 몫나누기라 에이전트 합이 늘 그 단계 목표와 같다. 돌려주는 것은 에이전트마다의 단계 목록이다 */
export function 단계나누기(stages: Stage[], users: number[]): Stage[][] {
  const sum = users.reduce((a, b) => a + b, 0);
  const 단계별 = stages.map((s) => (sum === 0 ? users.map(() => 0) : 몫나누기(s.target, users)));
  return users.map((_, i) => stages.map((s, k) => ({ durationSec: s.durationSec, target: 단계별[k]?.[i] ?? 0 })));
}

/** 환경값으로 줄 대상 칸 — 포트가 없으면 https 443 · http 80 */
export function 대상칸(baseUrl: string): { host: string; port: string } {
  const u = new URL(baseUrl);
  return { host: u.hostname, port: u.port || (u.protocol === 'https:' ? '443' : '80') };
}

export function 더미일칸(baseUrl: string, env: Record<string, string>, d: 더미, users: number, durationSec: number, stages: Stage[], accountsCsv: string | undefined): Pick<Job, 'script' | 'env' | 'dummyClient' | 'durationSec' | 'accountsCsv'> {
  const { host, port } = 대상칸(baseUrl);
  return {
    script: null,
    durationSec,
    dummyClient: { id: d.id, command: d.command, users },
    env: { ...env, QAHUB_HOST: host, QAHUB_PORT: port, QAHUB_USERS: String(users), QAHUB_DURATION_SEC: String(durationSec), QAHUB_STAGES: JSON.stringify(stages) },
    // 몫이 없는 에이전트에게 계정(비밀값)을 보내지 않는다
    ...(accountsCsv !== undefined && users > 0 ? { accountsCsv } : {}),
  };
}

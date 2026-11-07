// 호환성 실행 결과를 모아 통로 꼴로 — 결과 화면 · 세트 목록 최근 실행 · 실행 기록 줄 · 알림이 같이 읽는다 (도메인/호환성 §7 「결과」)

import { 결과셈 } from './result.js';
import { 상태들읽기, 실행머리읽기, 케이스들읽기, 판정들읽기, 화면들읽기 } from './runRead.js';
import { 셈하기 } from './select.js';
import { 재료읽기 } from './store.js';

const 장소인가 = (k: string) => k.startsWith('game:World/zone:');

type 재료캐시 = Map<number, ReturnType<typeof 재료읽기>>;

/**
 * 재료캐시를 넘기면 같은 애플리케이션의 재료(전체 화면 목록 · 케이스)를 한 번만 읽는다 — 알림 · 실행 기록 쪽은 실행이 여럿이다.
 * 요약만 이면 미커버 화면 셈을 건너뛴다(요약이 안 쓴다)
 */
export async function 호환성결과(runId: number, 캐시: 재료캐시 = new Map(), 요약만 = false) {
  const 머리 = await 실행머리읽기(runId);
  if (머리 === null) return null;
  const 재약속 = 캐시.get(머리.serviceId) ?? 재료읽기(머리.serviceId, 머리.prefix);
  캐시.set(머리.serviceId, 재약속);
  const [상태들, 케이스들, 화면들, 판정들, 재] = await Promise.all([상태들읽기(runId), 케이스들읽기(runId), 화면들읽기(runId), 판정들읽기(runId), 재약속]);
  const 후보 = new Map(재.후보들.map((c) => [c.tcId, c]));
  const 쓴 = [...new Set(케이스들.map((c) => c.tcId))];
  const 셈 = 결과셈({
    상태들,
    케이스들,
    화면들,
    판정들,
    // 장소는 화면 커버리지에만 센다 — 찍힌 화면은 창으로만 찾아 결과 표에 장소 줄이 서지 않는다 (§3.13 「자동 선택」)
    지나는: new Map(쓴.map((t) => [t, (후보.get(t)?.틀 ?? []).filter((k) => !장소인가(k))])),
    화면수: new Map(쓴.map((t) => [t, 후보.get(t)?.화면수 ?? 0])),
    이름: new Map(재.전체.map((u) => [u.key, u.name])),
  });
  // 미커버 화면은 그때 박제한 케이스(상태마다 같다)로 지금 전체 화면 목록을 다시 센다
  const uncovered = 요약만 ? [] : 셈하기(재.전체, 재.후보들, 쓴, 재.fallback, []).uncovered;
  const { affected, ...보임 } = 셈;
  return {
    run: { runId, setId: 머리.setId, title: 머리.title, env: 머리.env, buildNo: 머리.buildNo, startedAt: 머리.startedAt, finishedAt: 머리.finishedAt, state: 머리.status, startedBy: 머리.startedBy },
    ...보임,
    uncovered,
    // 실행 기록 줄 · 알림이 쓴다 — 결과 통로 응답에는 안 싣는다
    요약: {
      setName: 머리.title,
      devices: 셈.counts.devices,
      screens: 셈.counts.screens,
      confirmed: 셈.counts.confirmed,
      pending: 셈.counts.pending,
      affected,
      unchecked: 셈.counts.unchecked,
      stopReason: 상태들.find((d) => d.state === 'STOPPED')?.skipReason ?? null,
      states: { done: 상태들.filter((d) => d.state === 'DONE' || d.state === 'SKIPPED' || d.state === 'STOPPED').length, total: 상태들.length },
      checks: 셈.devices.reduce((a, d) => ({ done: a.done + d.checks.done, total: a.total + d.checks.total }), { done: 0, total: 0 }),
      started: 머리.startedAt,
      status: 머리.status,
    },
  };
}

export type 호환성요약 = NonNullable<Awaited<ReturnType<typeof 호환성결과>>>['요약'];

/** 여러 실행의 요약. 없는 번호는 빠진다 */
export async function 호환성요약들(runIds: readonly number[]): Promise<Map<number, 호환성요약>> {
  const 캐시: 재료캐시 = new Map();
  const 결과 = await Promise.all(runIds.map(async (id) => [id, (await 호환성결과(id, 캐시, true))?.요약] as const));
  return new Map(결과.flatMap(([id, s]) => (s === undefined ? [] : [[id, s] as const])));
}

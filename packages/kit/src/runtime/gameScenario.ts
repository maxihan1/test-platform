// 게임 시나리오 도구 — 판정에 안 드는 정리 자리 · 게임 로그 구간 · 미션 멈춤 감시 (공통/3-공유계약 「게임 시나리오 도구」)

import type { StepResult } from '../types.js';
import { runScope, stepScope, type RunScope, type StepScope } from './context.js';
import { 알린다 } from './progress.js';

/** 번호가 -GS- 인 케이스 — 전체 제한 시간을 안 건다 (도메인/게임 §3.10 결정 21) */
export const 게임시나리오인가 = (tcId: string): boolean => /-GS-\d{3}$/.test(tcId);

// 정리가 실패해도 항목 판정을 바꾸지 않게 NA 로 남긴다. run.failed · stopped · 준비 구간 표시는 건드리지 않는다
async function 정리절차(run: RunScope, title: string, fn: () => Promise<void>): Promise<void> {
  const seq = ++run.seq;
  알린다(seq, title);
  // 정리 안의 admin 호출도 절차 기록에 남게 절차 문맥을 깔아 준다
  const scope: StepScope = { assertions: [] };
  const startedAt = Date.now();
  let error: StepResult['error'];
  try {
    await stepScope.run(scope, fn);
  } catch (thrown) {
    const err = thrown instanceof Error ? thrown : new Error(String(thrown));
    error = { message: err.message, ...(err.stack === undefined ? {} : { stack: err.stack }) };
  }
  const result: StepResult = {
    seq,
    title,
    status: error === undefined ? 'PASS' : 'NA',
    durationMs: Date.now() - startedAt,
    startedAt: new Date(startedAt).toISOString(),
    assertions: [],
  };
  if (scope.httpTrace !== undefined) result.httpTrace = scope.httpTrace;
  if (error !== undefined) result.error = error;
  await run.emit(result);
}

/**
 * 판정에 안 드는 정리 자리. 몸통 맨 앞에서 부른다 — 지금 한 번(시작 정리), 몸통이 어떻게 끝나든 한 번 더(끝 정리).
 * 시작에도 도는 까닭 — 사람이 멈추거나 러너가 프로세스를 끊으면 끝 정리가 안 돈다. 다음 테스트가 줍는다 (도메인/게임 §3.10 결정 20)
 */
export async function cleanup(title: string, fn: () => Promise<void>): Promise<void> {
  const run = runScope.getStore();
  if (!run) throw new Error(`정리 '${title}'을 케이스 밖에서 선언했다. kit의 test(spec, ...) 안에서만 부를 수 있다`);
  (run.정리 ??= []).push({ title, fn });
  await 정리절차(run, `시작 정리 — ${title}`, fn);
}

/** 몸통이 끝난 뒤 — 실패 증적을 남긴 뒤 · 앱 연결을 닫기 전에 부른다 */
export async function 끝정리(run: RunScope): Promise<void> {
  for (const c of run.정리 ?? []) await 정리절차(run, `끝 정리 — ${c.title}`, c.fn);
}

/**
 * 게임 로그 구간. 줄 꼴은 모른다 — read 는 상태 도우미가 만든다. 부르는 순간의 마지막 번호를 시작으로 적고 lines() 는 그 뒤 줄을 준다.
 * 로그를 지우지 않는다 — 같은 서버를 다른 실행이 같이 쓴다 (도메인/게임 §3.10 「게임 시나리오」)
 */
export async function gameLog<L>(
  read: (since: number | null) => Promise<{ last: number; lines: L[] }>,
): Promise<{ start: number; lines(): Promise<L[]> }> {
  const start = (await read(null)).last;
  return {
    start,
    async lines() {
      const r = await read(start);
      // kit 은 줄 꼴을 몰라 번호가 줄었는지만 본다. 밀려난 앞 줄은 줄 번호를 아는 상태 도우미가 본다
      if (r.last < start) throw new Error(`게임 로그 번호가 처음부터 다시 시작됐습니다 (시작 ${start} · 지금 ${r.last})`);
      return r.lines;
    },
  };
}

/**
 * 되풀이 조작 · 미션 멈춤 감시. 전체 한도는 없다 — 진행 값이 stallMs 동안 안 늘 때만 끝낸다 (도메인/게임 §3.10 결정 21 ②).
 * 멈춤은 act 사이에서만 본다 — act 는 한 번 조작으로 짧게 쓴다
 */
export async function repeatUntil(
  act: () => Promise<void>,
  options: { progress: () => Promise<number>; goal: number; stallMs: number },
): Promise<number> {
  let 최고 = -Infinity;
  let 늘어난때 = Date.now();
  for (;;) {
    await act();
    const 값 = await options.progress();
    if (값 >= options.goal) return 값;
    if (값 > 최고) {
      최고 = 값;
      늘어난때 = Date.now();
    } else if (Date.now() - 늘어난때 >= options.stallMs) {
      throw new Error(`미션이 ${options.stallMs / 1000}초 동안 나아가지 않았습니다 (진행 ${값} / 목표 ${options.goal})`);
    }
  }
}

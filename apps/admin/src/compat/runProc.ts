// 호환성 실행의 테스트 프로시저 한 번 — 프로시저의 케이스 줄을 요청 하나로 보내고 케이스마다 결과를 적는다 (도메인/호환성 §3.13 「테스트 프로시저」)
// runEngine.ts 가 300줄을 넘지 않게 뗐다. 폰 연결 준비(연결칸)는 옛 꼴 케이스와 같이 쓴다

import type { ExecuteRequest, ExecuteResponse, StepResult } from '@platform/kit';

import { 엔진칸 } from '../execution/engineField.js';
import { 잡기를늘린다 } from '../execution/farm.js';
import { 보낸다 } from '../execution/runner.js';
import { Chrome켜기, 프로시저점검기다리기 } from './runCheck.js';
import type { 도는실행, 실행재료 } from './runEngine.js';
import type { 실행케이스 } from './runRead.js';
import { 기기채우기, 케이스끝, 케이스시작 } from './runStore.js';

/** 상태 하나의 케이스 줄을 도는 단위로 묶는다 — 같은 exec_id 의 줄이 프로시저 하나, exec_id 가 빈 줄은 따로 하나다. 줄 차례는 박제 차례 그대로다 */
export function 단위로(케이스들: readonly 실행케이스[]): 실행케이스[][] {
  const 단위: 실행케이스[][] = [];
  const 프로시저 = new Map<number, 실행케이스[]>();
  for (const c of 케이스들) {
    if (c.execId === null) {
      단위.push([c]);
      continue;
    }
    const 앞 = 프로시저.get(c.execId);
    if (앞 !== undefined) 앞.push(c);
    else {
      const 새 = [c];
      프로시저.set(c.execId, 새);
      단위.push(새);
    }
  }
  return 단위;
}

/**
 * 폰 연결 한 번에 실을 칸 — 앱 · 게임은 비전 점검을 켜고(`uiCheck`) 앱 · 엔진을 싣는다. 모바일 웹은 admin 이 점검을 켠 Chrome 을 켠다
 * (비전 안내서 13절 「UI 점검」). Chrome 을 못 켜면 까닭이다
 */
export async function 연결칸(
  재: 실행재료,
  platform: 'android' | 'mobile',
  serial: string,
): Promise<{ 칸: Partial<ExecuteRequest>; Chrome세션: string | undefined } | { 까닭: string }> {
  if (platform === 'android') return { 칸: { uiCheck: true, ...(재.app !== null && { app: 재.app }), ...엔진칸(재.serviceKind, 'android', 재.adminKey) }, Chrome세션: undefined };
  const 켬 = await Chrome켜기(재, serial);
  if ('까닭' in 켬) return 켬;
  return { 칸: { cdpUrl: 켬.cdpUrl }, Chrome세션: 켬.sessionId };
}

const 없어짐 = '케이스가 없어졌거나 디바이스에서 실행되지 않습니다';
const 늘리는ms = 5 * 60_000;

/** compat_run_case.steps 에 남기는 꼴 */
export const 단계꼴 = (steps: readonly StepResult[]) => steps.map((x) => ({ seq: x.seq, title: x.title, status: x.status, durationMs: x.durationMs, ...(x.startedAt === undefined ? {} : { startedAt: x.startedAt }) }));

/**
 * 프로시저 하나 — 요청의 historyId 는 exec_id, 한도는 케이스 줄 한도의 합이다. 답의 케이스 결과를 줄마다 적고(판정 · 사유 · 막은 케이스)
 * 점검은 그 프로시저에 하나라 케이스 줄이 같은 점검 상태를 든다. 지워진 케이스는 빼고 보낸다
 */
export async function 프로시저돌기(재: 실행재료, s: 도는실행, seq: number, serial: string, 줄들: 실행케이스[]): Promise<void> {
  const execId = 줄들[0]!.execId!;
  const 있는 = 줄들.filter((c) => 재.케이스.has(c.tcId));
  for (const c of 줄들) if (!재.케이스.has(c.tcId)) await 케이스끝(c.id, { status: 'NA', failedStep: null, steps: [], error: { message: 없어짐 }, checkState: null });
  const 첫 = 있는[0] === undefined ? undefined : 재.케이스.get(있는[0].tcId);
  if (첫 === undefined) return;
  const 닫기 = async (까닭: string) => {
    for (const c of 있는) await 케이스끝(c.id, { status: 'NA', failedStep: null, steps: [], error: { message: 까닭 }, checkState: null });
  };
  const 연결 = await 연결칸(재, 첫.platform, serial);
  if ('까닭' in 연결) return 닫기(연결.까닭);
  const 요청: ExecuteRequest = {
    runId: 재.runId,
    historyId: execId,
    platform: 첫.platform,
    filePath: 있는[0]!.filePath,
    baseUrl: 재.baseUrl,
    ...(첫.procId !== undefined && { procId: 첫.procId }),
    cases: 있는.map((c) => ({ tcId: c.tcId, params: 재.케이스.get(c.tcId)!.params, expected: 재.케이스.get(c.tcId)!.expected })),
    timeoutMs: 있는.reduce((n, c) => n + c.timeoutMs, 0),
    udid: serial,
    ...(재.토큰 !== undefined && { farmToken: 재.토큰 }),
    ...연결.칸,
  };
  if (s.멈춤) return;
  for (const c of 있는) await 케이스시작(c.id);
  s.도는케이스 = execId;
  // 프로시저 하나가 케이스 수 × 5분까지 돈다 — 보내기 전 한 번으로는 모자라 도는 동안에도 늘린다. 팜은 끝나기 10분 전부터만 받는다 (실행 execUnit.ts 도는동안늘린다와 같다)
  const 늘리기 = setInterval(() => void 잡기를늘린다(재.팜, serial, fetch, 재.토큰).catch(() => undefined), 늘리는ms);
  let 답: ExecuteResponse;
  try {
    답 = await 보낸다(요청);
  } finally {
    clearInterval(늘리기);
  }
  s.도는케이스 = null;
  const 끝 = Date.now();
  const 점검받나 = 첫.platform === 'android' || 연결.Chrome세션 !== undefined;
  if (답.device != null) await 기기채우기(재.runId, seq, 답.device);
  for (const c of 있는) {
    const r = 답.results.find((x) => x.tcId === c.tcId);
    await 케이스끝(c.id, {
      status: r?.status ?? 'NA',
      failedStep: r?.steps.find((x) => x.status === 'FAIL')?.seq ?? null,
      steps: 단계꼴(r?.steps ?? []),
      // 러너는 요청의 케이스를 다 채워 답한다 — 없으면 판정 밖 사유(답 맨 위 error)를 싣는다
      error: r === undefined ? (답.error ?? { message: '러너가 이 케이스의 결과를 주지 않았습니다' }) : (r.error ?? null),
      checkState: 점검받나 ? 'checking' : null,
      blockedBy: r?.blockedBy ?? null,
    });
  }
  if (!점검받나) return;
  // 찍힌 화면은 찍은 시각에 든 절차의 케이스 것이다 — 절차 번호는 프로시저 전체에서 이어진다
  const 단계들 = 답.results.flatMap((r) => r.steps.map((x) => ({ seq: x.seq, durationMs: x.durationMs, ...(x.startedAt !== undefined && { startedAt: x.startedAt }), tcId: x.tcId ?? r.tcId })));
  s.점검들.push(
    프로시저점검기다리기(재, execId, 있는.map((c) => ({ id: c.id, tcId: c.tcId, 파일들: 재.케이스.get(c.tcId)!.파일들 })), 끝, 단계들, 연결.Chrome세션, 재.앱파일들),
  );
}

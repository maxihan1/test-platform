// E2E 실행 · 시험 실행의 trace.zip 을 풀어 실패한 부품 몫만 가려 돌려준다 (SPEC 도메인/시나리오 §7 「실패 기록」)
// 파서 · 가림은 케이스 정식 실행 적재(execution/traceIngest.ts)와 같다. 한 zip 에 부품이 다 섞여 단계 번호(시나리오 전체에서 이어진다)로 가른다

import { unlink } from 'node:fs/promises';
import { join } from 'node:path';

import type { ScenarioExecuteResponse, ScenarioPart } from '@platform/kit';

import { artifactsDir, 볼륨파일읽기 } from '../artifactFile.js';
import { trace가린다 } from '../execution/traceIngest.js';
import { trace를푼다, type 네트워크줄, type 조작줄, type 콘솔줄 } from '../execution/traceParse.js';
import { trace없는까닭 } from '../execution/traceReason.js';
import { 긴것부터, 비밀글자들 } from '../execution/trial.js';
import { 가린값들 } from '../web/mask.js';

/** 러너가 옮겨 두는 자리 — 사진 옆이다 (도메인/러너 §5.2). 시험 실행은 trialId 로 */
export const 시나리오trace경로 = (번호: { runId: number } | { trialId: string }): string =>
  'runId' in 번호
    ? join(artifactsDir(), 'runs', String(번호.runId), 'scenario', 'trace.zip')
    : join(artifactsDir(), 'runs', 'trial', 번호.trialId, 'trace.zip');

/** 케이스 항목 상세의 trace(web/api.ts ItemTrace)와 같은 모양이다 — 화면이 같은 칸으로 그린다 */
export interface 부품기록 {
  status: 'DONE' | 'NONE' | 'FAILED';
  reason: string | null;
  network: 네트워크줄[];
  actions: Omit<조작줄, 'secretField'>[];
  console: 콘솔줄[];
}

/** 값 꽂기로 넣은 값(bound) 중 비밀 칸 값. 숫자 비밀(pin: 1234)도 글자로 실린다 */
export function 꽂은값비밀(bound: Record<string, unknown>, paramSchema: unknown): string[] {
  const 가린꽂은값 = 가린값들(bound, paramSchema);
  return Object.entries(bound).flatMap(([k, v]) =>
    가린꽂은값[k] !== v && (typeof v === 'string' || typeof v === 'number') && v !== '' ? [String(v)] : [],
  );
}

interface 부품재료 {
  part: ScenarioPart;
  param_schema: unknown;
  expected_schema: unknown;
  bound: Record<string, unknown>;
}

/** 부품들의 비밀 글자 — 결과 조회(runRoutes.ts)와 trace 적재가 같은 목록으로 가린다. 숫자 비밀(pin: 1234)도 글자로 실린다 */
export function 부품비밀(부품: 부품재료[]): string[] {
  return 부품.flatMap((p) => {
    const 꽂은비밀 = 꽂은값비밀(p.bound, p.param_schema);
    if (p.part.kind !== 'case') return 꽂은비밀;
    const 명세 = { paramSchema: p.param_schema, expectedSchema: p.expected_schema, params: p.part.params, expected: p.part.expected };
    return [...비밀글자들(명세), ...꽂은비밀];
  });
}

const 없음 = (status: 'NONE' | 'FAILED', reason: string): 부품기록 => ({ status, reason, network: [], actions: [], console: [] });

/**
 * 실패한 case 부품의 seq → 기록. 던지지 않는다 — 기록 때문에 결과를 못 적으면 안 된다.
 * zip 은 안 지운다 — 결과를 다 적은 뒤 부르는 쪽이 `trace를지운다` 로 지운다. 못 읽은 zip 은 사람이 서버에서 열어 보게 둔다
 */
export async function 실패부품trace(
  경로: string,
  결과: Pick<ScenarioExecuteResponse, 'parts' | 'error'>,
  비밀: string[],
): Promise<Map<number, 부품기록>> {
  // 절차가 없는 부품(API · 모킹 · 디바이스 미선언)은 가를 단계 번호가 없다 — 사유는 부품 error 가 이미 말한다
  const 실패 = 결과.parts.filter((p) => p.status === 'FAIL' && p.steps.length > 0);
  if (실패.length === 0) return new Map();
  const 모두 = (기록: 부품기록) => new Map(실패.map((p) => [p.seq, 기록]));
  const 못읽음 = (err: unknown) => 모두(없음('FAILED', `trace 를 읽지 못했다: ${err instanceof Error ? err.message : String(err)}`));
  let zip: Buffer;
  try {
    zip = await 볼륨파일읽기(경로);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') return 못읽음(err);
    // 러너가 제한 시간에 자식을 끊으면 Playwright 가 zip 을 못 쓴다 — 케이스와 같은 사유로 가른다
    return 모두(없음('NONE', 결과.error?.message === 'TIMEOUT' ? trace없는까닭.끊김 : trace없는까닭.파일없음));
  }
  try {
    const 풀림 = trace가린다(await trace를푼다(zip, { 본문: true }), 긴것부터(비밀));
    return new Map(
      실패.map((p) => {
        const 단계들 = new Set(p.steps.map((s) => s.seq));
        const 그부품 = (x: { seq: number | null }) => x.seq !== null && 단계들.has(x.seq);
        return [
          p.seq,
          {
            status: 'DONE',
            reason: null,
            network: 풀림.network.filter(그부품),
            // 비밀번호 칸 표시는 가리는 데만 쓴다. 케이스 항목 상세(run_action)도 안 싣는다
            actions: 풀림.actions.filter(그부품).map(({ secretField: _, ...a }) => a),
            console: 풀림.console.filter(그부품),
          },
        ];
      }),
    );
  } catch (err) {
    return 못읽음(err);
  }
}

/** 다 푼 zip 을 지운다. 케이스와 달리 원본을 읽을 에이전트 통로가 없다. 못 읽은 zip(FAILED)은 남긴다 */
export async function trace를지운다(경로: string, 기록들: Map<number, 부품기록>): Promise<void> {
  if ([...기록들.values()].some((r) => r.status === 'FAILED')) return;
  await unlink(경로).catch((err: unknown) => {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return;
    console.warn(`[scenario] trace 를 지우지 못했다 ${경로}: ${err instanceof Error ? err.message : String(err)}`);
  });
}

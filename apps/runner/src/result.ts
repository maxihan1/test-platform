// 자식 프로세스가 뱉은 결과 줄을 읽는다. 러너는 exit code가 아니라 이 줄로 판정한다 (SPEC §5.2)

import { stripVTControlCharacters } from 'node:util';

import { RESULT_MARKER, type ExecuteResponse } from '@platform/kit';

export type RunnerResult = Pick<ExecuteResponse, 'status' | 'durationMs' | 'steps' | 'error' | 'device' | 'elementChecks' | 'apiCalls'>;

export function parseResult(stdout: string): RunnerResult | null {
  const lines = stdout.split('\n').filter((l) => l.startsWith(RESULT_MARKER));
  // 케이스 1건 = 프로세스 1개라 결과 줄도 하나다. 여러 개면 마지막이 그 케이스의 끝이다
  const last = lines.at(-1);
  if (last === undefined) return null;

  let 결과: RunnerResult;
  try {
    결과 = JSON.parse(last.slice(RESULT_MARKER.length)) as RunnerResult;
  } catch (err) {
    // 리포터가 뱉은 줄을 러너가 못 읽는 상황이다. 케이스 실패가 아니라 러너 고장이다
    throw new Error(`${RESULT_MARKER} 줄을 읽지 못했다: ${err instanceof Error ? err.message : String(err)}`);
  }
  return 결과.error === undefined ? 결과 : { ...결과, error: 오류를다듬는다(결과.error) };
}

const 테스트시간초과 = /^Test timeout of \d+ms exceeded/;

/**
 * Playwright 는 오류 글에 색 코드를 섞는다 — 화면이 「\u001b[31mTest timeout…」을 문장으로 못 읽어 「테스트 실행기에 닿지 못했습니다」로 보였다.
 * 테스트 제한 시간 초과는 러너가 끊은 것과 같은 TIMEOUT 으로 적는다 — 사람이 보는 사유가 「제한 시간 초과」다. 원문은 stack 에 남긴다
 * (2026-11-06 WEB-F9-14 · 점검표 B3 · 도메인/러너 §5.2)
 */
function 오류를다듬는다(error: NonNullable<RunnerResult['error']>): NonNullable<RunnerResult['error']> {
  const message = stripVTControlCharacters(error.message);
  const stack = error.stack === undefined ? undefined : stripVTControlCharacters(error.stack);
  if (테스트시간초과.test(message)) return { message: 'TIMEOUT', stack: stack ?? message };
  return { message, ...(stack !== undefined && { stack }) };
}

// 자식(케이스)이 남긴 kit 경고 줄 — 장면 · 영상을 못 건 까닭이 여기에만 있다. 같은 줄은 한 번만 (2026-11-05 WEB-F9-11)
export function kit경고(출력: string): string[] {
  return [...new Set(stripVTControlCharacters(출력).split('\n').map((줄) => 줄.trim()).filter((줄) => 줄.startsWith('[kit]')))];
}

// 실패 사유로 쓸 stderr — kit 경고는 뺀다. 결과 줄 없이 죽은 실행에서 장면 경고가 진짜 사유(stdout 꼬리)를 밀어내지 않게
export function kit경고뺌(출력: string): string {
  return 출력.split('\n').filter((줄) => !stripVTControlCharacters(줄).trim().startsWith('[kit]')).join('\n');
}

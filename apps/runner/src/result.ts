// 자식 프로세스가 뱉은 결과 줄을 읽는다. 러너는 exit code가 아니라 이 줄로 판정한다 (SPEC §5.2)

import { stripVTControlCharacters } from 'node:util';

import { RESULT_MARKER, type ExecuteResponse } from '@platform/kit';

export type RunnerResult = Pick<ExecuteResponse, 'status' | 'durationMs' | 'steps' | 'error' | 'device' | 'elementChecks' | 'apiCalls'>;

export function parseResult(stdout: string): RunnerResult | null {
  const lines = stdout.split('\n').filter((l) => l.startsWith(RESULT_MARKER));
  // 케이스 1건 = 프로세스 1개라 결과 줄도 하나다. 여러 개면 마지막이 그 케이스의 끝이다
  const last = lines.at(-1);
  if (last === undefined) return null;

  try {
    return JSON.parse(last.slice(RESULT_MARKER.length)) as RunnerResult;
  } catch (err) {
    // 리포터가 뱉은 줄을 러너가 못 읽는 상황이다. 케이스 실패가 아니라 러너 고장이다
    throw new Error(`${RESULT_MARKER} 줄을 읽지 못했다: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// 자식(케이스)이 남긴 kit 경고 줄 — 장면 · 영상을 못 건 까닭이 여기에만 있다. 같은 줄은 한 번만 (2026-11-05 WEB-F9-11)
export function kit경고(출력: string): string[] {
  return [...new Set(stripVTControlCharacters(출력).split('\n').map((줄) => 줄.trim()).filter((줄) => 줄.startsWith('[kit]')))];
}

// 실패 사유로 쓸 stderr — kit 경고는 뺀다. 결과 줄 없이 죽은 실행에서 장면 경고가 진짜 사유(stdout 꼬리)를 밀어내지 않게
export function kit경고뺌(출력: string): string {
  return 출력.split('\n').filter((줄) => !stripVTControlCharacters(줄).trim().startsWith('[kit]')).join('\n');
}

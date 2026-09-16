// 자식 프로세스가 뱉은 결과 줄을 읽는다. 러너는 exit code가 아니라 이 줄로 판정한다 (SPEC §5.2)

import { RESULT_MARKER, type ExecuteResponse } from '@platform/kit';

export type RunnerResult = Pick<ExecuteResponse, 'status' | 'durationMs' | 'steps' | 'error'>;

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

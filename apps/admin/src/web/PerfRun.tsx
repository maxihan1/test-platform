// 성능 테스트 › 실행 한 건 — 도는 중이면 「실행 중」, 끝났으면 「결과」. 같은 주소에서 끝나는 순간 결과로 바뀐다 (도메인/성능 §8.14)

import { perfApi } from './perfApi.js';
import { PerfRunLive } from './PerfRunLive.js';
import { PerfRunResult } from './PerfRunResult.js';
import { 도는중인가 } from './perfRunView.js';
import { Failed, Loading, useAsync } from './ui.js';

export function PerfRun({ runId, 쓰나 }: { runId: number; 쓰나: boolean }) {
  const 읽음 = useAsync(() => perfApi.runOf(runId), [runId]);
  // 다시 읽다 실패해도 이미 받은 화면은 그대로 둔다 — 처음 읽기가 실패했을 때만 오류를 보인다
  if (읽음.data === null) return 읽음.error !== null ? <Failed error={읽음.error} /> : <Loading />;
  const run = 읽음.data;
  return 도는중인가(run.status) ? <PerfRunLive run={run} 다시읽기={읽음.reload} 쓰나={쓰나} /> : <PerfRunResult run={run} 다시읽기={읽음.reload} 쓰나={쓰나} />;
}

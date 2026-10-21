// 성능 테스트 › 실행 한 건 — 도는 중이면 「실행 중」, 끝났으면 「결과」. 같은 주소에서 끝나는 순간 결과로 바뀐다 (도메인/성능 §8.14)

import { useEffect } from 'react';

import { perfApi } from './perfApi.js';
import { PerfRunLive } from './PerfRunLive.js';
import { PerfRunResult } from './PerfRunResult.js';
import { 도는중인가, 실행쓰나, 측정자리 } from './perfRunView.js';
import type { 판정하기 } from './runJudge.js';
import { Failed, Loading, useAsync } from './ui.js';

// 주소로 바로 오는 화면이라 띠와 다른 애플리케이션의 실행일 수 있다 — 버튼은 그 실행의 접두사로 가른다 (화면공통 §8)
export function PerfRun({ runId, 판정하기 }: { runId: number; 판정하기: 판정하기 }) {
  const 읽음 = useAsync(() => perfApi.runOf(runId), [runId]);
  // 페이지 · 기기 측정은 결과를 그 화면이 보인다 (실행 기록에서 누르는 길과 같다 · §8.14). 뒤로 가기가 이 주소에 걸리지 않게 바꿔 놓는다
  const 자리 = 측정자리(읽음.data?.kind);
  useEffect(() => {
    if (자리 !== null) window.location.replace(`${자리}?run=${String(runId)}`);
  }, [자리, runId]);
  if (자리 !== null) return <Loading />;
  // 다시 읽다 실패해도 이미 받은 화면은 그대로 둔다 — 처음 읽기가 실패했을 때만 오류를 보인다
  if (읽음.data === null) return 읽음.error !== null ? <Failed error={읽음.error} /> : <Loading />;
  const run = 읽음.data;
  const 쓰나 = 실행쓰나(판정하기, run);
  return 도는중인가(run.status) ? <PerfRunLive run={run} 다시읽기={읽음.reload} 쓰나={쓰나} /> : <PerfRunResult run={run} 다시읽기={읽음.reload} 쓰나={쓰나} />;
}

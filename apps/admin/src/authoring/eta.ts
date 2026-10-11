// 작성에 걸릴 시간을 같은 서비스의 지난 작성 소요 중간값으로 어림한다 (작성 상세 · 알림 통로가 쓴다)

import { 중간값 } from '../execution/eta.js';
import { 고치기실행인가 } from './edit.js';
import { db } from './store.js';

/**
 * 다섯 단계(준비 · 자료 · 스크립트 작성 · 저장 · 완료)를 밟는 실행인가. 머지 · 고치기 · 고치기 다시 적용은 안 밟는다 —
 * 화면 web/authoringStatus.ts 의 `단계자리` 가 막대를 안 그리는 조건과 같다. 안 밟는 실행에는 작성 예상을 안 낸다
 */
export const 다섯단계인가 = (행: { kind: string; params: unknown }): boolean => 행.kind !== 'MERGE' && !고치기실행인가(행);

/**
 * 같은 서비스에서 끝난 작성 · 다시 작성 최근 5건의 소요 중간값. 한 건도 없으면 null — 화면은 예상을 안 보인다.
 * 이어서 작성한 것(resume_from)과 고치기 다시 적용(params.edits)은 다섯 단계 한 번의 시간이 아니라 뺀다
 */
export async function 작성예상(서비스: number): Promise<{ ms: number; samples: number } | null> {
  const r = await (await db()).query<{ ms: string }>(
    `SELECT EXTRACT(EPOCH FROM (finished_at - started_at)) * 1000 AS ms
       FROM authoring_request
      WHERE service_id = $1 AND status = 'DONE' AND kind IN ('AUTHOR', 'RERUN')
        AND resume_from IS NULL AND NOT (params ? 'edits')
        AND started_at IS NOT NULL AND finished_at IS NOT NULL
      ORDER BY finished_at DESC LIMIT 5`,
    [서비스],
  );
  const ms = 중간값(r.rows.map((x) => Number(x.ms)));
  return ms === null ? null : { ms, samples: r.rows.length };
}

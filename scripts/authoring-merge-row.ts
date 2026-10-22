// 반영(MERGE) 행 한 건 — 원본 행에서 PR 주소 · 뿌리를 읽어 머지처리에 넘긴다. authoring-run.ts 가 300줄을 넘어 뗐다

import { type 집은것 } from './authoring-rules.js';
import { type 계정 } from './authoring-copy.js';
import { type 보고손, 부른다 } from './authoring-io.js';
import { 머지처리 } from './authoring-merge.js';
import { type 서비스설정 } from './authoring-token.js';
import { type 판 } from './authoring-run.js';

export async function 머지행처리(
  주소기지: string,
  토큰: string,
  서비스: string,
  것: 집은것,
  판: 판,
  자식: 계정 | null,
  설정: 서비스설정,
  손: 보고손,
): Promise<void> {
  // **머지 행에는 PR 주소가 안 실려 온다**(`store.ts` `줄세우기`) — 원본 행을 읽어 주소와 뿌리를 가져온다
  let 주소 = 것.prUrl ?? null;
  let 요청뿌리: number | undefined;
  let 고치기 = false;
  if (typeof 것.sourceId === 'number') {
    const 원본 = (await 부른다(주소기지, 토큰, `/authoring/requests/${것.sourceId}?service=${encodeURIComponent(서비스)}`)).몸;
    주소 ??= (원본 as { prUrl?: string | null } | null)?.prUrl ?? null;
    요청뿌리 = (원본 as { rootId?: number } | null)?.rootId;
    // 고치기 반영은 겹침을 안 본다 — params.edits 는 고치기 실행만 가진다 (§3.6 「★ 반영 때 겹침 검사」)
    고치기 = Array.isArray((원본 as { params?: { edits?: unknown } } | null)?.params?.edits);
  }
  if (주소 === null) {
    await 손.끝내기({ status: 'FAILED', error: '머지할 초안 PR 주소가 없다' });
    return;
  }
  // 브랜치는 author-<뿌리> — 그 전에 선 PR 은 prUrl 을 가진 원본 행(sourceId)의 author-<실행 번호> 다 (§7 「실행 기록」)
  const 반영폴더 = '사유' in 설정.폴더 ? null : 설정.폴더.폴더;
  await 머지처리(손, 주소, 판.판정, 것.sourceId ?? undefined, 판.원천, 판.호스트로, 요청뿌리, { 것, 서비스, 판, 자식, 폴더: 반영폴더, 고치기 });
}

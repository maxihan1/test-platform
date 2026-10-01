// main 을 요청 브랜치에 합친다 — 같은 서비스를 동시에 작성한 요청이 먼저 반영된 뒤 반영할 때 (SPEC 도메인/작성 §3.6 「★ 반영 때 겹침 검사」)
// 반영은 rebase 도 update-branch 도 안 해서, 표가 충돌하면 GitHub 이 CI 를 안 띄워 17분 뒤 실패했다. 작업방에서 합치고 표는 코드로 푼다

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { 반영표시, 케이스tcId } from './authoring-held-apply.js';
import type { 깃손 } from './authoring-ledger-io.js';
import { 새형식오류, 요구번호다시매기기, 표덩이풀기 } from './authoring-table-merge.js';

export interface 합칠판 {
  /** 작업방 트리 — 요청 브랜치가 꺼내져 있다 */
  트리: string;
  깃: 깃손;
  mainSha: string;
  /** docs/cases/<접두사>.md */
  표경로: string;
  /** tests/<폴더> 의 폴더 이름 */
  폴더: string;
  /** 합침 커밋 제목 — 에이전트 커밋 꼴이라야 덮어쓰기 검사가 에이전트 것으로 읽는다 */
  메시지: string;
}

/** main 이 갈라진 뒤 이 서비스의 표나 테스트 폴더를 바꿨나 — 다른 서비스 반영으로 main 이 움직일 때마다 합치면 반영마다 CI 를 한 번 더 돈다 */
export function 합칠까(main바뀐것: string[], 표경로: string, 폴더: string): boolean {
  return main바뀐것.some((f) => f === 표경로 || f.startsWith(`tests/${폴더}/`));
}

function 케이스들(트리: string, 폴더: string): Set<string> {
  const 결과 = new Set<string>();
  let 파일들: string[] = [];
  try {
    파일들 = readdirSync(join(트리, 'tests', 폴더), { recursive: true }).map(String);
  } catch {
    return 결과;
  }
  for (const f of 파일들.filter((x) => x.endsWith('.spec.ts'))) {
    const id = 케이스tcId(readFileSync(join(트리, 'tests', 폴더, f), 'utf8'));
    if (id !== null) 결과.add(id);
  }
  return 결과;
}

/**
 * main 을 합쳐 합침 커밋 하나를 남긴다. 표만 코드로 풀고 그 밖 충돌은 되돌린 뒤 사유를 낸다 — 트리는 원래대로 남는다.
 * 합칠 것이 없으면(이미 품었다 · 이 서비스를 안 건드렸다) 아무것도 안 한다
 */
export function main합치기(판: 합칠판): { 합침: boolean } | { 사유: string } {
  const { 트리, 깃, mainSha, 표경로, 폴더 } = 판;
  if (깃(['merge-base', '--is-ancestor', mainSha, 'HEAD']).ok) return { 합침: false };
  const 바탕 = 깃(['merge-base', 'HEAD', mainSha]);
  if (!바탕.ok) return { 사유: `main 과 갈라진 자리를 못 찾았다: ${바탕.까닭 ?? ''}` };
  const 바뀐 = 깃(['diff', '--name-only', 바탕.낸것.trim(), mainSha]);
  if (!바뀐.ok) return { 사유: `main 에서 바뀐 파일을 못 읽었다: ${바뀐.까닭 ?? ''}` };
  if (!합칠까(바뀐.낸것.split('\n').filter((f) => f !== ''), 표경로, 폴더)) return { 합침: false };

  const 되돌리기 = (사유: string) => (깃(['merge', '--abort']), { 사유 });
  const 합침 = 깃(['-c', 'merge.conflictStyle=diff3', 'merge', '--no-commit', '--no-ff', mainSha]);
  if (!합침.ok) {
    const 충돌 = 깃(['diff', '--name-only', '--diff-filter=U']).낸것.split('\n').filter((f) => f !== '');
    if (충돌.length === 0) return 되돌리기(`main 을 합치지 못했다: ${합침.까닭 ?? ''}`);
    const 남의것 = 충돌.filter((f) => f !== 표경로);
    if (남의것.length > 0) return 되돌리기(`main 과 같은 파일을 고쳐 합치지 못했다 — ${남의것.join(' · ')}. 다시 작성한다`);
    // 바탕(1번 자리)이 없으면 양쪽이 표를 처음 만든 것이다 — 덩이로 풀면 표 둘이 통째로 섞인다
    if (!깃(['ls-files', '-u', '--', 표경로]).낸것.split('\n').some((l) => /\s1\t/.test(l))) {
      return 되돌리기('새 서비스의 첫 요청 둘이 요구사항 표를 각자 만들었다 — 뒤 요청을 다시 작성한다');
    }
    const 풀림 = 표덩이풀기(readFileSync(join(트리, 표경로), 'utf8'));
    if ('사유' in 풀림) return 되돌리기(`${풀림.사유} — 다시 작성한다`);
    writeFileSync(join(트리, 표경로), 풀림.글);
  }

  let 표있나 = true;
  let 표글 = '';
  try {
    표글 = readFileSync(join(트리, 표경로), 'utf8');
  } catch {
    표있나 = false;
  }
  if (표있나) {
    const 고친 = 요구번호다시매기기(표글);
    const 전들 = ['HEAD', mainSha].map((r) => 깃(['show', `${r}:${표경로}`])).filter((r) => r.ok).map((r) => r.낸것);
    const 새오류 = 새형식오류(고친, 전들, 케이스들(트리, 폴더));
    if (새오류.length > 0) return 되돌리기(`합친 요구사항 표가 깨졌다 — ${새오류.slice(0, 3).join(' · ')}. 다시 작성한다`);
    writeFileSync(join(트리, 표경로), 고친);
    if (!깃(['add', '--', 표경로]).ok) return 되돌리기('합친 요구사항 표를 담지 못했다');
  }
  const 커밋 = 깃(['commit', '-q', '-m', 판.메시지, '-m', 반영표시]);
  if (!커밋.ok) return 되돌리기(`합침 커밋을 못 만들었다: ${커밋.까닭 ?? ''}`);
  return { 합침: true };
}

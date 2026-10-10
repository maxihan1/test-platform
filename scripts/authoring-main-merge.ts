// main 을 요청 브랜치에 합친다 — 같은 서비스를 동시에 작성한 요청이 먼저 반영된 뒤 반영할 때 (SPEC 도메인/작성 §3.6 「★ 반영 때 겹침 검사」)
// 반영은 rebase 도 update-branch 도 안 해서, 표가 충돌하면 GitHub 이 CI 를 안 띄워 17분 뒤 실패했다. 작업방에서 합치고 표는 코드로 푼다

import { lstatSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { join, sep } from 'node:path';

import { 반영표시, 케이스tcId } from './authoring-held-apply.js';
import type { 깃손 } from './authoring-ledger-io.js';
import type { 부품합치기 } from './authoring-po-merge.js';
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
  /** 양쪽이 고친 Page Object 를 합치는 손 — 에이전트는 도구 없는 AI(`AI부품합치기`), 검사는 가짜 */
  부품합치기: 부품합치기;
}

/** main 이 갈라진 뒤 이 서비스의 표나 테스트 폴더를 바꿨나 — 다른 서비스 반영으로 main 이 움직일 때마다 합치면 반영마다 CI 를 한 번 더 돈다 */
export function 합칠까(main바뀐것: string[], 표경로: string, 폴더: string): boolean {
  return main바뀐것.some((f) => f === 표경로 || f.startsWith(`tests/${폴더}/`));
}

/**
 * 트리 안의 보통 파일인가 — 링크면 따라가지 않는다. 에이전트는 root 로 돌고 트리는 자식이 쓴 브랜치다.
 * 링크 표를 따라가 읽고 쓰면 링크가 가리키는 서버 파일을 바꾼다 (보안 검토 2026-10-01)
 */
export function 안전한파일(트리: string, 경로: string): boolean {
  try {
    const 풀길 = join(트리, 경로);
    if (!lstatSync(풀길).isFile()) return false;
    return realpathSync(풀길).startsWith(realpathSync(트리) + sep);
  } catch {
    return false;
  }
}

function 케이스들(트리: string, 폴더: string): Set<string> {
  const 결과 = new Set<string>();
  let 파일들: string[] = [];
  try {
    파일들 = readdirSync(join(트리, 'tests', 폴더), { recursive: true }).map(String);
  } catch {
    return 결과;
  }
  for (const f of 파일들.filter((x) => x.endsWith('.spec.ts') && 안전한파일(트리, join('tests', 폴더, x)))) {
    const id = 케이스tcId(readFileSync(join(트리, 'tests', 폴더, f), 'utf8'));
    if (id !== null) 결과.add(id);
  }
  return 결과;
}

/**
 * 양쪽이 고친 Page Object 하나를 세 판으로 AI 에 넘겨 받은 글로 쓴다. AI 를 불렀는지 · 실패면 사유.
 * git 이 깨끗이 합친 것도 다시 쓴다 — 다른 줄을 고쳐 조용히 합쳐져도 한쪽 케이스를 깰 수 있고, 서비스 폴더는 CI 가 안 돌려 아무도 못 잡는다
 */
async function 부품쓰기(판: 합칠판, 바탕: string, 경로: string): Promise<{ AI: boolean } | { 사유: string }> {
  const 판글 = (판이름: string) => {
    const r = 판.깃(['show', `${판이름}:${경로}`]);
    return r.ok ? r.낸것 : null;
  };
  const main글 = 판글(판.mainSha);
  const 요청글 = 판글('HEAD');
  // 같은 글이면(같이 지운 것 포함) git 이 이미 그 글로 합쳤다 — AI 를 부르면 실패할 길만 는다
  if (main글 === 요청글) return { AI: false };
  if (main글 === null || 요청글 === null) return { 사유: `한쪽이 지운 Page Object 라 합치지 못했다 — ${경로}. 다시 작성한다` };
  // 합침 중 트리의 그 자리가 링크면 따라가 쓰지 않는다 (위 안전한파일)
  if (!안전한파일(판.트리, 경로)) return { 사유: `Page Object 가 보통 파일이 아니다 — ${경로}. 다시 작성한다` };
  const 답 = await 판.부품합치기(경로, { 바탕: 판글(바탕), main: main글, 요청: 요청글 });
  if ('사유' in 답) return { 사유: `AI 가 Page Object 를 합치지 못했다 — ${경로}: ${답.사유}. 다시 작성한다` };
  writeFileSync(join(판.트리, 경로), 답.글);
  return 판.깃(['add', '--', 경로]).ok ? { AI: true } : { 사유: `합친 Page Object 를 담지 못했다 — ${경로}` };
}

/**
 * main 을 합쳐 합침 커밋 하나를 남긴다. 표는 코드로, 양쪽이 고친 Page Object 는 AI 로 풀고 그 밖 충돌은 되돌린 뒤 사유를 낸다 — 트리는 원래대로 남는다.
 * 합칠 것이 없으면(이미 품었다 · 이 서비스를 안 건드렸다) 아무것도 안 한다
 */
export async function main합치기(판: 합칠판): Promise<{ 합침: boolean } | { 사유: string }> {
  const { 트리, 깃, mainSha, 표경로, 폴더 } = 판;
  if (깃(['merge-base', '--is-ancestor', mainSha, 'HEAD']).ok) return { 합침: false };
  const 바탕 = 깃(['merge-base', 'HEAD', mainSha]);
  if (!바탕.ok) return { 사유: `main 과 갈라진 자리를 못 찾았다: ${바탕.까닭 ?? ''}` };
  // -z — 한글 · 특수 문자 이름을 git 이 따옴표로 감싸 내면 이름이 안 맞는다
  const 바뀐 = 깃(['diff', '--name-only', '-z', 바탕.낸것.trim(), mainSha]);
  if (!바뀐.ok) return { 사유: `main 에서 바뀐 파일을 못 읽었다: ${바뀐.까닭 ?? ''}` };
  const main바뀐것 = 바뀐.낸것.split('\0').filter((f) => f !== '');
  if (!합칠까(main바뀐것, 표경로, 폴더)) return { 합침: false };

  const 내바뀐 = 깃(['diff', '--name-only', '-z', 바탕.낸것.trim(), 'HEAD']);
  if (!내바뀐.ok) return { 사유: `요청에서 바뀐 파일을 못 읽었다: ${내바뀐.까닭 ?? ''}` };
  const 부품 = [`tests/${폴더}/pages/`, `tests/${폴더}/components/`];
  const 둘다 = new Set(내바뀐.낸것.split('\0').filter((f) => f !== ''));
  const 부품겹침 = main바뀐것.filter((f) => 둘다.has(f) && 부품.some((p) => f.startsWith(p)));

  const 되돌리기 = (사유: string) => (깃(['merge', '--abort']), { 사유 });
  const 합침 = 깃(['-c', 'merge.conflictStyle=diff3', 'merge', '--no-commit', '--no-ff', mainSha]);
  if (!합침.ok) {
    const 충돌 = 깃(['diff', '--name-only', '-z', '--diff-filter=U']).낸것.split('\0').filter((f) => f !== '');
    if (충돌.length === 0) return 되돌리기(`main 을 합치지 못했다: ${합침.까닭 ?? ''}`);
    const 남의것 = 충돌.filter((f) => f !== 표경로 && !부품겹침.includes(f));
    if (남의것.length > 0) return 되돌리기(`main 과 같은 파일을 고쳐 합치지 못했다 — ${남의것.join(' · ')}. 다시 작성한다`);
    if (충돌.includes(표경로)) {
      // 바탕(1번 자리)이 없으면 양쪽이 표를 처음 만든 것이다 — 덩이로 풀면 표 둘이 통째로 섞인다
      if (!깃(['ls-files', '-u', '--', 표경로]).낸것.split('\n').some((l) => /\s1\t/.test(l))) {
        return 되돌리기('새 서비스의 첫 요청 둘이 요구사항 표를 각자 만들었다 — 뒤 요청을 다시 작성한다');
      }
      if (!안전한파일(트리, 표경로)) return 되돌리기(`요구사항 표가 보통 파일이 아니다 — ${표경로}. 다시 작성한다`);
      const 풀림 = 표덩이풀기(readFileSync(join(트리, 표경로), 'utf8'));
      if ('사유' in 풀림) return 되돌리기(`${풀림.사유} — 다시 작성한다`);
      writeFileSync(join(트리, 표경로), 풀림.글);
    }
  }
  const AI합친것: string[] = [];
  for (const 경로 of 부품겹침) {
    const r = await 부품쓰기(판, 바탕.낸것.trim(), 경로);
    if ('사유' in r) return 되돌리기(r.사유);
    if (r.AI) AI합친것.push(경로);
  }

  let 표있나 = true;
  try {
    lstatSync(join(트리, 표경로));
  } catch {
    표있나 = false;
  }
  if (표있나) {
    // 읽기 전에 본다 — 링크를 따라가 읽은 글을 같은 자리에 되쓰면 링크 대상이 바뀐다
    if (!안전한파일(트리, 표경로)) return 되돌리기(`요구사항 표가 보통 파일이 아니다 — ${표경로}. 다시 작성한다`);
    const 고친 = 요구번호다시매기기(readFileSync(join(트리, 표경로), 'utf8'));
    const 전들 = ['HEAD', mainSha].map((r) => 깃(['show', `${r}:${표경로}`])).filter((r) => r.ok).map((r) => r.낸것);
    const 새오류 = 새형식오류(고친, 전들, 케이스들(트리, 폴더));
    if (새오류.length > 0) return 되돌리기(`합친 요구사항 표가 깨졌다 — ${새오류.slice(0, 3).join(' · ')}. 다시 작성한다`);
    writeFileSync(join(트리, 표경로), 고친);
    if (!깃(['add', '--', 표경로]).ok) return 되돌리기('합친 요구사항 표를 담지 못했다');
  }
  // AI 가 합친 파일은 커밋에 남긴다 — 병합 뒤 그 케이스가 깨지면 어디서 왔는지 찾을 길이 이것뿐이다
  const AI줄 = AI합친것.length > 0 ? ['-m', `AI 가 합친 Page Object — ${AI합친것.join(' · ')}`] : [];
  const 커밋 = 깃(['commit', '-q', '-m', 판.메시지, '-m', 반영표시, ...AI줄]);
  if (!커밋.ok) return 되돌리기(`합침 커밋을 못 만들었다: ${커밋.까닭 ?? ''}`);
  return { 합침: true };
}

// 비밀번호 노출 점검 — 파일들에서 테스트 계정 비밀번호가 적힌 자리를 찾는다. 빠른 검사가 부른다 (SPEC 도메인/작성 §3.6 「빠른 검사 명령」)

import { lstatSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { 글모두 } from './authoring-reverse.js';

/** 비밀번호가 적힌 자리(파일:줄) — 원문과 JSON 이스케이프 꼴을 줄마다, .json 은 푼 값에서도 본다. 값은 돌려주지 않는다 */
export function 비밀자리들(파일들: readonly { 경로: string; 글: string }[], 비밀들: readonly string[]): string[] {
  const 꼴들 = 비밀들.filter((b) => b !== '').flatMap((b) => [b, JSON.stringify(b).slice(1, -1)]);
  if (꼴들.length === 0) return [];
  return 파일들.flatMap((f) => {
    const 자리 = f.글.split('\n').flatMap((줄, i) => (꼴들.some((꼴) => 줄.includes(꼴)) ? [`${f.경로}:${i + 1}`] : []));
    if (f.경로.endsWith('.json')) {
      try {
        // 푼 값은 에이전트 올리기 검사와 같은 코드로 모은다 — 둘이 갈리면 자식은 깨끗한데 올리기에서 걸린다
        if (글모두(JSON.parse(f.글)).some((v) => 비밀들.some((b) => b !== '' && v.includes(b)))) 자리.push(`${f.경로} (푼 값)`);
      } catch {
        // 못 푸는 JSON 은 줄 검사만 — 에이전트 올리기 검사가 모양을 따로 본다
      }
    }
    return 자리;
  });
}

/** 경로들 아래 일반 파일 — 링크 · FIFO 는 따라가지 않는다. 없는 경로는 따로 돌려준다(경로를 틀려 「깨끗」이 나오는 거짓 초록을 막는다) */
export function 파일모으기(경로들: readonly string[]): { 파일들: { 경로: string; 글: string }[]; 없음: string[] } {
  const 파일들: { 경로: string; 글: string }[] = [];
  const 없음: string[] = [];
  const 훑기 = (p: string) => {
    const 것 = lstatSync(p, { throwIfNoEntry: false });
    if (것 === undefined) return void 없음.push(p);
    if (것.isDirectory()) return readdirSync(p).forEach((이름) => 훑기(join(p, 이름)));
    if (것.isFile()) 파일들.push({ 경로: p, 글: readFileSync(p, 'utf8') });
  };
  경로들.forEach(훑기);
  return { 파일들, 없음 };
}

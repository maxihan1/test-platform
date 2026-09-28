// 자식을 띄우기 전에 받은 자료·앞 실행이 남긴 파일에서 테스트 계정 비밀번호를 가린다 — I/O 껍데기 (도메인/작성 §3.6 「★ 역방향」)
// 판정은 순수 함수(`지울원본` · `글자인가` · `비밀가리기`)에 있다

import { lstatSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

import { 글자인가, 지울원본, type 읽을자료 } from './authoring-assets.js';
import { 비밀가리기 } from './authoring-reverse.js';

const 파일상한 = 20 * 1024 * 1024;

/** 링크는 따라가지 않는다 — 앞 실행의 자식이 남긴 링크가 트리 밖을 가리킬 수 있다 */
function 가려쓰기(자리: string, 비밀: string): number {
  const 것 = lstatSync(자리, { throwIfNoEntry: false });
  if (것 === undefined || 것.isSymbolicLink()) return 0;
  if (것.isDirectory()) {
    if (basename(자리) === '.git') return 0;
    return readdirSync(자리).reduce((n, 이름) => n + 가려쓰기(join(자리, 이름), 비밀), 0);
  }
  if (!것.isFile() || 것.size > 파일상한) return 0;
  const 몸 = readFileSync(자리);
  if (!글자인가(몸)) return 0;
  const 글 = 몸.toString('utf8');
  const 가림 = 비밀가리기(글, 비밀);
  if (가림 === 글) return 0;
  writeFileSync(자리, 가림);
  return 1;
}

/**
 * 역방향이면 자식을 띄우기 전에 부른다 — 글자로 바꾼 워드 원본을 지우고, 폴더들의 글자 파일과 본문에서 비밀번호를 가린다.
 * 이어받은 실행이면 앞 실행이 남긴 케이스·표·차이 파일도 여기서 가려진다 (2026-09-29 사용자 게이트 1). 로그에는 값 없이 수만 찍는다
 */
export function 먼저가리기(
  번호: number,
  계획: 읽을자료[],
  자리: { 자료: string; 트리: string; 케이스자리: string; 서비스: string },
  본문: string | null,
  비밀: string | null | undefined,
): string | null {
  if (!비밀) return 본문;
  for (const 원본 of 지울원본(계획)) rmSync(원본, { force: true });
  // 자료 폴더(글자본 · out · screens) · 케이스 폴더 · 요구사항 표 — 자식이 읽고 에이전트가 올리는 자리 전부
  const 폴더들 = [자리.자료, join(자리.트리, 'tests', 자리.케이스자리), join(자리.트리, 'docs', 'cases', `${자리.서비스}.md`)];
  const 수 = 폴더들.reduce((n, p) => n + 가려쓰기(p, 비밀), 0);
  if (수 > 0) console.log(`[작성] ${번호}번 — 비밀번호를 가린 파일 ${수}개`);
  return 본문 === null ? null : 비밀가리기(본문, 비밀);
}

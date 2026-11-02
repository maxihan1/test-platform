// 수정 AI 가 고친 뒤 넘길 사람 후보 — CODEOWNERS · blame 글 풀기와 모으기. 순수 함수 (도메인/BTS 「수정 AI」)

import { 상한 } from './authoring-bugfix-prompt.js';
import { 글자자르기 } from './authoring-usage.js';

export interface 사람 {
  email: string;
  name: string;
}

export interface 주인규칙 {
  패턴: RegExp;
  주인: string[];
}

/** CODEOWNERS 한 줄의 패턴(gitignore 꼴)을 정규식으로 — `*` · `**` · 앞 `/` · 끝 `/` 만 푼다 */
function 패턴정규식(패턴: string): RegExp {
  const 폴더만 = 패턴.endsWith('/');
  // 앞 `**/` 는 뿌리를 포함한 어느 깊이든이라 떼고 「어느 깊이」로 센다
  const 깊이무관 = 패턴.startsWith('**/');
  const 몸 = (깊이무관 ? 패턴.slice(3) : 패턴).replace(/^\//, '').replace(/\/$/, '');
  // 앞에 / 가 있거나 가운데 / 가 있으면 저장소 뿌리에서 시작하고, 아니면 어느 깊이의 이름에도 맞는다
  const 뿌리부터 = !깊이무관 && (패턴.startsWith('/') || 몸.includes('/'));
  const 조각식 = (글: string) =>
    글
      .split('**')
      .map((조각) => 조각.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]'))
      .join('.*');
  // 가운데 `/**/` 는 폴더 0개 이상이다
  const 식 = 몸.split('/**/').map(조각식).join('/(?:.*/)?');
  // 끝이 단일 * 이면 그 폴더 바로 아래만, 그 밖에는 폴더 이름도 안쪽 파일에 맞는다
  const 끝 = 폴더만 ? '/.*' : 몸.endsWith('*') && !몸.endsWith('**') ? '' : '(?:/.*)?';
  return new RegExp(`^${뿌리부터 ? '' : '(?:.*/)?'}${식}${끝}$`);
}

/** CODEOWNERS 글을 규칙 목록으로 푼다. 주석(#)과 빈 줄은 건너뛴다 */
export function 코드주인풀기(글: string): 주인규칙[] {
  const 규칙: 주인규칙[] = [];
  for (const 줄 of 글.split('\n')) {
    const 칸들 = 줄.replace(/(^|\s)#.*$/, '').trim().split(/\s+/).filter((칸) => 칸 !== '');
    if (칸들.length === 0) continue;
    규칙.push({ 패턴: 패턴정규식(칸들[0]!), 주인: 칸들.slice(1) });
  }
  return 규칙;
}

const 이메일꼴 = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** 파일 하나의 주인 중 이메일 꼴만. 마지막에 맞는 규칙이 이긴다(GitHub 규칙) — `@아이디` · 팀은 BTS 와 못 이어 건너뛴다 */
export function 파일주인(규칙: readonly 주인규칙[], 경로: string): 사람[] {
  const 맞은 = [...규칙].reverse().find((r) => r.패턴.test(경로));
  return (맞은?.주인 ?? []).filter((p) => 이메일꼴.test(p)).map((email) => ({ email, name: email.split('@')[0]! }));
}

/** `git diff -U0` 글에서 옛 줄 범위를 뽑는다. 줄 수가 0(끼워 넣기)이면 앞줄 하나, 파일 맨 앞(0줄 뒤)은 건너뛴다 */
export function 옛범위풀기(diff글: string): { 시작: number; 줄수: number }[] {
  const 범위: { 시작: number; 줄수: number }[] = [];
  for (const m of diff글.matchAll(/^@@ -(\d+)(?:,(\d+))? \+/gm)) {
    const 시작 = Number(m[1]);
    const 줄수 = m[2] === undefined ? 1 : Number(m[2]);
    if (시작 >= 1) 범위.push({ 시작, 줄수: Math.max(줄수, 1) });
  }
  return 범위;
}

/** `git blame --porcelain` 글에서 줄을 마지막으로 바꾼 사람. 얕은 복제의 맨 아래 커밋(boundary)은 진짜 작성자가 아니라 건너뛴다 */
export function blame풀기(글: string): 사람[] {
  const 사람들: 사람[] = [];
  let 이름 = '';
  let 메일 = '';
  let 경계 = false;
  const 내보내기 = () => {
    if (메일 !== '' && !경계) 사람들.push({ email: 메일, name: 이름 });
    이름 = 메일 = '';
    경계 = false;
  };
  for (const 줄 of 글.split('\n')) {
    if (/^[0-9a-f]{40} \d+ \d+/.test(줄)) 내보내기();
    else if (줄.startsWith('author ')) 이름 = 줄.slice(7);
    else if (줄.startsWith('author-mail ')) 메일 = 줄.slice(12).replace(/^<|>$/g, '');
    else if (줄 === 'boundary') 경계 = true;
  }
  내보내기();
  return 사람들;
}

function 봇인가(p: 사람): boolean {
  return /noreply|\[bot\]/i.test(p.email) || /\[bot\]/i.test(p.name);
}

/** 차례대로 합쳐 중복(메일 대소문자 무시)과 봇을 빼고 상한에 맞춘다 */
export function 넘길사람모으기(...목록들: readonly (readonly 사람[])[]): 사람[] {
  const 본 = new Set<string>();
  const 결과: 사람[] = [];
  for (const p of 목록들.flat()) {
    const 키 = p.email.toLowerCase();
    if (p.email === '' || 본.has(키) || 봇인가(p)) continue;
    본.add(키);
    결과.push({ email: 글자자르기(p.email, 상한.사람글), name: 글자자르기(p.name || p.email.split('@')[0]!, 상한.사람글) });
    if (결과.length >= 상한.사람수) break;
  }
  return 결과;
}

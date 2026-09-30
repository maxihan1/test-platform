// 역방향 산출물을 올리기 전에 읽고 바꾸는 것 — 산출물 읽기 · 역기획서 워드 준비
// authoring-upload.ts 가 300줄에 닿아 뗐다 (2026-09-30)

import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import { join } from 'node:path';

import { type 계정, type 사본 } from './authoring-copy.js';
import { 친다 } from './authoring-io.js';
import { 계정섞였나, 글모두, 되읽기인자, 변환인자, 변환환경, 원고거부사유 } from './authoring-reverse.js';

const 워드상한 = 20 * 1024 * 1024;

/**
 * 자식이 `<자료>/out/` 에 쓴 산출물 하나를 읽는다. 없으면 `몸: null`.
 * **root 가 읽는다** — 링크·하드링크(`nlink`)·`out` 폴더 바꿔치기(실제 경로 대조)를 거부해야 자식이 가리킨
 * 남의 파일(토큰·환경)이 PR·서버로 나가지 않는다. 자식은 이미 거둬져 읽는 사이에 바꿀 프로세스가 없다
 */
export function 산출물읽기(자리: 사본, 이름: string, 상한: number): { 몸: Buffer | null } | { 사유: string } {
  const 파일 = join(자리.자료, 'out', 이름);
  let 정보;
  try {
    정보 = lstatSync(파일);
  } catch {
    return { 몸: null };
  }
  if (!정보.isFile() || 정보.nlink !== 1 || realpathSync(파일) !== join(realpathSync(자리.자료), 'out', 이름)) {
    return { 사유: `산출물 ${이름} 이 일반 파일이 아니거나 산출물 폴더 밖을 가리킨다 — 올리지 않는다` };
  }
  if (정보.size > 상한) return { 사유: `산출물 ${이름} 이 너무 크다 — 올리지 않는다` };
  return { 몸: readFileSync(파일) };
}

/**
 * **push 전에** 원고를 워드로 바꾸고, 바꾼 것을 문서 구조로 되읽어 비밀번호를 한 번 더 찾는다.
 * 새면 `누설` — 요청을 올리기 거절 중단으로 끝낸다(명세 §3.6). 못 바꾸면 `사유` — 케이스는 올리고 이유만 남긴다(게이트 1).
 * PR 을 세우기 전에 하는 까닭 — 뒤에서 새는 것을 알면 이미 선 PR 이 실패 요청에 매달린다
 */
export function 역기획서준비(
  자리: 사본,
  원고: string,
  비밀: string | null | undefined,
  자식: 계정 | null,
): { 워드: Buffer } | { 사유: string } | { 누설: true } {
  const 거부 = 원고거부사유(원고);
  if (거부 !== null) return { 사유: 거부 };
  const 폴더 = join(자리.자료, 'out');
  const 칠때 = { env: 변환환경(process.env, { HOME: 자리.집, TMPDIR: 자리.임시 }), ...(자식 === null ? {} : 자식) };
  const 바꿈 = 친다('pandoc', 변환인자('reverse-spec.md', 'reverse-spec.docx'), 폴더, undefined, 120_000, 칠때);
  if (!바꿈.ok) return { 사유: '역기획서를 워드로 못 바꿨다' };
  const 되읽음 = 친다('pandoc', 되읽기인자('reverse-spec.docx', 'reverse-spec.check.json'), 폴더, undefined, 120_000, 칠때);
  const 구조 = 되읽음.ok ? 산출물읽기(자리, 'reverse-spec.check.json', 워드상한) : { 사유: '' };
  if ('사유' in 구조 || 구조.몸 === null) return { 사유: '역기획서를 다시 읽어 확인하지 못해 올리지 않았다' };
  let 값: unknown;
  try {
    값 = JSON.parse(구조.몸.toString('utf8'));
  } catch {
    return { 사유: '역기획서를 다시 읽어 확인하지 못해 올리지 않았다' };
  }
  if (계정섞였나(글모두(값), 비밀)) return { 누설: true };
  const 워드 = 산출물읽기(자리, 'reverse-spec.docx', 워드상한);
  if ('사유' in 워드 || 워드.몸 === null) return { 사유: '역기획서 워드 파일을 못 읽었다' };
  return { 워드: 워드.몸 };
}

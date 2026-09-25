// 미확정 항목을 화면에 적는 규칙 한 벌. 막대·실행 목록·결과 머리·완료 모달이 같은 꼴을 쓴다 (도메인/실행 §3.2)
// 자리마다 따로 적으면 같은 실행이 두 숫자로 보인다 — 그래서 한 곳에 둔다

import type { RunCounts } from './api.js';
import { t, type 언어 } from './i18n.js';

/** 끝난 미확정 항목 수. `unconfirmed.total` 을 쓰면 진행 중인 것이 running 과 두 번 잡힌다 (§3.2) */
export function 끝난미확정(counts: RunCounts): number {
  const u = counts.unconfirmed;
  return u === undefined ? 0 : u.pass + u.fail + u.na;
}

/** `미확정 5(통과 4 · 실패 1)`. 미확정이 없으면 빈 글자 — 묶음 자체를 안 쓴다. 0 인 칸은 뺀다 (§3.2) */
export function 미확정글자(counts: RunCounts, 언어: 언어): string {
  const 수 = 끝난미확정(counts);
  const u = counts.unconfirmed;
  if (수 === 0 || u === undefined) return '';
  const 칸 = [
    u.pass > 0 ? t('통과 {수}', 언어, { 수: u.pass }) : '',
    u.fail > 0 ? t('실패 {수}', 언어, { 수: u.fail }) : '',
    u.na > 0 ? t('미실행 {수}', 언어, { 수: u.na }) : '',
  ].filter((글) => 글 !== '');
  return t('미확정 {수}({칸})', 언어, { 수, 칸: 칸.join(' · ') });
}

/**
 * 미확정만 돌린 실행인가. 그런 실행은 성공에도 실패에도 세지 않아 판정 색을 칠하지 않는다 (§3.2 · §8.7).
 * 확정 항목 수는 전체에서 미확정 전부(진행 중 포함)를 뺀 것이다
 */
export function 판정없음(counts: RunCounts): boolean {
  const 미확정전부 = counts.unconfirmed?.total ?? 0;
  return 미확정전부 > 0 && counts.total - 미확정전부 === 0;
}

/** 처음 미확정이 된 뒤 지난 날 수. 기획 답을 얼마나 기다렸나를 보인다 (도메인/카탈로그 §3.1) */
export function 미확정나이(since: string, 지금: Date = new Date()): number {
  return Math.max(0, Math.floor((지금.getTime() - new Date(since).getTime()) / 86_400_000));
}

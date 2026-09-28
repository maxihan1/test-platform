// 작성 요청 한 건을 Status 카드의 단계 막대 · 시간 막대로 바꾸는 판단. 그림은 AuthoringStatusCard.tsx (DESIGN.md 「작성 상태」)

import type { AuthoringProgress, AuthoringRow } from './api.js';
import { t, type 언어 } from './i18n.js';

/** 단계 막대의 다섯 칸 (말 키) */
export const 단계이름들 = ['준비', '자료 받기', '케이스 작성', '올리기·PR', '완료'] as const;

export function 단계라벨(이름: (typeof 단계이름들)[number], 언어: 언어): string {
  return t(이름, 언어);
}

/**
 * 에이전트가 올린 단계 글을 화면 말로. 아는 글은 영어 표에 있어 번역되고, 모르는 글은 그대로 나간다 —
 * `t()` 는 표에 없는 키를 그대로 돌려준다
 */
export function 단계글라벨(글: string, 언어: 언어): string {
  return t(글, 언어);
}

/**
 * 에이전트가 올리는 단계 글 → 칸 자리.
 * **정본은 에이전트 스크립트의 `손.단계('…')` 부르는 자리다**(scripts/authoring-run.ts · authoring-upload.ts).
 * 글을 바꾸면 여기가 모르는 글이 되어 아래 대체 규칙으로 떨어진다 — 멈추지는 않고 칸만 덜 정확해진다
 */
const 단계글: Record<string, number> = {
  '작업방을 만드는 중': 0,
  '자료를 받는 중': 1,
  '케이스를 만드는 중': 2,
  '올리는 중': 3,
  '역방향 산출물을 올리는 중': 3,
  '원본에 차이를 표시하는 중': 3,
};

export interface 자리 {
  /** 끝낸 칸 수 */
  끝난: number;
  /** 지금(또는 멈춘) 칸. 시작 전이거나 다 끝났으면 null */
  지금: number | null;
  멈춤: 'stopped' | 'failed' | null;
}

/** 머지는 자식을 안 띄워 이 다섯 칸을 안 밟는다 — null 이면 카드가 막대를 안 그린다 */
export function 단계자리(행: AuthoringRow): 자리 | null {
  if (행.kind === 'MERGE') return null;
  if (행.status === 'DONE') return { 끝난: 단계이름들.length, 지금: null, 멈춤: null };
  if (행.status === 'DRAFT' || 행.status === 'PENDING') return { 끝난: 0, 지금: null, 멈춤: null };
  // 집히기 전에 줄에서 뺀 것 — 준비 칸에서 멈춘 것처럼 그리면 시작한 적 있는 것으로 읽힌다
  if (행.status === 'STOPPED' && 행.startedAt === null) return { 끝난: 0, 지금: null, 멈춤: 'stopped' };
  // 진척이 있으면 자식을 띄운 뒤다 — 모르는 글이어도 케이스 작성까지는 왔다
  const 칸 = (행.stage === null ? undefined : 단계글[행.stage]) ?? (행.progress ? 2 : 0);
  const 멈춤 = 행.status === 'FAILED' ? 'failed' : 행.status === 'STOPPED' ? 'stopped' : null;
  return { 끝난: 칸, 지금: 칸, 멈춤 };
}

/**
 * 번호는 지금(또는 멈춘) 단계, 비율은 **끝낸 단계 수**다 — 3단계가 도는 중이면 「3단계 진행 중 · 40%」.
 * 앞 판은 도는 칸까지 막대에 채워 60% 로 적었는데, 멈춘 것은 40% 라 같은 번호에 %가 둘이었다 (2026-09-28 화면 검사)
 */
export function 진척(자리: 자리): { 번호: number; 비율: number } {
  return { 번호: 자리.지금 === null ? 자리.끝난 : 자리.지금 + 1, 비율: 자리.끝난 / 단계이름들.length };
}

/** 마지막 활동 글. 에이전트가 흘릴줄 앞에 붙이는 표지(`· ` 도구 · `» ` 말)를 뗀다 */
export function 활동글(글: string): string {
  return 글.replace(/^[·»]\s*/u, '');
}

/** 숫자 칸 넷이 다 숫자인 진척만 쓴다 — 자식이 끝난 뒤 서버가 childRunning 만 내린 반쪽이 올 수 있다 */
export function 진척이찼나(p: AuthoringProgress | null | undefined): p is AuthoringProgress {
  return (
    p !== null && p !== undefined && [p.elapsedSec, p.limitSec, p.caseFiles, p.tokens].every((v) => typeof v === 'number')
  );
}

export interface 한도판 {
  지난ms: number;
  한도ms: number;
  비율: number;
  늦어도: Date;
}

export interface 시간 {
  시작: Date | null;
  끝: Date | null;
  걸린ms: number | null;
  /** 케이스 작성(자식)이 도는 동안만. 한도는 그 한 번의 것이라 올리기·PR 은 안 든다 */
  한도: 한도판 | null;
}

export function 시간판(행: AuthoringRow, 지금: number): 시간 {
  const 시작 = 행.startedAt === null ? null : new Date(행.startedAt);
  const 끝난것 = 행.status === 'DONE' || 행.status === 'FAILED' || 행.status === 'STOPPED';
  const 끝 = 끝난것 && 행.finishedAt !== null ? new Date(행.finishedAt) : null;
  const 걸린ms = 시작 === null ? null : (끝?.getTime() ?? 지금) - 시작.getTime();

  const p = 행.progress;
  let 한도: 한도판 | null = null;
  if (행.status === 'RUNNING' && 진척이찼나(p) && p.childRunning && p.limitSec > 0) {
    // 진척은 신호(stage_at)와 같이 저장된다 — 그 순간 elapsedSec 만큼 지났으니 자식 시작을 거꾸로 잰다.
    // 30초 사이에도 막대가 흐르게 지금 시각으로 다시 센다
    const 신호 = 행.stageAt === null ? 지금 : Date.parse(행.stageAt);
    const 자식시작 = 신호 - p.elapsedSec * 1000;
    const 한도ms = p.limitSec * 1000;
    const 지난ms = Math.max(0, 지금 - 자식시작);
    한도 = { 지난ms, 한도ms, 비율: Math.min(1, 지난ms / 한도ms), 늦어도: new Date(자식시작 + 한도ms) };
  }
  return { 시작, 끝, 걸린ms, 한도 };
}

/**
 * 목록 한 줄의 글. 에이전트의 날것 단계 글(`끝` · 빈 칸)을 그대로 보이지 않는다 —
 * 도는 것은 지금 하는 일, 끝난 것은 결과 한 문장이다 (2026-09-28 사용자 「워딩이 이상하다」)
 */
export function 목록글(행: AuthoringRow, 언어: 언어): string {
  // 올리는 도중에도, 올리다 멈춰 버려진 뒤에도 DRAFT 다 — 둘 다에 맞는 말을 쓴다
  if (행.status === 'DRAFT') return t('자료 올리기가 끝나지 않았습니다', 언어);
  if (행.status === 'PENDING') return t('에이전트 순서를 기다리는 중', 언어);
  if (행.status === 'RUNNING') return 행.stage === null ? t('준비', 언어) : 단계글라벨(행.stage, 언어);
  if (행.status === 'FAILED') return 행.error?.split('\n')[0] ?? t('실패', 언어);
  if (행.status === 'STOPPED') {
    if (행.startedAt === null) return t('시작 전에 멈췄습니다', 언어);
    const 칸 = 단계자리(행)?.지금 ?? 0;
    return t('{단계} 단계에서 멈췄습니다', 언어, { 단계: 단계라벨(단계이름들[칸] ?? '준비', 언어) });
  }
  if (행.kind === 'MERGE') return t('테스트 반영 완료', 언어);
  return 진척이찼나(행.progress)
    ? t('케이스 파일 {수}개를 만들었습니다', 언어, { 수: 행.progress.caseFiles })
    : t('테스트 코드를 PR 로 올렸습니다', 언어);
}

const 줄임 = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });

/** 1234567 → 1.2M. 칸이 좁고 하한값이라 자릿수까지 셀 까닭이 없다 */
export function 짧은수(n: number): string {
  return 줄임.format(n);
}

/**
 * 「같은 자료로 다시 작성」(RERUN)을 낼 수 있나. 서버 규칙의 사본이다 — 정본은 도메인/작성 §7 RERUN:
 * 원본이 AUTHOR 여야 한다 — 대조 요청도 된다(재실행이 대조 설정을 물려받는다, 2026-09-28).
 * 폐기한 원본도 서버가 거절한다. 버튼을 안 그리는 것은 편의이고 서버가 다시 막는다
 */
export function 다시작성되나(행: AuthoringRow): boolean {
  return (
    행.kind === 'AUTHOR' &&
    (행.discardedAt ?? null) === null &&
    (행.status === 'FAILED' || 행.status === 'STOPPED')
  );
}

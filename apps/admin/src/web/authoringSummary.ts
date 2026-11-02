// 작성 목록 줄 · 상세 머리의 summary 를 사람 말로 — 종류 꼬리표 · 무슨 테스트 · 결과 · 시작한 곳 (도메인/작성 §3.6 「작성 목록 줄」)

import type { 목록요약, 요약종류 } from '../authoring/listSummary.js';

import { 단계라벨, 단계이름들, 단계칸, 아는단계글 } from './authoringStatus.js';
import { t, type 언어 } from './i18n.js';
import { when } from './ui.js';

const 종류글: Record<요약종류, string> = {
  PRD: '기획서로 작성',
  API_DOC: 'API 문서로 작성',
  UNCOVERED: '기획서에 없는 화면',
  SCREEN_ONLY: '화면만 대조',
  CONTINUE: '남은 요구 이어 작성',
  PRD_APPLY: '바뀐 요구 다시 작성',
  API_APPLY: '바뀐 API 다시 작성',
  DECISION: '결정 진행',
  EDIT: '케이스 고치기',
};

export function 종류꼬리표(s: 목록요약, 언어: 언어): string {
  return t(종류글[s.kind], 언어);
}

/** 이름들과 「외 N개」 */
function 셋과나머지(이름들: string[], 더: number, 언어: 언어): string {
  const 앞 = 이름들.join(' · ');
  return 더 > 0 ? t('{이름} 외 {수}개', 언어, { 이름: 앞, 수: 더 }) : 앞;
}

/** 자료 이름 — 피그마는 주소 대신 「Figma 디자인」 */
function 자료이름(a: { name: string; figma: boolean }, 언어: 언어): string {
  return a.figma ? t('Figma 디자인', 언어) : a.name;
}

/**
 * 무슨 테스트 — 줄 제목. 끝나기 전이라 모르면 자료 이름, 자료도 없으면 종류다.
 * 앞 판 제목은 처음 넣은 자료 이름이라 무슨 테스트를 만들었는지 몰랐다(2026-10-26 사용자 「안 보이는 문제가 아니라 내용이 문제」)
 */
export function 무슨테스트(s: 목록요약, 언어: 언어): string {
  const w = s.what;
  if ((s.kind === 'PRD' || s.kind === 'API_DOC' || s.kind === 'CONTINUE') && w.features.length > 0) {
    return t('기능 {수}개 테스트 · {이름들}', 언어, { 수: w.features.length + w.featuresMore, 이름들: 셋과나머지(w.features, w.featuresMore, 언어) });
  }
  if ((s.kind === 'UNCOVERED' || s.kind === 'SCREEN_ONLY') && w.screens.length > 0) {
    return t('{이름들} 화면 테스트', 언어, { 이름들: 셋과나머지(w.screens, w.screensMore, 언어) });
  }
  if (s.kind === 'PRD_APPLY' && w.reqs > 0) return t('요구 {수}건 테스트 다시 작성', 언어, { 수: w.reqs });
  if (s.kind === 'DECISION' && w.reqs + w.screenRight > 0) {
    const 조각 = [
      w.reqs > 0 ? t('바뀐 요구 {수}건', 언어, { 수: w.reqs }) : null,
      w.screenRight > 0 ? t('화면이 맞음 {수}건', 언어, { 수: w.screenRight }) : null,
    ].filter((x): x is string => x !== null);
    return t('{조각} 테스트 고치기', 언어, { 조각: 조각.join(' · ') });
  }
  if (s.kind === 'EDIT' && w.tcIds.length > 0) {
    const 무엇 = t(w.fix === 'EXPECTED' ? '기대값 고치기' : w.fix === 'DELETE' ? '삭제§목록 줄' : '고치기§목록 줄', 언어);
    const 나머지 = w.tcIds.length - 1 + w.tcMore;
    return 나머지 > 0 ? t('{번호} 외 {수}건 {무엇}', 언어, { 번호: w.tcIds[0]!, 수: 나머지, 무엇 }) : [w.tcIds[0]!, 무엇].join(' ');
  }
  const 자료 = s.from.assets;
  if (자료.length > 0) return 셋과나머지(자료.slice(0, 1).map((a) => 자료이름(a, 언어)), 자료.length - 1 + s.from.assetsMore, 언어);
  return 종류꼬리표(s, 언어);
}

/**
 * 결과 — 끝난 실행만. 0 인 조각은 뺀다. 아무 조각도 없거나 끝나기 전이면 null — 줄은 지금 상태 글을 대신 보인다.
 * 멈춤 · 실패는 실패 색이다
 */
export function 결과글(s: 목록요약, 언어: 언어): { 글: string; 실패: boolean } | null {
  const r = s.result;
  if (r === null) return null;
  if (r.stoppedAt !== null) {
    // 고치기는 단계 막대가 없다 — 「준비 단계에서」라 하면 어디서 멈췄는지 거짓말을 한다
    if (s.kind === 'EDIT') return { 글: t('고치는 중에 멈춤', 언어), 실패: true };
    if (r.stoppedAt === '') return { 글: t('시작 전에 멈춤', 언어), 실패: true };
    const 만든 = (r.casesMade ?? 0) > 0 ? t('케이스 {수}건 만듦', 언어, { 수: r.casesMade! }) : t('만든 케이스 없음', 언어);
    // 칸 표에 없는 단계 글(겹침 보기 · 3회 돌리기 같은)을 첫 칸으로 옮기면 어디서 멈췄는지 거짓말을 한다 — 단계 없이 멈춤만 말한다
    if (r.stoppedAt !== '준비' && !아는단계글(r.stoppedAt)) return { 글: [t('중간에 멈춤', 언어), 만든].join(' · '), 실패: true };
    const 단계 = 단계라벨(단계이름들[단계칸(r.stoppedAt, false)] ?? '준비', 언어);
    return { 글: [t('{단계} 단계에서 멈춤', 언어, { 단계 }), 만든].join(' · '), 실패: true };
  }
  const 조각 = [
    (r.casesMade ?? 0) > 0 ? t('케이스 {수}건 만듦', 언어, { 수: r.casesMade! }) : null,
    (r.casesFixed ?? 0) > 0 ? t('케이스 {수}건 고침', 언어, { 수: r.casesFixed! }) : null,
    r.reqsTotal !== null && r.reqsCovered !== null && r.reqsTotal > 0 ? t('요구 {전체}건 중 {덮음}건', 언어, { 전체: r.reqsTotal, 덮음: r.reqsCovered }) : null,
    (r.held ?? 0) > 0 ? t('보류 {수}건', 언어, { 수: r.held! }) : null,
  ].filter((x): x is string => x !== null);
  return 조각.length === 0 ? null : { 글: 조각.join(' · '), 실패: false };
}

/** 시작한 곳 · 자료 · 요청한 사람 · 시각. 서버가 세운 요청은 요청한 사람이 아니라 앞 뿌리를 적는다 */
export function 시작글(s: 목록요약, 행: { requestedByName: string; createdAt: string }, 언어: 언어): string {
  const f = s.from;
  const 조각: string[] = [];
  if (f.by === 'PRD') 조각.push(t('PRD 관리에서 시작', 언어));
  if (f.by === 'AUTO' && f.after !== null) 조각.push(t('#{번호} 다음 · 서버가 자동으로 시작', 언어, { 번호: f.after }));
  if (f.by === 'CASES') 조각.push(t('케이스 목록에서 시작', 언어));
  if (f.by === 'DECISION' && f.decisions !== null) 조각.push(t('결정 {수}건', 언어, { 수: f.decisions }));
  if (s.kind === 'CONTINUE' && f.after !== null) 조각.push(t('#{번호}의 남은 요구', 언어, { 번호: f.after }));
  if (f.assets.length > 0) {
    조각.push(t('자료 {이름들}', 언어, { 이름들: 셋과나머지(f.assets.map((a) => 자료이름(a, 언어)), f.assetsMore, 언어) }));
  }
  if (f.by !== 'AUTO') 조각.push(`${t('요청한 사람', 언어)} ${행.requestedByName}`);
  조각.push(when(행.createdAt, 언어));
  return 조각.join(' · ');
}

/**
 * 결정 목록 ① 의 N — 그 실행이 만들고 고친 케이스. 모르거나 0 이면 null(수 없이 묻는다).
 * 케이스 고치기는 지우기도 고친 수에 들어 「올릴까요」의 수로 쓰면 틀린다 — 수 없이 묻는다
 */
export function 올릴테스트수(s: 목록요약): number | null {
  const r = s.result;
  if (r === null || s.kind === 'EDIT') return null;
  const 수 = (r.casesMade ?? 0) + (r.casesFixed ?? 0);
  return 수 > 0 ? 수 : null;
}

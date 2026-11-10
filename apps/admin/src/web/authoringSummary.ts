// 작성 목록 표의 칸 글 · 상세 머리의 제목을 summary 에서 사람 말로 (도메인/작성 §3.6 「작성 목록 줄」)

import type { 목록요약, 요약종류 } from '../authoring/listSummary.js';

import type { AuthoringRow } from './api.js';
import { 단계라벨, 단계이름들, 단계칸, 아는단계글 } from './authoringStatus.js';
import type { 보임 } from './authoringView.js';
import { t, type 언어 } from './i18n.js';

const 종류글: Record<요약종류, string> = {
  PRD: '기획서로 작성',
  API_DOC: 'API 문서로 작성',
  UNCOVERED: '기획서에 없는 화면',
  SCREEN_ONLY: '화면만 대조',
  CONTINUE: '남은 요구사항 이어 작성',
  PRD_APPLY: '변경된 요구사항 다시 작성',
  API_APPLY: '변경된 API 다시 작성',
  DECISION: '결정 진행',
  EDIT: '케이스 수정',
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
  if (s.kind === 'PRD_APPLY' && w.reqs > 0) return t('요구사항 {수}건 테스트 다시 작성', 언어, { 수: w.reqs });
  if (s.kind === 'DECISION' && w.reqs + w.screenRight > 0) {
    const 조각 = [
      w.reqs > 0 ? t('변경된 요구사항 {수}건', 언어, { 수: w.reqs }) : null,
      w.screenRight > 0 ? t('화면이 맞음 {수}건', 언어, { 수: w.screenRight }) : null,
    ].filter((x): x is string => x !== null);
    return t('{조각} 테스트 수정', 언어, { 조각: 조각.join(' · ') });
  }
  if (s.kind === 'EDIT' && w.tcIds.length > 0) {
    const 무엇 = t(w.fix === 'EXPECTED' ? '기대 결과 수정' : w.fix === 'DELETE' ? '삭제§목록 줄' : '수정§목록 줄', 언어);
    const 나머지 = w.tcIds.length - 1 + w.tcMore;
    return 나머지 > 0 ? t('{번호} 외 {수}건 {무엇}', 언어, { 번호: w.tcIds[0]!, 수: 나머지, 무엇 }) : [w.tcIds[0]!, 무엇].join(' ');
  }
  const 자료 = s.from.assets;
  if (자료.length > 0) return 셋과나머지(자료.slice(0, 1).map((a) => 자료이름(a, 언어)), 자료.length - 1 + s.from.assetsMore, 언어);
  return 종류꼬리표(s, 언어);
}

/** 구분 — 신규 · 수정 · 추가 셋뿐이다. 「작성」을 붙이지 않고 다시 작성 · 케이스 수정 · 결정 진행은 모두 수정이다 (2026-11-10 사용자 시안) */
const 구분표: Record<요약종류, string> = {
  PRD: '신규',
  API_DOC: '신규',
  SCREEN_ONLY: '신규',
  PRD_APPLY: '수정§작성 구분',
  API_APPLY: '수정§작성 구분',
  DECISION: '수정§작성 구분',
  EDIT: '수정§작성 구분',
  CONTINUE: '추가§작성 구분',
  UNCOVERED: '추가§작성 구분',
};

export function 구분글(s: 목록요약, 언어: 언어): string {
  return t(구분표[s.kind], 언어);
}

/** 대상 — 반영되는 기능 이름(화면만 다루는 줄은 화면 이름) 셋과 「외 N개」. 모르면 「—」 */
export function 대상글(s: 목록요약, 언어: 언어): string {
  const w = s.what;
  const 화면줄 = s.kind === 'UNCOVERED' || s.kind === 'SCREEN_ONLY';
  const 이름들 = 화면줄 ? w.screens : w.features;
  return 이름들.length === 0 ? '—' : 셋과나머지(이름들, 화면줄 ? w.screensMore : w.featuresMore, 언어);
}

/** 케이스 수 — 만든 것과 수정한 것을 더한다. 끝나기 전이라 모르면 null */
export function 케이스수(s: 목록요약): number | null {
  const r = s.result;
  if (r === null || (r.casesMade === null && r.casesFixed === null)) return null;
  return (r.casesMade ?? 0) + (r.casesFixed ?? 0);
}

/** 소요 시간(초) — 끝난 작성은 서버가 잰 값, 도는 작성은 집힌 때부터 지금까지. 반영 실행은 작성 시간이 아니라 재지 않는다 */
export function 소요초(s: 목록요약, 행: Pick<AuthoringRow, 'kind' | 'status' | 'startedAt'>, 지금: number): number | null {
  if (s.result !== null && s.result.tookSec !== null) return s.result.tookSec;
  if (행.kind === 'MERGE' || 행.status !== 'RUNNING' || 행.startedAt === null) return null;
  return Math.max(0, Math.round((지금 - Date.parse(행.startedAt)) / 1000));
}

/** 작성은 몇 시간씩 걸려 분 위로 시간을 쓴다 — `45초` · `18분` · `1시간 12분` */
export function 소요시간글(초: number, 언어: 언어): string {
  if (초 < 60) return t('{초}초', 언어, { 초 });
  const 분 = Math.floor(초 / 60);
  if (분 < 60) return t('{분}분', 언어, { 분 });
  const 시 = Math.floor(분 / 60);
  return 분 % 60 === 0 ? t('{시}시간', 언어, { 시 }) : t('{시}시간 {분}분', 언어, { 시, 분: 분 % 60 });
}

/** 표 안의 작성일 — `2026-11-10 14:22`. 사용자 시간대로 */
export function 작성일글(iso: string): string {
  const d = new Date(iso);
  const 두자리 = (n: number): string => String(n).padStart(2, '0');
  return `${String(d.getFullYear())}-${두자리(d.getMonth() + 1)}-${두자리(d.getDate())} ${두자리(d.getHours())}:${두자리(d.getMinutes())}`;
}

/** 작성자 — 서버가 스스로 세운 요청(기획서에 없는 화면)은 사람이 아니라 Agent 다 */
export function 작성자글(s: 목록요약, 행: Pick<AuthoringRow, 'requestedByName'>): string {
  return s.from.by === 'AUTO' ? 'Agent' : 행.requestedByName;
}

/**
 * 상태 뒤에 붙는 단계 — 작성 중이면 「케이스 작성 3/6」, 실패 · 중단이면 멈춘 단계.
 * 케이스 수정 · 반영은 단계 막대가 없고, 칸 표에 없는 단계 글은 칸으로 옮기면 거짓말이라 붙이지 않는다
 */
export function 단계꼬리(s: 목록요약, 행: Pick<AuthoringRow, 'kind' | 'stage'>, 보: 보임, 언어: 언어): string | null {
  if (s.kind === 'EDIT' || 행.kind === 'MERGE') return null;
  const 글 = 보 === 'running' ? (행.stage ?? '준비') : 보 === 'failed' || 보 === 'stopped' ? (s.result?.stoppedAt ?? '') : '';
  if (글 === '' || (글 !== '준비' && !아는단계글(글))) return null;
  const 칸 = 단계칸(글 === '준비' ? null : 글, false);
  const 이름 = 단계라벨(단계이름들[칸] ?? '준비', 언어);
  return 보 === 'running' ? [이름, `${String(칸 + 1)}/${String(단계이름들.length)}`].join(' ') : 이름;
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

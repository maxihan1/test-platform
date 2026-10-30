// 본문 위 알림 줄과 알림 서랍이 보일 것을 고르고 문구로 옮기는 순수 함수 (SPEC 공통/5-화면공통 §8 「알림」). 그림은 Notice.tsx

import type { NoticeRecent, NoticeResponse, NoticeRunning } from './api.js';
import { 단계글라벨, 단계라벨, 단계이름들, 단계칸, 아는단계글 } from './authoringStatus.js';
import { t, type 언어 } from './i18n.js';
import { 실행남은글, 시간글자, 작성남은글 } from './remainText.js';
import { 그중미확정글 } from './unconfirmed.js';

/** 본문 위에 한꺼번에 보이는 줄 수. 넘으면 마지막 자리를 「외 N건」으로 바꾼다 */
export const 줄최대 = 3;

/**
 * 끝난 지 이만큼 안 된 것만 줄로 알린다. 서랍은 7일치를 다 보인다.
 *
 * 없으면 어제 끝난 실행이 오늘도 뜬다 — **그것은 소식이 아니라 기록이다.**
 * 한 번 돌리면 최악 50분이라 자리를 떴다 돌아오는 시간을 넉넉히 덮는다.
 */
export const 끝난소식유효 = 2 * 60 * 60 * 1000;

type 알림재료 = NoticeRunning | NoticeRecent;

/** 읽음 목록의 열쇠이자 줄의 key. `noticeRead.ts` 가 이 꼴을 그대로 저장한다 */
export function 읽음열쇠(n: 알림재료): string {
  return n.kind === 'authoring' ? `authoring:${String(n.requestId)}` : `run:${String(n.runId)}`;
}

function 번호(n: 알림재료): number {
  return n.kind === 'authoring' ? n.requestId : n.runId;
}

// E2E 실행도 같은 주소다 — 실행 결과 화면이 시나리오 실행이면 E2E 결과로 갈라 그린다
function 열기주소(n: 알림재료): string {
  return n.kind === 'authoring' ? `#/authoring/${String(n.requestId)}` : `#/runs/${String(n.runId)}`;
}

// 도는 것의 차례 — 케이스 실행 → E2E 실행 → 작성 (E2E 도 실행이라 실행 무리에 선다)
const 도는차례: Record<NoticeRunning['kind'], number> = { run: 0, scenario: 1, authoring: 2 };

export interface 막대칸 {
  통과: number;
  실패: number;
  미실행: number;
  남음: number;
}

export interface 도는줄 {
  도는중: true;
  열쇠: string;
  서비스: string;
  /** 작성 · PRD 고리는 사이드바 서비스로 읽어서, 누르기 전에 이 서비스로 바꾼다 */
  접두사: string;
  종류: 'run' | 'authoring';
  앞글: string;
  /** 실행만. 통과 · 실패 · 미실행 · 남음의 폭 */
  막대: 막대칸 | null;
  뒷글: string | null;
  열기: string;
}

export interface 끝난줄 {
  도는중: false;
  열쇠: string;
  서비스: string;
  접두사: string;
  종류: 'run' | 'authoring';
  /** 판정 색 아이콘을 고른다 — 실패가 있으면 fail, 사람이 멈췄으면 halt(판정이 아니라 중립), 아니면 pass */
  모양: 'pass' | 'fail' | 'halt';
  머리: string;
  /** 머리 뒤에 ` · ` 로 이어 붙이는 덧말 */
  집계: string[];
  /** 작성이 끝났는데 PRD 에 확인이 필요한 요구가 남은 수 */
  확인필요: number;
  열기: string;
  열기라벨: string;
  끝난때: string;
}

export type 줄 = 도는줄 | 끝난줄;

/** 줄에 붙는 한 줄 문구 전체 (머리 + 덧말). 서랍은 머리와 덧말을 따로 쓴다 */
export function 끝난글(줄: 끝난줄): string {
  return [줄.머리, ...줄.집계].join(' · ');
}

function 오류첫줄(오류: string | null): string | null {
  const 첫줄 = 오류?.split('\n')[0]?.trim();
  return 첫줄 === undefined || 첫줄 === '' ? null : 첫줄;
}

// 제목 · 종류 · 대상 서버 — 도는 줄과 끝난 줄이 같은 말로 어느 실행인지 알린다
function 실행덧말(n: Extract<NoticeRunning | NoticeRecent, { kind: 'run' }>, 언어: 언어): string[] {
  return [
    ...(n.title === '' ? [] : [n.title]),
    ...(n.testKind === null ? [] : [t(n.testKind === 'UI' ? 'UI 테스트' : '기능 테스트', 언어)]),
    t('대상 서버 {서버}', 언어, { 서버: n.env }),
  ];
}

export function 끝난줄만들기(n: NoticeRecent, 언어: 언어): 끝난줄 {
  const 바탕 = { 도는중: false as const, 열쇠: 읽음열쇠(n), 서비스: n.serviceName, 접두사: n.prefix, 열기: 열기주소(n), 끝난때: n.finishedAt };

  if (n.kind === 'run') {
    const { counts } = n;
    const 집계 = [...실행덧말(n, 언어), t('{수} 통과', 언어, { 수: counts.pass })];
    if (counts.fail > 0) 집계.push(t('{수} 실패', 언어, { 수: counts.fail }));
    if (counts.na > 0) 집계.push(t('{수} 미실행', 언어, { 수: counts.na }));
    // 미확정은 이미 위 숫자에 센 항목이다 — 「그중 N건」 한 줄만 뒤에 붙인다 (도메인/실행 §3.2)
    const 미확정 = 그중미확정글(counts, 언어);
    if (미확정 !== '') 집계.push(미확정);
    const 멈춤 = n.status === 'ABORTED';
    return {
      ...바탕,
      종류: 'run',
      모양: 멈춤 ? 'halt' : counts.fail > 0 ? 'fail' : 'pass',
      머리: t(멈춤 ? 'RUN {번호} 실행이 멈췄습니다' : 'RUN {번호} 실행이 끝났습니다', 언어, { 번호: n.runId }),
      집계,
      확인필요: 0,
      열기라벨: t('결과 보기', 언어),
    };
  }

  const 값 = { 번호: n.requestId };
  const 작성 = { ...바탕, 종류: 'authoring' as const, 열기라벨: t('작성 결과', 언어) };
  if (n.status === 'DONE') {
    return {
      ...작성,
      모양: 'pass',
      머리: t('#{번호} 작성 요청이 끝났습니다', 언어, 값),
      집계: n.caseFiles === null ? [] : [t('케이스 파일 {수}개', 언어, { 수: n.caseFiles })],
      확인필요: n.prdNeedsCheck,
    };
  }
  if (n.status === 'FAILED') {
    const 오류 = 오류첫줄(n.error);
    return { ...작성, 모양: 'fail', 머리: t('#{번호} 작성 요청이 실패했습니다', 언어, 값), 집계: 오류 === null ? [] : [오류], 확인필요: 0 };
  }
  return { ...작성, 모양: 'halt', 머리: t('#{번호} 작성 요청이 멈췄습니다', 언어, 값), 집계: [], 확인필요: 0 };
}

const 지난 = (startedAt: string, 지금: number) => Math.max(0, 지금 - Date.parse(startedAt));
const 지난글 = (ms: number, 언어: 언어) => t('{지난} 지남', 언어, { 지난: 시간글자(ms, 언어) });

export function 도는줄만들기(n: NoticeRunning, 지금: number, 언어: 언어): 도는줄 {
  const 종류: 도는줄['종류'] = n.kind === 'authoring' ? 'authoring' : 'run';
  const 바탕 = { 도는중: true as const, 열쇠: 읽음열쇠(n), 서비스: n.serviceName, 접두사: n.prefix, 종류, 열기: 열기주소(n) };

  if (n.kind === 'scenario') {
    const 앞 = [
      t('E2E RUN {번호} 실행 중', 언어, { 번호: n.runId }),
      ...(n.title === '' ? [] : [n.title]),
      t('{수}단계', 언어, { 수: n.parts }),
      지난글(지난(n.startedAt, 지금), 언어),
    ];
    return { ...바탕, 앞글: 앞.join(' · '), 막대: null, 뒷글: null };
  }

  if (n.kind === 'run') {
    const { counts } = n;
    return {
      ...바탕,
      // 막대는 aria-hidden 이라 색만으로 실패를 말하게 된다 — 실패가 있으면 글에도 적는다 (DESIGN 원칙 1)
      앞글: [
        t('RUN {번호} 실행 중', 언어, { 번호: n.runId }),
        ...실행덧말(n, 언어),
        t('{끝난} / {전체} 완료', 언어, { 끝난: n.done, 전체: n.total }),
        ...(counts.fail > 0 ? [t('실패 {수}', 언어, { 수: counts.fail })] : []),
      ].join(' · '),
      막대: counts.total === 0 ? null : { 통과: counts.pass, 실패: counts.fail, 미실행: counts.na, 남음: counts.running },
      뒷글: 실행남은글(n.remainingMs, 지금, 언어),
    };
  }

  const 값 = { 번호: n.requestId };
  // 줄에 서기 전이라 단계도 시간도 아직 없다
  if (n.status === 'PENDING' || n.startedAt === null) {
    return { ...바탕, 앞글: t('#{번호} 작성 요청이 순서를 기다리고 있습니다', 언어, 값), 막대: null, 뒷글: null };
  }
  // 알림 통로는 진척을 안 싣는다 — 단계 칸은 에이전트가 올린 글로만 센다
  const 지난ms = 지난(n.startedAt, 지금);
  // 반영 · 고치기는 작성 단계를 안 밟는다 — 단계 글이 있으면 그 글만, 없으면 아무것도 안 붙인다
  let 단계: string | null = null;
  if (n.stage !== null && (!n.fiveSteps || !아는단계글(n.stage))) {
    단계 = 단계글라벨(n.stage, 언어);
  } else if (n.fiveSteps) {
    // 알림 통로는 진척을 안 싣는다 — 단계 칸은 에이전트가 올린 글로만 센다
    const 칸 = 단계칸(n.stage, false);
    단계 = t('{번호} / {전체} 단계 {이름}', 언어, { 번호: 칸 + 1, 전체: 단계이름들.length, 이름: 단계라벨(단계이름들[칸] ?? '준비', 언어) });
  }
  const 앞 = [t('#{번호} 작성 요청이 진행 중입니다', 언어, 값), ...(단계 === null ? [] : [단계]), 지난글(지난ms, 언어)];
  return { ...바탕, 앞글: 앞.join(' · '), 막대: null, 뒷글: 작성남은글(지난ms, 지금, n.expected, 언어) };
}

/**
 * 본문 위에 그릴 줄. 도는 것 먼저(실행 → E2E → 작성, 각각 새것 먼저), 그다음 아직 안 읽은 끝난 것 새것 먼저.
 * 줄이 `줄최대` 를 넘으면 마지막 자리를 「외 N건」에 내주고 `넘친수` 가 그 N 이다
 */
export function 보일줄들(
  답: NoticeResponse,
  읽음: ReadonlySet<string>,
  지금: number,
  언어: 언어,
  보는실행: number | null = null,
): { 줄들: 줄[]; 넘친수: number } {
  // 결과 화면 머리에 같은 진행이 있어 보고 있는 실행의 도는 줄은 겹친다. 끝난 줄은 소식이라 남긴다.
  // E2E 결과 머리에는 진행 글이 없어 E2E 줄은 남긴다
  const 도는것 = 답.running
    .filter((n) => n.kind !== 'run' || n.runId !== 보는실행)
    .sort((a, b) => 도는차례[a.kind] - 도는차례[b.kind] || 번호(b) - 번호(a));
  const 끝난것 = 답.recent
    .filter((n) => !읽음.has(읽음열쇠(n)) && 지금 - Date.parse(n.finishedAt) < 끝난소식유효)
    .sort((a, b) => Date.parse(b.finishedAt) - Date.parse(a.finishedAt));

  const 전부: 줄[] = [...도는것.map((n) => 도는줄만들기(n, 지금, 언어)), ...끝난것.map((n) => 끝난줄만들기(n, 언어))];
  if (전부.length <= 줄최대) return { 줄들: 전부, 넘친수: 0 };
  return { 줄들: 전부.slice(0, 줄최대 - 1), 넘친수: 전부.length - (줄최대 - 1) };
}

/** 「알림」 버튼의 배지 수 — 서랍에 있는(7일) 것 가운데 이 브라우저가 아직 안 읽은 것 */
export function 안읽은수(recent: readonly NoticeRecent[], 읽음: ReadonlySet<string>): number {
  return recent.filter((n) => !읽음.has(읽음열쇠(n))).length;
}

/**
 * 토스트로 알릴 새 소식 하나 — 앞 답에 없던 안 읽은 것 가운데 가장 늦게 끝난 것.
 * 앞 답이 없으면(화면을 막 열었다) 없다 — 열기 전에 끝난 것은 소식이 아니라 줄 · 배지가 알린다.
 * `뺄실행` 은 완료 창(진행 알약)이나 결과 화면이 이미 알리는 실행이다
 */
export function 새소식(
  앞: readonly NoticeRecent[] | null,
  지금: readonly NoticeRecent[],
  읽음: ReadonlySet<string>,
  뺄실행: readonly (number | null)[],
): NoticeRecent | null {
  if (앞 === null) return null;
  const 있던 = new Set(앞.map(읽음열쇠));
  const 새것 = 지금.filter((n) => !있던.has(읽음열쇠(n)) && !읽음.has(읽음열쇠(n)) && !(n.kind === 'run' && 뺄실행.includes(n.runId)));
  return 서랍목록(새것, 읽음, 'all')[0] ?? null;
}

export type 거르개 = 'all' | 'run' | 'authoring' | 'unread';

/** 서랍 목록 — 새것 먼저. 거르개는 종류나 안 읽음 하나 */
export function 서랍목록(recent: readonly NoticeRecent[], 읽음: ReadonlySet<string>, 거르개: 거르개): NoticeRecent[] {
  return recent
    .filter((n) => (거르개 === 'all' ? true : 거르개 === 'unread' ? !읽음.has(읽음열쇠(n)) : n.kind === 거르개))
    .sort((a, b) => Date.parse(b.finishedAt) - Date.parse(a.finishedAt));
}

function 하루(ms: number): number {
  const d = new Date(ms);
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
}

/** 서랍 오른쪽의 상대 시각 — `{분}분 전` · `{시간}시간 전` · `어제` · 날짜 */
export function 상대시각(iso: string, 지금: number, 언어: 언어): string {
  const 때 = Date.parse(iso);
  const 차 = 지금 - 때;
  if (차 < 60_000) return t('방금', 언어);
  if (차 < 3_600_000) return t('{분}분 전', 언어, { 분: Math.floor(차 / 60_000) });
  const 일차 = Math.round((하루(지금) - 하루(때)) / 86_400_000);
  if (일차 <= 0) return t('{시간}시간 전', 언어, { 시간: Math.floor(차 / 3_600_000) });
  if (일차 === 1) return t('어제', 언어);
  return new Intl.DateTimeFormat(언어 === 'en' ? 'en-US' : 'ko-KR', { month: 'long', day: 'numeric' }).format(때);
}

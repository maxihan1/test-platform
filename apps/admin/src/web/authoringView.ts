// 작성 요청 한 줄을 화면이 어떻게 보여 줄지 정한다 (도메인/작성 §3.6). 판단만 여기, 그림은 Authoring.tsx

import { 고치기실행인가 as 서버판정, 행의고칠것, type 기대값 } from '../authoring/edit.js';

import type { AuthoringRow } from './api.js';
import { t, type 언어 } from './i18n.js';

/**
 * 보임 값은 **영문 식별자**다.
 *
 * 한국어로 두면 같은 글자가 **타입 값이면서 화면 글자**가 되어, 다국어 그물이
 * 어느 쪽인지 못 가린다 (`messages.test.ts`). `runState.ts` 의 `상태라벨` 이 같은 모양이다 —
 * **판정은 식별자로 하고 사람 말은 이 파일이 `t()` 로 낸다.**
 */
export type 보임 = 'draft' | 'queued' | 'running' | 'stalled' | 'done' | 'failed' | 'stopped';

/**
 * 이만큼 단계가 안 바뀌면 **응답 없음**으로 본다.
 *
 * 명세가 `stage_at` 을 만든 이유가 이것이다 — 「아직 그 단계를 도는 중」과
 * 「거기서 맥이 죽은 것」은 **한 칸으로는 구분되지 않는다** (공통/4-데이터모델 §6).
 * 이 판정이 없으면 맥이 죽어도 화면은 **영원히 「도는 중」**이라고 말한다.
 *
 * **숫자는 시작값이다.** 한 요청이 10~20분 걸리고 그 사이 단계가 여러 번 바뀐다.
 * 가장 긴 한 단계는 관문 3(연속 3회 실행)이나 팬아웃 한 차례다. 서브에이전트 줄도 마지막 소식을 새로 해 30분이면 살아 있는 맥이 걸릴 일이 없다.
 * 멀쩡한 것이 자꾸 응답 없음으로 보이거나 반대로 한참 못 알아채면 고친다.
 */
export const 멈춘듯기준 = 30 * 60 * 1000;

/**
 * 「지금 이 줄이 어떤 상태로 보이나」.
 *
 * **잰 시각이 없으면 멈췄다고 단정하지 않는다.** 모르는 것을 아는 척하면 그게 다음 거짓말이다.
 *
 * **다만 그 가지는 지금 도달할 수 없다** (2026-09-23 검토가 잡았다) —
 * 서버의 집기가 `status = 'RUNNING'` 과 `started_at = now()` 를 **한 UPDATE 로 같이** 적어서
 * 「`RUNNING` 인데 시작 시각이 없는 행」은 만들어질 수 없다. 방어로 남기되
 * **없는 이유를 적어 두지 않는다** — 틀린 이유가 적힌 방어는 다음 세션이 그걸 근거로
 * 다른 곳에도 같은 가지를 판다.
 */
export function 줄보임(행: AuthoringRow, 지금: number): 보임 {
  if (행.status === 'DONE') return 'done';
  if (행.status === 'FAILED') return 'failed';
  if (행.status === 'STOPPED') return 'stopped';
  if (행.status === 'PENDING') return 'queued';
  if (행.status === 'DRAFT') return 'draft';

  const 마지막 = 행.stageAt ?? 행.startedAt;
  if (마지막 === null) return 'running';
  return 지금 - new Date(마지막).getTime() > 멈춘듯기준 ? 'stalled' : 'running';
}

/**
 * 끝난 것은 더 안 바뀐다. 계속 물으면 탭 하나가 2초마다 서버를 두드린다.
 * 준비 중(DRAFT)도 스스로 안 바뀐다 — 중간에 실패한 것은 버려진 채 남는다 (도메인/작성 §7 「자료」).
 * 중단(STOPPED)도 끝이다. 멈춤을 요청만 한 것은 아직 RUNNING 이라 계속 묻는다 — 멈췄는지 알아야 한다.
 * 상세 페이지와 시작 모달이 같이 쓴다
 */
export function 끝났나(status: AuthoringRow['status']): boolean {
  return status === 'DONE' || status === 'FAILED' || status === 'DRAFT' || status === 'STOPPED';
}

/** 종류를 사람 말로. 화면은 `AUTHOR` 같은 글자를 보여 주지 않는다 */
export function 종류라벨(kind: AuthoringRow['kind'], 언어: 언어): string {
  if (kind === 'MERGE') return t('머지', 언어);
  if (kind === 'RERUN') return t('재실행', 언어);
  if (kind === 'EDIT') return t('케이스 고치기', 언어);
  return t('작성', 언어);
}

/**
 * 케이스 고치기 실행인가 — 고치기와 그 다시 적용 행만 `params.edits` 를 가진다. 머지 행에는 없다.
 * 판정은 서버 `authoring/edit.ts` 의 것을 그대로 쓴다 — 자리마다 kind 로 따로 가르면 다시 적용 행을 빠뜨린다
 */
export function 고치기실행인가(행: Pick<AuthoringRow, 'params'>): boolean {
  return 서버판정({ params: 행.params });
}

/** 상태 칩 · 목록 줄 끝의 글자. 머지 · 고치기가 도는 것을 「작성 중」이라 하면 거짓말이다 */
export function 칩글(행: AuthoringRow, 보: 보임, 언어: 언어): string {
  if (보 === 'running' && 행.kind === 'MERGE') return t('반영 중', 언어);
  if (보 === 'running' && 고치기실행인가(행)) return t('고치는 중', 언어);
  return 보임라벨(보, 언어);
}

/** 보임을 사람 말로 (`runState.ts` 의 `상태라벨` 과 같은 모양) */
export function 보임라벨(보: 보임, 언어: 언어): string {
  // 「대기」와 가른다. 대기는 기다리면 맥이 집지만, 준비 중은 자료를 다 못 올린 채 멈췄으면 영영 안 집힌다
  if (보 === 'draft') return t('자료 올리는 중', 언어);
  if (보 === 'queued') return t('대기 중', 언어);
  if (보 === 'running') return t('작성 중', 언어);
  // **서버가 주는 상태가 아니다.** 신호가 오래 끊긴 것을 화면이 판정했다 — 까닭은 모르니 끊긴 사실만 말한다
  // (2026-09-28 「멈춘 듯」에서 바꿨다. 「듯」이 무엇을 하라는 건지 안 읽혔다)
  if (보 === 'stalled') return t('응답 없음', 언어);
  if (보 === 'done') return t('완료', 언어);
  // 실행 중단과 같은 말을 쓴다 — 같은 뜻을 두 낱말로 부르면 다른 것인 줄 안다
  if (보 === 'stopped') return t('중단', 언어);
  return t('실패', 언어);
}

/** 중단 이유를 사람 말로 (도메인/작성 §7). 모르는 값은 「기록 없음」 — 식별자를 화면에 흘리지 않는다 */
export function 중단이유라벨(reason: string | null | undefined, 언어: 언어): string {
  if (reason === 'USER') return t('사용자가 멈춤', 언어);
  // 제한 시간 숫자를 박지 않는다 — 에이전트 설정이 바뀌면 글이 거짓말을 한다(분모는 progress.limitSec 이 준다)
  if (reason === 'TIMEOUT') return t('시간초과', 언어);
  if (reason === 'LIMIT') return t('구독 한도', 언어);
  if (reason === 'AGENT_RESTART') return t('에이전트 재시작', 언어);
  if (reason === 'AGENT_LOST') return t('에이전트 응답 없음', 언어);
  // 이어서 작성할 수 있어 중단이다 — 실패는 자식을 띄우기 전 문제만 (작성 §7 「이어하기」, 2026-09-28)
  if (reason === 'CRASH') return t('작성 중 끊김', 언어);
  if (reason === 'REJECTED') return t('올리기 거절', 언어);
  return t('기록 없음', 언어);
}

/** 차이 한 줄 (도메인/작성 §7 `finish` 의 `result.diffs[]`). 화면이 읽을 칸만 글자로 좁힌다 */
export interface 차이 {
  no: string;
  kind: string;
  where: string | null;
  doc: string | null;
  screen: string | null;
  tcId: string | null;
  marked: boolean;
  markError: string | null;
}

function 글자(값: unknown): string | null {
  if (typeof 값 === 'string') return 값;
  if (typeof 값 === 'number') return String(값);
  return null;
}

/**
 * 결과에서 차이 목록을 꺼낸다. **서버가 모양을 검사하지 않는다**(2026-09-26 게이트 1) — 여기가 방어한다.
 * 배열이 아니면 null(표를 안 그린다), 객체가 아닌 줄은 버리고 없는 칸은 null 로 둔다
 */
export function 차이목록(result: unknown): 차이[] | null {
  if (typeof result !== 'object' || result === null) return null;
  const diffs = (result as { diffs?: unknown }).diffs;
  if (!Array.isArray(diffs)) return null;
  return diffs
    .filter((d): d is Record<string, unknown> => typeof d === 'object' && d !== null && !Array.isArray(d))
    .map((d) => ({
      no: 글자(d.no) ?? '',
      kind: 글자(d.kind) ?? '',
      where: 글자(d.where),
      doc: 글자(d.doc),
      screen: 글자(d.screen),
      tcId: 글자(d.tcId),
      marked: d.marked === true,
      markError: 글자(d.markError),
    }));
}

/** 차이 종류를 사람 말로. 모르는 값은 「알 수 없는 종류」 — 식별자를 화면에 흘리지 않는다 */
export function 차이종류라벨(kind: string, 언어: 언어): string {
  if (kind === 'DIFFERENT') return t('기획서와 다름', 언어);
  if (kind === 'SCREEN_ONLY') return t('화면에만 있음', 언어);
  if (kind === 'DOC_ONLY') return t('문서에만 있음', 언어);
  return t('알 수 없는 종류', 언어);
}

/** 고칠 내용 한 줄 (도메인/작성 §3.6 「★ 케이스 고치기」). 옛 값은 요청에 없다 — PR 본문이 옛 값 → 새 값을 적는다 */
export interface 고칠줄 {
  tcId: string;
  삭제: boolean;
  /** [칸 이름, 새 값] — 글자로 바꾸는 것은 그리는 쪽이다(참거짓을 예 · 아니오로) */
  기대값: [string, 기대값][];
  확정: boolean;
}

/** 행의 params 에서 고칠 내용을 꺼낸다. 모양을 믿지 않는다 — 배열이 아니면 null, tcId 없는 줄은 버린다 */
export function 고칠것목록(params: unknown): 고칠줄[] | null {
  const edits = 행의고칠것(params);
  if (edits === null) return null;
  return edits
    .filter((e): e is Record<string, unknown> => typeof e === 'object' && e !== null && !Array.isArray(e))
    .filter((e) => typeof e.tcId === 'string')
    .map((e) => {
      const 기대 = typeof e.expected === 'object' && e.expected !== null && !Array.isArray(e.expected) ? e.expected : {};
      return {
        tcId: e.tcId as string,
        삭제: e.delete === true,
        // 서버가 다섯 꼴만 받지만 모양을 믿지 않는다 — 그 밖의 값은 글자로 펴서 보인다
        기대값: Object.entries(기대).map(([칸, 값]): [string, 기대값] => [
          칸,
          typeof 값 === 'string' || typeof 값 === 'number' || typeof 값 === 'boolean' ? 값 : JSON.stringify(값),
        ]),
        확정: e.confirm === true,
      };
    });
}

// 반영 요청 — 기준 판과 지금 판을 견줘 다시 쓸 요구 · 종류와 지울 케이스를 정한다. 자식은 이것만 맡는다
// (도메인/작성 §3.6 「사람이 고칠 때」 「고친 요구만 다시 작성」). 판단은 여기 순수 함수, 사본 쓰기는 authoring-ledger-io

import { basename, join } from 'node:path';

import type { PrdItem } from '@platform/kit/types';

import { type 지도줄, 지도줄들 } from '../apps/admin/src/catalog/reqMap.js';
import { 반영안됨 } from '../apps/admin/src/prd/rules.js';
import { type 설계, 설계하기 } from './authoring-design.js';
import { 경고줄 } from './authoring-design-check.js';
import { 케이스파일들 } from './authoring-progress.js';

/** 자식에게 주는 반영 계획 사본 — 자료 폴더 안. 지울 케이스 확인은 에이전트 메모리의 계획으로 한다 */
export const 반영사본이름 = 'apply.json';

type 축 = 지도줄['axis'];
const 네종류: 축[] = ['정상', '경계', '예외', 'UI'];

export interface 다시쓸요구 {
  번호: string;
  /** 기준 판에 없던 번호면 null — 표가 이미 덮고 있어 새로 만들지 않고 고쳐 쓴다 */
  옛문장: string | null;
  새문장: string;
  다시쓸종류: 축[];
  /** 지도 ① — 기준(main) 표가 이 번호로 덮던 케이스 */
  케이스: { tcId: string; 축: 축 }[];
}

export interface 반영계획 {
  /** 「반영 안 됨」의 기준 판. 없으면 전부 반영 안 됨이다 */
  기준판: number | null;
  지금판: number;
  다시씀: 다시쓸요구[];
  /** 덮는 케이스가 없는 새 항목 */
  새항목: string[];
  지움: { 번호: string; 지울케이스: string[]; 남길케이스: string[] }[];
}

export interface 반영입력 {
  계획: 반영계획;
  사본: string;
}

/** 반영 요청인가 — 서버가 반영 통로로만 세운 행이고 재실행 · 이어서 작성은 원본에서 물려받는다 (작성 §7 「표준 기획서 통로」) */
export function 반영요청인가(것: { params?: unknown }): boolean {
  return (것.params as { prdApply?: unknown } | undefined)?.prdApply === true;
}

const 경계값 = (s: 설계) => s.경계.flatMap((g) => g.값).sort().join('|');
const 예외기법 = (s: 설계) => s.예외.map((x) => x.기법).sort().join('|');

/**
 * 문장이 바뀐 요구에서 다시 쓸 종류. 정상 · UI 는 문장 자체가 설계라 늘 다시 쓴다.
 * 경계 · 예외는 설계 미리보기(경계 값 · 예외 기법)가 달라졌을 때만 — 글만 다듬은 요구에 경계 · 예외 케이스를 다시 만들지 않는다(토큰)
 */
export function 바뀐종류(옛문장: string, 새문장: string): 축[] {
  const 옛 = 설계하기(옛문장);
  const 새 = 설계하기(새문장);
  return 네종류.filter((k) => (k === '경계' ? 경계값(옛) !== 경계값(새) : k === '예외' ? 예외기법(옛) !== 예외기법(새) : true));
}

/**
 * 반영 계획. 바뀐 · 새 · 지운 번호는 화면의 「반영 안 됨」과 같은 함수로 센다(서버 rules 의 `반영안됨`).
 * 덮던 케이스는 지도 ① 과 같은 함수로 기준(main) 표에서 읽는다 — DB 지도는 병합 뒤 스캔이 채운 사본이라 같은 표다.
 * 지운 번호의 케이스는 지운 번호만 덮던 것만 지운다 — 다른 요구도 덮으면 남기고 그 요구 줄만 뺀다
 */
export function 반영계획만들기(
  지금: { version: number; items: readonly PrdItem[] },
  기준: { version: number; items: readonly PrdItem[] } | null,
  표글: string,
  접두사: string,
): 반영계획 {
  const 차이 = 반영안됨(기준 === null ? null : [...기준.items], [...지금.items]);
  const 지도 = 지도줄들(표글, 접두사);
  const 덮던 = (번호: string) => 지도.filter((j) => j.reqId === 번호).map((j) => ({ tcId: j.tcId, 축: j.axis }));
  const 옛글 = new Map((기준?.items ?? []).map((x) => [x.reqId, x.text]));
  const 새글 = new Map(지금.items.map((x) => [x.reqId, x.text]));
  const 다시씀 = [...차이.changed, ...차이.added].flatMap((번호): 다시쓸요구[] => {
    const 케이스 = 덮던(번호);
    const 옛문장 = 옛글.get(번호) ?? null;
    if (옛문장 === null && 케이스.length === 0) return [];
    const 새문장 = 새글.get(번호) ?? '';
    return [{ 번호, 옛문장, 새문장, 다시쓸종류: 옛문장 === null ? 네종류 : 바뀐종류(옛문장, 새문장), 케이스 }];
  });
  const 지운 = new Set(차이.removed);
  const 남나 = (tcId: string) => 지도.some((j) => j.tcId === tcId && !지운.has(j.reqId));
  return {
    기준판: 기준?.version ?? null,
    지금판: 지금.version,
    다시씀,
    새항목: 차이.added.filter((번호) => 덮던(번호).length === 0),
    지움: 차이.removed.map((번호) => {
      const 케이스 = [...new Set(덮던(번호).map((c) => c.tcId))];
      return { 번호, 지울케이스: 케이스.filter((t) => !남나(t)), 남길케이스: 케이스.filter(남나) };
    }),
  };
}

/** 자식을 띄우지 않고 FAILED 로 끝낼 까닭. 앞 반영이 이미 넣었거나 같은 판을 다시 돌린 것이다 */
export function 반영막힘(계획: 반영계획): string | null {
  return 계획.다시씀.length + 계획.새항목.length + 계획.지움.length === 0
    ? '반영할 것이 없다 — 지금 판의 요구가 이미 테스트에 들어갔다. 이 요청은 폐기해도 된다'
    : null;
}

/** 줄 프롬프트의 반영 절. 무엇을 어떻게 하는지는 자식 스킬 참고 파일이 정본이다 */
export function 반영절(입력: 반영입력): string[] {
  const { 계획 } = 입력;
  return [
    '',
    '--- 반영 ---',
    `이 요청은 「PRD 관리」에서 고친 요구만 테스트에 반영한다 — 다시 씀 ${String(계획.다시씀.length)} · 새 항목 ${String(계획.새항목.length)} · 지움 ${String(계획.지움.length)}. 자료(기획서)는 없다.`,
    `맡을 번호 · 덮던 케이스 · 다시 쓸 종류 · 지울 케이스: ${입력.사본}`,
    '`.claude/skills/tpx-author/references/apply.md` 를 먼저 읽고 따라라. 맡은 번호가 아닌 표 줄과 케이스는 손대지 마라.',
  ];
}

/** PR 본문 머리 줄 — 판 견줌과, 자식이 끝낸 뒤에도 남은 지울 케이스 파일. 지우지 않고 보이기만 한다(사람이 병합 전에 본다) */
export function 반영뒤줄(계획: 반영계획, 트리: string, 폴더: string): string[] {
  const 앞 = 계획.기준판 === null ? '기준 판 없음' : `판 ${String(계획.기준판)}`;
  const 머리 = `표준 기획서 반영: ${앞} → ${계획.기준판 === null ? '판 ' : ''}${String(계획.지금판)} · 다시 씀 ${String(계획.다시씀.length)} · 새 항목 ${String(계획.새항목.length)} · 지움 ${String(계획.지움.length)}`;
  try {
    const 있는 = new Set([...케이스파일들(join(트리, 'tests', 폴더))].map((p) => basename(p, '.spec.ts')));
    return [머리, ...경고줄('지운 요구만 덮던 케이스가 남음', 계획.지움.flatMap((x) => x.지울케이스).filter((t) => 있는.has(t)), 10)];
  } catch (e) {
    // 보이기만 하는 줄이다 — 자식 트리를 못 읽었다고 다 된 올리기를 거절로 만들지 않는다(옛표줄들과 같다)
    return [머리, `⚠️ 지울 케이스가 남았는지 못 봤다 — ${e instanceof Error ? e.message : String(e)}`];
  }
}

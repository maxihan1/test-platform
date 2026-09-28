// 멈춘 작성의 작업 폴더 보관 — 보관 표시 · 훑기 판정 · 이어받을 폴더 · 넘겨받기/잠그기 명령 (SPEC 도메인/작성 §7 「이어하기」)
// 여기는 순수 함수만. 폴더를 옮기고 지우는 I/O 는 authoring-run · authoring-child 에 있다

import type { 명령 } from './authoring-chain.js';
import type { 계정, 사본 } from './authoring-copy.js';

/** 사본 뿌리에 두는 보관 표시. 사본을 만들 때 쓴다 — 꺼지며 끊긴 건도 이것으로 서비스와 기준을 안다 */
export const 보관이름 = '보관.json';

export interface 보관 {
  /** 켤 때 서버에 물을 서비스 접두사 — 폴더 이름에는 번호뿐이다 */
  서비스: string;
  /** 올리기가 커밋하는 기준 main SHA. 이어받은 실행도 같은 기준 위에 올린다 */
  기준: string;
  /** 처음 사본에 있던 케이스 파일 — 「테스트 N개」를 이어받아도 누적으로 센다 */
  옛케이스: string[];
  /** 자식을 거두고 잠갔다. 거짓이면 아직 도는 중이거나 꺼지며 끊긴 것이다 */
  끝: boolean;
}

export function 보관글(값: 보관): string {
  return `${JSON.stringify(값)}\n`;
}

/** 모양이 틀리면 null — 그 폴더는 누구 것인지 몰라 지운다 */
export function 보관읽기(글: string): 보관 | null {
  let 값: unknown;
  try {
    값 = JSON.parse(글);
  } catch {
    return null;
  }
  if (typeof 값 !== 'object' || 값 === null || Array.isArray(값)) return null;
  const { 서비스, 기준, 옛케이스, 끝 } = 값 as Record<string, unknown>;
  // 서비스는 주소에 끼워 서버에 묻는다 — 접두사 모양만 받는다
  if (typeof 서비스 !== 'string' || !/^[A-Z][A-Z0-9]{0,11}$/.test(서비스)) return null;
  if (typeof 기준 !== 'string' || !/^[0-9a-f]{40}$/.test(기준)) return null;
  if (!Array.isArray(옛케이스) || !옛케이스.every((p) => typeof p === 'string')) return null;
  if (typeof 끝 !== 'boolean') return null;
  return { 서비스, 기준, 옛케이스: 옛케이스 as string[], 끝 };
}

/** 서버 상세의 답. 못 물었으면 UNKNOWN — 모르는 채 지우지 않는다 */
export type 서버답 = { keepWorkspace?: unknown } | 'NOT_FOUND' | 'UNKNOWN';

/**
 * 남은 폴더 하나를 어떻게 하나. 남길지는 **서버가 정한다**(보관일은 서버 한 곳에만 있다).
 * 잠근다 = 남기되 아직 보관 끝이 아니다 — 꺼지며 끊겨 finally 가 안 돈 건이다
 */
export function 훑기판정(
  번호: number,
  표시: 보관 | null,
  도는번호: ReadonlySet<number>,
  답: 서버답,
): '둔다' | '지운다' | '잠근다' {
  if (도는번호.has(번호)) return '둔다';
  if (표시 === null) return '지운다';
  if (답 === 'UNKNOWN') return '둔다';
  if (답 === 'NOT_FOUND' || 답.keepWorkspace !== true) return '지운다';
  return 표시.끝 ? '둔다' : '잠근다';
}

/** 이어받은 사슬(가까운 것부터)에서 처음 찾은, 보관이 끝난 폴더의 번호 */
export function 이어받을폴더(사슬: number[], 폴더들: ReadonlyMap<number, 보관 | null>): number | null {
  return 사슬.find((번호) => 폴더들.get(번호)?.끝 === true) ?? null;
}

const 자식폴더 = (자리: 사본) => [자리.트리, 자리.집, 자리.자료, 자리.gh, 자리.임시];

const 소유바꾸기 = (자리: 사본, 누구: string): 명령[] =>
  자식폴더(자리).map((폴더) => ({ 명령: 'chown', 인자: ['-hR', 누구, 폴더] }));

/**
 * 옮겨 온 폴더를 새 실행에 넘긴다. 앞 실행이 올리다 멈췄으면 커밋이 남아 있어 그대로면 반드시 다시 거절된다 —
 * 기준으로 되감되 파일은 둔다(`--hard` 아님). 그다음 새 자리 uid 로 넘긴다
 */
export function 넘겨받기명령(자리: 사본, 기준: string, 자식: 계정 | null): 명령[] {
  return [
    {
      명령: 'git',
      인자: [`--git-dir=${자리.git}`, `--work-tree=${자리.트리}`, '-c', 'core.hooksPath=/dev/null', 'reset', '-q', 기준],
    },
    ...(자식 === null ? [] : 소유바꾸기(자리, `${자식.uid}:${자식.gid}`)),
  ];
}

/** 보관하는 동안 root 만 읽게 잠근다 — 자리 uid 는 자리 번호에 고정이라 같은 자리의 다음 건(다른 서비스)이 읽는다 */
export function 잠그기명령(자리: 사본, 자식: 계정 | null): 명령[] {
  return 자식 === null ? [] : 소유바꾸기(자리, '0:0');
}

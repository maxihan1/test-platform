// 끝내기 result.cases — 이 실행이 새로 만들거나 바꾼 케이스를 PR 브랜치의 파일에서 계산해 싣는다. 자식의 말이 아니라 코드를 본다 (도메인/작성 §7 finish)
// 서버의 상한과 모양 검사를 그대로 가져다 먼저 돌린다 — 목록 하나가 틀려 끝내기가 400 이 되면 에이전트가 목록만 빼고 다시 보내야 한다

import { 지도줄들 } from '../apps/admin/src/catalog/reqMap.js';
import { 확인문장들 } from '../apps/admin/src/catalog/steps.js';
import {
  type 만든케이스,
  요구번호상한,
  요구수상한,
  케이스건수상한,
  케이스글상한,
  케이스모양검사,
  확인문장수상한,
} from '../apps/admin/src/authoring/cases.js';
import type { 보고손 } from './authoring-io.js';
import { 글자자르기 } from './authoring-usage.js';

type 바뀜 = Map<string, 'NEW' | 'CHANGED'>;

/** 기준 대비 바뀐 파일의 상태 — 지운 파일은 싣지 않으니 -z 로 NUL 구분 상태/경로 쌍을 읽는다 */
export function 변경상태인자(기준: string): string[] {
  return ['--no-replace-objects', '-c', 'core.quotePath=false', 'diff', '--name-status', '--no-renames', '-z', `${기준}...HEAD`];
}

/** `git diff --name-status -z` 출력 → 경로별 NEW(추가) · CHANGED(수정). 삭제 · 그 밖은 뺀다 */
export function 바뀜풀기(낸것: string): 바뀜 {
  const 조각 = 낸것.split('\0');
  const 결과: 바뀜 = new Map();
  for (let i = 0; i + 1 < 조각.length; i += 2) {
    const 상태 = 조각[i]!;
    const 경로 = 조각[i + 1]!;
    if (상태 === 'A') 결과.set(경로, 'NEW');
    else if (상태 === 'M') 결과.set(경로, 'CHANGED');
  }
  return 결과;
}

/** 케이스를 만드는 데 필요한 재료 — 올리기가 커밋한 뒤에 선다. 그 전에 끝나면 없다(null) */
export interface 케이스재료 {
  바뀜: 바뀜;
  /** 요구사항 표(docs/cases/<접두사>.md)의 글. 표가 없으면 빈 글 */
  표글: string;
  접두사: string;
  읽기(파일: string): string;
}

const 물건인가 = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * 스캐너 명세들 가운데 이번 PR 이 더하거나 고친 파일의 것만 서버 모양으로 만든다.
 * 서버가 거절할 줄(tcId 틀림 · 같은 tcId · file 이 상한 초과)은 빼고 나머지를 싣는다 — 한 줄 때문에 목록 전체를 잃지 않게
 */
export function 케이스목록만들기(명세들: unknown[], 재료: 케이스재료): 만든케이스[] {
  const 요구들 = new Map<string, Set<string>>();
  for (const 줄 of 지도줄들(재료.표글, 재료.접두사)) {
    const 모음 = 요구들.get(줄.tcId) ?? new Set<string>();
    모음.add(줄.reqId);
    요구들.set(줄.tcId, 모음);
  }
  const 목록: 만든케이스[] = [];
  const 본것 = new Set<string>();
  for (const s of 명세들) {
    if (!물건인가(s) || typeof s.tcId !== 'string' || typeof s.filePath !== 'string') continue;
    const file = `tests/${s.filePath}`;
    const change = 재료.바뀜.get(file);
    if (change === undefined || 본것.has(s.tcId)) continue;
    const name = typeof s.name === 'string' ? 글자자르기(s.name, 케이스글상한) : '';
    const 케이스: 만든케이스 = {
      tcId: s.tcId,
      name,
      file,
      change,
      verifies: 확인문장들(재료.읽기(file))
        .map((문장) => 글자자르기(문장, 케이스글상한))
        .filter((문장) => 문장 !== '')
        .slice(0, 확인문장수상한),
      reqs: [...(요구들.get(s.tcId) ?? [])].filter((번호) => 번호.length <= 요구번호상한).slice(0, 요구수상한),
    };
    if (케이스모양검사([케이스]) === null) continue;
    본것.add(s.tcId);
    목록.push(케이스);
  }
  return 목록.slice(0, 케이스건수상한);
}

/**
 * DONE 끝내기 몸에 만든 케이스를 싣는다. 못 읽었거나 하나도 없으면 싣지 않는다 — PR 은 이미 섰으니 끝내기를 막지 않는다.
 * 못 읽은 까닭은 삼키지 않고 로그에 남긴다
 */
export function 케이스실은몸(몸: Record<string, unknown>, 명세들: unknown[] | null, 재료: 케이스재료 | null): Record<string, unknown> {
  if (명세들 === null || 재료 === null) {
    console.error('[작성] 만든 케이스를 못 읽어 싣지 않는다 — 케이스 스캔이나 바뀐 파일 목록이 없다');
    return 몸;
  }
  let 목록: 만든케이스[];
  try {
    목록 = 케이스목록만들기(명세들, 재료);
  } catch (e) {
    console.error(`[작성] 만든 케이스를 못 만들어 싣지 않는다: ${e instanceof Error ? e.message : String(e)}`);
    return 몸;
  }
  const 결과 = 물건인가(몸.result) ? 몸.result : {};
  return { ...몸, result: { ...결과, cases: 목록 } };
}

/** 끝낼 때의 재료를 읽어 싣는 손. 보류를 싣는 손 **안쪽**에 둔다 — 그 손이 읽은 스캔을 받아 쓴다 */
export function 케이스싣는손(손: 보고손, 재료: () => { 명세들: unknown[] | null; 재료: 케이스재료 | null }): 보고손 {
  return {
    ...손,
    끝내기: (몸) => {
      if (몸.status !== 'DONE') return 손.끝내기(몸);
      const { 명세들, 재료: 값 } = 재료();
      return 손.끝내기(케이스실은몸(몸, 명세들, 값));
    },
  };
}

// 표준 기획서 전에 만든 옛 요구사항 표(출처가 원본 번호뿐인 줄)를 세는 읽기 — authoring-ledger-io 에서 뗐다 (파일 300줄 규칙)

import { lstatSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';

import { TCID } from '../apps/admin/src/catalog/rules.js';
import { 경고줄 } from './authoring-design-check.js';
import { 번호찾기 } from './authoring-ledger.js';
import { 요구줄들 } from './authoring-ledger-check.js';
import { 케이스파일들 } from './authoring-progress.js';
import { type 표줄, 줄상태 } from './authoring-slots.js';

/** 링크 · 특수 파일은 안 읽는다 — 자료 폴더는 자식 uid 것이고 이어받은 폴더는 앞 자식이 만졌다. 못 읽으면 null */
export function 안전히읽기(경로: string): string | null {
  const 정보 = lstatSync(경로, { throwIfNoEntry: false });
  return 정보?.isFile() === true ? readFileSync(경로, 'utf8') : null;
}

/**
 * 출처가 원본 번호뿐인 요구 줄 — 표준 기획서 전에 만든 표(옛 표)의 줄이다. 번호 없는 줄은 모른다 (§3.6 「★ 표준 기획서」 「기존 서비스」).
 * 「제거함(…)」 줄은 지운 케이스의 기록이라 옛 줄로 안 센다 — 갈아쓸 때도 남는다
 */
export function 옛줄들(표글: string, 접두사: string): 표줄[] {
  const 새꼴 = new RegExp(`^${접두사}-(?:REQ|NEW)-\\d+$`);
  return 요구줄들(표글).filter((줄) => {
    if (줄.tcId.startsWith('제거함(')) return false;
    const 번호들 = 번호찾기(줄.출처).번호들;
    return 번호들.length > 0 && !번호들.some((n) => 새꼴.test(n));
  });
}

/**
 * 옛 표를 옮긴 요청의 PR 머리 줄 — 옛 케이스 번호 가운데 새 표가 물려받은 수 · 옛 미확정 케이스가 미확정 칸으로 물려받은 수 ·
 * 새 표에 남은 옛 출처 줄 · 새 표에 없는데 남은 옛 케이스 파일. 미확정 칸으로 못 받은 옛 미확정은 문서대로 확정된 것(기획서와 화면이 다름)이거나
 * 자식이 확인 필요를 빠뜨려 화면 값이 확정이 된 것이다 — 기계가 둘을 못 가르니 번호를 띄워 사람이 본다
 * 지우지 않고 보이기만 한다 — 자식이 표를 덜 쓰고 끝났을 때 에이전트가 케이스를 무더기로 지우지 않게. 기준 표에 옛 줄이 없으면 빈 목록이다
 */
export function 옛표줄들(트리: string, 서비스: string, 폴더: string, 기준표글: string): string[] {
  try {
    return 옛표셈(트리, 서비스, 폴더, 기준표글);
  } catch (e) {
    // 보이기만 하는 줄이다 — 서버에 판을 올린 뒤라 여기서 던지면 다 된 올리기가 거절이 된다
    return [`⚠️ 옛 표 셈을 못 했다 — ${e instanceof Error ? e.message : String(e)}`];
  }
}

function 옛표셈(트리: string, 서비스: string, 폴더: string, 기준표글: string): string[] {
  const 옛 = 옛줄들(기준표글, 서비스).filter((줄) => TCID.test(줄.tcId));
  const 옛번호 = new Set(옛.map((줄) => 줄.tcId));
  if (옛번호.size === 0) return [];
  const 옛미확정 = new Set(옛.filter((줄) => 줄상태(줄.출처) === '미확정').map((줄) => 줄.tcId));
  const 새표글 = 안전히읽기(join(트리, 'docs', 'cases', `${서비스}.md`)) ?? '';
  const 남은옛줄 = 옛줄들(새표글, 서비스);
  const 옛자리 = new Set(남은옛줄.map((줄) => 줄.차례));
  const 새줄 = 요구줄들(새표글).filter((줄) => !옛자리.has(줄.차례));
  const 새번호 = new Set(새줄.map((줄) => 줄.tcId));
  const 새미확정 = new Set(새줄.filter((줄) => 줄상태(줄.출처) === '미확정').map((줄) => 줄.tcId));
  const 미확정못받음 = [...옛미확정].filter((t) => !새미확정.has(t)).sort();
  const 파일번호 = new Set([...케이스파일들(join(트리, 'tests', 폴더))].map((p) => basename(p, '.spec.ts')));
  const 물려받음 = [...옛번호].filter((t) => 새번호.has(t)).length;
  return [
    `옛 표 옮김: 옛 케이스 ${String(옛번호.size)} 중 번호 물려받음 ${String(물려받음)} · 새 표에 없음 ${String(옛번호.size - 물려받음)}`,
    ...(옛미확정.size === 0 ? [] : [`옛 미확정 케이스 ${String(옛미확정.size)} 중 미확정 칸으로 물려받음 ${String(옛미확정.size - 미확정못받음.length)}`]),
    ...경고줄('미확정 칸으로 못 물려받은 옛 미확정 케이스(문서대로 확정됐거나 확인 필요가 빠졌다)', 미확정못받음, 10),
    ...경고줄('옛 출처(원본 번호) 줄이 남음', 남은옛줄.map((줄) => `요구 ${String(줄.차례 + 1)}`), 10),
    ...경고줄('새 표에 없는데 안 지운 옛 케이스 파일', [...옛번호].filter((t) => !새번호.has(t) && 파일번호.has(t)).sort(), 10),
  ];
}

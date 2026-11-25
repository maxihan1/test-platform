// 게임 규칙 보류 확인 — 케이스 목록의 「보류 — …」 줄이 이번 케이스 세션에 디바이스에서 해 본 판 기록을 대는지 본다 (도메인/게임 §3.10 「오브젝트 펼치기」 · tpx-author game.md §6)
// 지침만으로는 케이스 AI 가 PC 를 잡기 전에 보류 23줄을 적었다(2026-11-25 실측 · 2026-11-26 사용자 「지침이 새지 않도록 강제화」)
import { lstatSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { 게임자리 } from './authoring-game.js';
import { 백틱벗기기, 표읽기 } from './authoring-md-table.js';

/** 환경 때문인 보류와 판정 갈래 — 해 본 기록 없이도 된다(game.md §6 · §7 5). 까닭 머리로만 본다 — 「계정 레벨이 오르는 조건」 같은 게임 규칙이 빠지지 않게 */
const 환경보류 = /^(?:창을 못 엶|계정 미등록|계정이 없|어드민 API|게임 글과 잰 값이 다름|잠깐 떠서 못 찍음)/;
const 기록꼴 = /\d{17}-[^\s)·,]+?\.json/g;

/**
 * 이번 케이스 세션의 조작 기록 — 학습이 끝나며(건너뛰었어도) 적은 케이스 시작 표시 뒤에 남은 것. 가만히 지켜본 기록(`-지켜보기.json`)은 해 본 것이 아니다 —
 * 함수를 돌리며 지켜본 기록(`-지켜보기-<함수>.json`)은 판을 한 것이라 받는다(학습 시험의 「첫 판」 기록과 같은 기준). 표시가 없으면 자료 폴더의 기록을 다 받는다
 */
function 이번기록들(자료: string): Set<string> {
  const 표시 = lstatSync(join(자료, 게임자리.케이스시작), { throwIfNoEntry: false });
  const 뒤 = 표시?.isFile() === true ? 표시.mtimeMs : 0;
  const 폴더 = join(자료, 게임자리.조작기록);
  let 이름들: string[];
  try {
    이름들 = readdirSync(폴더);
  } catch {
    return new Set();
  }
  return new Set(
    이름들.filter((x) => /^\d{17}-.+\.json$/.test(x) && !/-지켜보기\.json$/.test(x)).filter((x) => {
      const 정보 = lstatSync(join(폴더, x), { throwIfNoEntry: false });
      return 정보?.isFile() === true && 정보.mtimeMs >= 뒤;
    }),
  );
}

/**
 * 해 본 기록을 안 댄 게임 규칙 보류 줄. 볼(이번에 바뀐 케이스의 tcId)을 주면 그 밖의 줄은 「해 본 것」을 이미 적은 줄만 넘어간다 —
 * 케이스 파일은 그대로 두고 목록 줄만 보류로 바꾼 것 · 이 검사 전에 적힌 보류도 본다
 */
export function 안해본보류(표글: string, 자료: string, 볼?: ReadonlySet<string>): string[] {
  const 이번 = 이번기록들(자료);
  return 표읽기(표글, '요구사항').flatMap((줄) => {
    const tcId = 백틱벗기기(줄['tcId'] ?? '');
    const 까닭 = /보류 — (.+)$/.exec(줄['출처'] ?? '')?.[1];
    if (까닭 === undefined || 환경보류.test(까닭) || (볼 !== undefined && !볼.has(tcId) && /해 본 것:/.test(까닭))) return [];
    // 디바이스를 한 번도 못 잡았으면(이번 기록 0) 그 까닭은 환경이다
    if (이번.size === 0 && /디바이스를 못 잡음/.test(까닭)) return [];
    if (/해 본 것:/.test(까닭) && [...까닭.matchAll(기록꼴)].some((m) => 이번.has(m[0]))) return [];
    return [`요구 ${줄['요구'] ?? '?'}(${tcId}) — 「${까닭}」 보류에 이번 케이스 세션의 판 기록이 없다. 디바이스에서 펼치고 해 본 뒤 「(해 본 것: <game-play 기록 이름>.json · 무엇을 몇 번)」을 붙이거나 보류를 풀고 케이스를 쓴다(tpx-author game.md §6)`];
  });
}

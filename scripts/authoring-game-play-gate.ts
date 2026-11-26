// 학습 세션의 다음 판 막기 — 앞 판에 새로 나온 것 가운데 아직 지도에 없는 이름이 있으면 조작 도우미가 함수를 안 부른다 (도메인/게임 §3.10 「조작 도우미」 「새로 나온 것」)
// 지침만으로는 AI 가 회고를 건너뛰고 다음 판으로 갔다(2026-11-26 사용자 「지침이 새지 않도록 강제화」). 지켜보기 · 10판 확인은 안 막는다 — 새것을 다시 보러 가는 길까지 막지 않게
import { lstatSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { 게임자리 } from './authoring-game.js';
import { type 나온것, 지도글, 지도에있나 } from './authoring-game-play-spawns.js';

/** 앞 판을 볼 기록 수 — 최근 것부터 이만큼에서 「새로 나온 것」을 센 기록을 찾는다 */
const 볼기록 = 20;

export interface 안적은것 { 기록: string; 이름들: string[]; 처음: string[] }

/**
 * 학습 세션이면 앞 판(새로 나온 것을 센 가장 새 기록)에서 아직 지도에 없는 이름 — 판 도중 새로 나온 것 · 장면 처음부터 있던 것. 학습 세션이 아니거나 없으면 null.
 * 학습만 — 거짓이면 학습 표시가 없어도 본다(세션이 끝난 뒤 에이전트가 끝 조건을 볼 때)
 */
export function 안적은새것(자료: string | undefined, 학습만 = true): 안적은것 | null {
  if (자료 === undefined || (학습만 && lstatSync(join(자료, 게임자리.배우는중), { throwIfNoEntry: false })?.isFile() !== true)) return null;
  const 폴더 = join(자료, 게임자리.조작기록);
  let 이름들: string[];
  try {
    이름들 = readdirSync(폴더).filter((x) => /^\d{17}-.+\.json$/.test(x)).sort().reverse().slice(0, 볼기록);
  } catch {
    return null;
  }
  for (const 이름 of 이름들) {
    let 나온: 나온것 | undefined;
    try {
      나온 = (JSON.parse(readFileSync(join(폴더, 이름), 'utf8')) as { 나온것?: 나온것 }).나온것;
    } catch {
      continue;
    }
    if (나온 === undefined) continue;
    const 지도 = 지도글(자료);
    const 안적은 = 나온.지도에없음.filter((k) => !지도에있나(지도, k));
    // 옛 기록에는 처음지도에없음이 없다
    const 처음 = (나온.처음지도에없음 ?? []).filter((k) => !지도에있나(지도, k));
    return 안적은.length + 처음.length === 0 ? null : { 기록: join(폴더, 이름.replace(/\.json$/, '')), 이름들: 안적은, 처음 };
  }
  return null;
}

/** 막을 때 찍는 글 */
export const 막는글 = (x: 안적은것): string =>
  [
    ...(x.이름들.length === 0 ? [] : [`[조작 도우미] 앞 판(${x.기록}.json)에 새로 나온 ${x.이름들.join(' · ')} 이(가) 지도에 없다 — ${x.기록}-새것.txt 의 펼친 글(없으면 지켜보기로 다시 보거나 다음에 보일 때 펼친다)을 보고 그 이름을 넣어 PROBE 나 ASK 줄로 적은 뒤 다시 부른다(회고 「새로 나온 것」 · 학습 세션만 막는다)`]),
    ...(x.처음.length === 0 ? [] : [`[조작 도우미] 앞 판(${x.기록}.json) 장면에 처음부터 있던 ${x.처음.join(' · ')} 이(가) 지도에 없다 — 하나씩 펼쳐(authoring-game-props) 무엇인지 보고 그 이름을 넣어 PROBE 나 ASK 줄로 적은 뒤 다시 부른다. 걷는 바닥 · 막는 것 · 놓는 자리 · 적 길 같은 맵 정보면 그 곳 STAGE 의 data.맵 에도 적는다(지침 「맵 파악」)`]),
  ].join('\n');

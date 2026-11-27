// 값 파일이 있는 종류가 지도에 값 줄로 적혔나 — 이름 글자만으로 막기를 통과하던 것을 값 칸 · 치트 표시로 바꾼다 (게임 정보 먼저 쌓기)
// 이름만 적고 지나갔다가 둘째 맵을 48판 하고도 못 깼다(16054). 값 파일 `game-props/<종류>.json` 이 있는 종류만 본다 — 뼈대 · 효과는 지금처럼 이름만 본다
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import type { 지도줄 } from './authoring-game-find.js';
import { 게임자리 } from './authoring-game.js';
import { 지도에있나 } from './authoring-game-play-spawns.js';
import { 안전히읽기 } from './authoring-screens-keep-io.js';

/** 막는 글에 이름을 적는 종류 수 — 나머지는 「외 N개」 */
const 찍을종류 = 10;
const 값파일상한 = 2_000_000;
/** 값 칸으로 안 치는 data 칸 — 어디서 왔나를 적은 것뿐이다 */
const 값아닌칸 = new Set(['출처', '장면']);
/** 값 줄이 될 수 없는 지도 종류 — 곳 · 계획 · 회고 · 물음 줄이 글에 종류 이름을 적었다고 값 줄이 되지 않게. PROBE 는 요구가 못 되는 종류라 값을 적어도 값 줄로 안 친다 */
const 값줄아닌종류 = new Set(['STAGE', 'TRIAL', 'PLAY', 'FAIL', 'ASK', 'ODD', 'KIND', 'SYSTEM', 'PROBE']);

/** 값칸없음 — 펼칠 때 게임 부품에 볼 칸이 하나도 없었다(Transform · 그림 부품뿐). 줄에 적을 게임 값이 없어서 값 줄을 요구하지 않는다. 칸이 비었을 뿐인 파일(아직 안 채워진 네트워크 값)은 아니다 — 첫 읽기가 정본이라 그 파일은 다시 안 덮인다 */
export interface 값파일읽음 { 종류: string; 장면: string | null; 치트: boolean; 값칸없음?: boolean }
type 줄 = Pick<지도줄, 'kind' | 'key' | 'name' | 'learned'>;

/** 자료 폴더의 값 파일 — 폴더가 없거나 못 읽은 파일은 건너뛴다 */
export function 값파일들(자료: string): 값파일읽음[] {
  let 이름들: string[];
  try {
    이름들 = readdirSync(join(자료, 게임자리.값파일)).filter((x) => x.endsWith('.json')).sort();
  } catch {
    return [];
  }
  return 이름들.flatMap((이름) => {
    try {
      const x = JSON.parse(안전히읽기(join(자료, 게임자리.값파일), 이름, 값파일상한) ?? 'null') as { 종류?: unknown; 장면?: unknown; 치트?: unknown; 칸없음?: unknown } | null;
      return typeof x?.종류 === 'string' && x.종류 !== '' ? [{ 종류: x.종류, 장면: typeof x.장면 === 'string' ? x.장면 : null, 치트: x.치트 === true, 값칸없음: x.칸없음 === true }] : [];
    } catch {
      return [];
    }
  });
}

const 값칸있나 = (data: unknown): boolean =>
  typeof data === 'object' && data !== null && !Array.isArray(data) && Object.entries(data).some(([k, v]) => !값아닌칸.has(k) && v !== undefined && v !== null && v !== '');

/**
 * 그 종류의 값 줄 — 키 · 이름 · 글에 종류 이름이 낱말로 든 줄 가운데 data 에 값 칸이 하나 이상인 것.
 * ponytail: 한 줄이 글에 여러 종류를 적으면 그 종류들을 다 덮는 것으로 친다 — 종류마다 한 줄은 지침이 정한다
 */
export function 값줄들(줄들: readonly 줄[], 종류: string): 줄[] {
  return 줄들.filter((x) => x.learned !== null && x.learned.belief !== 'OVERTURNED' && !값줄아닌종류.has(x.kind) && 값칸있나(x.learned.data) && 지도에있나(`${x.key} ${x.name} ${x.learned.text}`, 종류));
}

/** 값 파일 하나의 빠짐 — 값 칸이 없는 파일은 없음. 값 줄이 없나 · 치트 값인데 줄에 치트 표시가 없나 */
export function 빠짐(파일: 값파일읽음, 줄들: readonly 줄[]): '줄없음' | '치트없음' | null {
  if (파일.값칸없음 === true) return null;
  const 들 = 값줄들(줄들, 파일.종류);
  if (들.length === 0) return '줄없음';
  return 파일.치트 && !들.some((x) => x.learned!.marks?.includes('CHEAT') === true) ? '치트없음' : null;
}

export interface 값빠짐 { 줄없음: string[]; 치트없음: string[] }

/** 값 파일 가운데(장면을 주면 그 장면 것만) 지도에 값 줄이 모자란 종류. 하나도 없으면 null */
export function 값빠짐찾기(파일들: readonly 값파일읽음[], 줄들: readonly 줄[], 장면?: string): 값빠짐 | null {
  const 줄없음: string[] = [];
  const 치트없음: string[] = [];
  for (const 파일 of 파일들) {
    if (장면 !== undefined && 파일.장면 !== 장면) continue;
    const b = 빠짐(파일, 줄들);
    if (b === '줄없음') 줄없음.push(파일.종류);
    else if (b === '치트없음') 치트없음.push(파일.종류);
  }
  return 줄없음.length + 치트없음.length === 0 ? null : { 줄없음, 치트없음 };
}

/** 종류 이름 목록 — 처음 열 개 + 「외 N개」 */
export const 이름글 = (이름들: readonly string[]): string => `${이름들.slice(0, 찍을종류).join(' · ')}${이름들.length > 찍을종류 ? ` 외 ${이름들.length - 찍을종류}개` : ''}`;

/** 다음 판을 막을 때 찍는 글 */
export const 값막는글 = (x: 값빠짐): string =>
  [
    ...(x.줄없음.length === 0 ? [] : [`[조작 도우미] 값 파일(game-props/)이 있는데 지도에 값 줄이 없는 종류 ${x.줄없음.length}개 — ${이름글(x.줄없음)} · 값 파일을 읽고 종류마다 줄 하나(키나 이름에 종류 이름 · data 에 값 칸 · data.출처 「실행 중」)를 적은 뒤 다시 부른다. 이름만 적은 줄은 안 된다`]),
    ...(x.치트없음.length === 0 ? [] : [`[조작 도우미] 치트로 본 값인데 줄에 치트 표시(marks CHEAT)가 없는 종류 ${x.치트없음.length}개 — ${이름글(x.치트없음)} · 그 줄 learned.marks 에 CHEAT 를 넣어 다시 적은 뒤 다시 부른다`]),
  ].join('\n');

/** 곳(STAGE 줄)마다 정보 모으기가 안 끝난 것 — 그 곳 data.장면 에서 나온 종류에 값 줄이 모자란 곳. 장면이 같은 값 파일을 곳에 잇는다 */
export function 곳정보빠짐(줄들: readonly 줄[], 파일들: readonly 값파일읽음[]): { 곳: string; 빠짐: 값빠짐 }[] {
  return 줄들.flatMap((x) => {
    const 장면 = x.kind === 'STAGE' && x.learned !== null && x.learned.belief !== 'OVERTURNED' && typeof x.learned.data === 'object' && x.learned.data !== null ? (x.learned.data as { 장면?: unknown }).장면 : undefined;
    const b = typeof 장면 === 'string' ? 값빠짐찾기(파일들, 줄들, 장면) : null;
    return b === null ? [] : [{ 곳: x.key, 빠짐: b }];
  });
}

/** 게임플레이 끝 조건에 넣는 글 — 곳마다 값 줄이 모자란 종류 수 */
export function 곳정보남음(줄들: readonly 줄[], 자료: string): string[] {
  return 곳정보빠짐(줄들, 값파일들(자료)).map(({ 곳, 빠짐: b }) => `${곳} 의 정보가 안 끝났다 — 값 줄 없는 종류 ${b.줄없음.length}${b.치트없음.length === 0 ? '' : ` · 치트 표시 없는 종류 ${b.치트없음.length}`}(${이름글([...b.줄없음, ...b.치트없음])})`);
}

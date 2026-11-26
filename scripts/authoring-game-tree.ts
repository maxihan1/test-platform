// 게임을 배우는 물음 트리 — 열린 물음이 어느 줄에서 나왔나(`data.어디서`)를 이어 보여 준다 (도메인/게임 §3.10 「게임 배우기」 물음 트리 · 2026-11-25 사용자)
// 물음이 한 줄씩 따로 있으면 꼬리를 안 물어 첫 맵만 되풀이했다 — 해 보고 나온 것이 다음 물음이 되고, 안 건드린 가지가 눈에 보이게 한다
// 쓰는 법: npx tsx scripts/authoring-game-tree.ts <자료 폴더> [<지금 빌드>] — 폰 없이 파일만 읽는다
import { pathToFileURL } from 'node:url';

import { 믿음 } from '../apps/admin/src/prd/gameKinds.js';
import { type 지도읽기, type 지도줄, 정리알림, 지금지도 } from './authoring-game-find.js';

type 지도 = ReturnType<typeof 지도읽기>;

/**
 * 다음 AI 에게 남기는 쪽지 — 배운 것이 아니라 앞 AI 의 지금 생각이다(어디까지 왔나 · 다음에 해 볼 것).
 * 세션은 대화를 못 넘기는데 지도 줄만으로는 「그래서 지금 무엇을 하려던 참이었나」가 안 보여 새 AI 가 처음부터 다시 헤맸다(2026-11-25 GAME-F6-05 실측)
 */
export const 쪽지열쇠 = 'play:쪽지';

const 객체 = (v: unknown): Record<string, unknown> => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const 글인가 = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';
const 칸 = (x: 지도줄): Record<string, unknown> => 객체(x.learned?.data);
export const 빌드다른가 = (x: 지도줄, 빌드?: string): boolean => 빌드 !== undefined && x.learned?.build !== undefined && x.learned.build !== 빌드;
const 막혔나 = (x: 지도줄, 빌드?: string): boolean => 글인가(칸(x).막힘) && !빌드다른가(x, 빌드);

const 볼수있나 = (x: 지도줄, 오늘: string, 빌드?: string): boolean => {
  const 볼날 = 칸(x).볼날;
  return !막혔나(x, 빌드) && !(글인가(볼날) && 볼날 > 오늘);
};

/** 한국 날짜 — 「다음 날 볼 것」의 날과 견준다 */
export const 오늘글 = (지금: number): string => new Date(지금).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });

/**
 * 열린 물음 — 궁금한 것(`ASK`)과 게임 글로 읽기만 한 줄(`GAME_TEXT`).
 * 막힌 것은 빌드가 바뀌어야, 다음 날 볼 것은 그날이 되어야 다시 열린다. 물을 것이 아니라고 닫은 게임 글(`data.닫음`)은 안 센다
 */
export const 열린물음 = (지금: 지도, 오늘: string, 빌드?: string): 지도줄[] =>
  지금.줄들.filter((x) => {
    if (x.learned === null || x.learned.belief === 'OVERTURNED' || x.key === 'ask:없음' || x.key === 쪽지열쇠) return false;
    if (x.kind !== 'ASK' && (x.learned.belief !== 'GAME_TEXT' || 글인가(칸(x).닫음))) return false;
    return 볼수있나(x, 오늘, 빌드);
  });

/** 판에서 쓸 법(`data.쓸법`)을 적었는데 써 본 적(`data.써봄`)이 없는 줄 — 막힌 것은 안 센다(못 쓰는 줄 하나가 다음 작성마다 학습을 부른다) */
export const 안써봄들 = (지금: 지도, 오늘: string, 빌드?: string): 지도줄[] =>
  지금.줄들.filter((x) => x.learned !== null && x.learned.belief !== 'OVERTURNED' && x.key !== 쪽지열쇠 && 글인가(칸(x).쓸법) && !글인가(칸(x).써봄) && 볼수있나(x, 오늘, 빌드));

const 한줄 = (x: 지도줄, 열림: boolean): string =>
  `${열림 ? '? ' : ''}${x.key} · ${x.name}${x.kind === 'ASK' || x.learned?.belief === undefined ? '' : ` [${믿음[x.learned.belief]}]`}`;

const 홀로상한 = 12;

/** 열린 물음과 그것이 나온 줄들을 들여쓴 글로 — 어디에도 안 이어진 게임 글은 한 줄로 모은다(`다` 면 펼친다) */
export function 물음트리(지금: 지도, 오늘: string, 빌드?: string, 다 = false): string[] {
  const 있는 = new Map(지금.줄들.map((x) => [x.key, x]));
  const 어디서 = (x: 지도줄): 지도줄 | undefined => {
    const v = 칸(x).어디서;
    return 글인가(v) && v !== x.key ? 있는.get(v) : undefined;
  };
  const 열린 = new Set(열린물음(지금, 오늘, 빌드).map((x) => x.key));
  const 보일 = new Map<string, 지도줄>();
  for (const 열쇠 of 열린) for (let x = 있는.get(열쇠); x !== undefined && !보일.has(x.key); x = 어디서(x)) 보일.set(x.key, x);
  const 아이 = new Map<string, 지도줄[]>();
  const 뿌리: 지도줄[] = [];
  for (const x of 보일.values()) {
    const 위 = 어디서(x);
    if (위 === undefined) 뿌리.push(x);
    else 아이.set(위.key, [...(아이.get(위.key) ?? []), x]);
  }
  const 홀로글 = 다 ? [] : 뿌리.filter((x) => x.kind !== 'ASK' && 열린.has(x.key) && !아이.has(x.key));
  const 줄: string[] = [];
  const 그린 = new Set(홀로글.map((x) => x.key));
  const 그린다 = (x: 지도줄, 깊이: number): void => {
    if (그린.has(x.key)) return;
    그린.add(x.key);
    줄.push(`${'  '.repeat(깊이)}- ${한줄(x, 열린.has(x.key))}`);
    for (const y of 아이.get(x.key) ?? []) 그린다(y, 깊이 + 1);
  };
  // 서로를 가리키는 줄은 뿌리가 없다 — 빠뜨리지 않게 나머지도 그린다
  for (const x of [...뿌리, ...보일.values()]) 그린다(x, 0);
  if (홀로글.length === 0) return 줄;
  const 나머지 = 홀로글.length > 홀로상한 ? ` 외 ${홀로글.length - 홀로상한}개` : '';
  return [...줄, `- ? 게임 글로 읽기만 하고 안 해 본 것 ${홀로글.length}: ${홀로글.slice(0, 홀로상한).map((x) => x.key).join(' · ')}${나머지}`];
}

function main(): void {
  const [자료, 빌드] = process.argv.slice(2);
  const 지도 = 자료 === undefined ? null : 지금지도(자료);
  if (지도 === null) {
    console.error('쓰는 법: npx tsx scripts/authoring-game-tree.ts <자료 폴더> [<지금 빌드>] — 자료 폴더에 game-map.txt 가 있어야 한다');
    process.exit(2);
  }
  const 오늘 = 오늘글(Date.now());
  const 막힌 = 지도.줄들.filter((x) => x.learned !== null && x.learned.belief !== 'OVERTURNED' && 막혔나(x, 빌드));
  const 안써본 = 안써봄들(지도, 오늘, 빌드);
  console.log([
    `# 물음 트리 — 열린 물음 ${열린물음(지도, 오늘, 빌드).length}`,
    ...물음트리(지도, 오늘, 빌드, true),
    ...(막힌.length === 0 ? [] : [`# 막힌 것 ${막힌.length} — 길이 열렸으면 다시 해 본다`, ...막힌.map((x) => `- ${x.key} · ${String(칸(x).막힘)}`)]),
    ...(안써본.length === 0 ? [] : [`# 판에서 아직 안 써 본 것 ${안써본.length}`, ...안써본.map((x) => `- ${x.key} · ${String(칸(x).쓸법)}`)]),
    ...정리알림(자료!),
  ].join('\n'));
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) main();

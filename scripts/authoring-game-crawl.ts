// 게임 창 훑기 결과를 화면 기록 꼴로 바꾸고 저장본과 견준다 — 작성 AI 가 control-cli crawl 직후 부르고, 에이전트는 올릴 때 이 표시(game.json)로 같음을 거른다 (도메인/게임 §3.10 「창 훑기」)
// 쓰는 법: npx tsx scripts/authoring-game-crawl.ts <자료 폴더>/game-crawl/<이름> '<상태>' [<구역>] — 상태는 로그아웃 · 로그인:<역할>, 구역은 상태 도우미로 순간이동해 찍은 장소(GAME-F1-12b)
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { type 상태, 다시훑는날수, 날수, 상태인가 } from './authoring-screens-keep.js';
import { 안전히읽기 } from './authoring-screens-keep-io.js';

/** control-cli crawl 의 list.json 한 줄 (control_cli README 「창 훑기」 — WindowRecord) */
interface 훑은창 {
  주소: string;
  이름: string;
  틀: string;
  파일: string;
  지문: string;
  글자지문: string;
  연곳: { 창: string; 버튼: string; 글자: string } | null;
}

export interface 창 {
  /** 서버 url 칸 — `game:<장면>` · `game:<장면><창 경로>`(같은 이름 형제 순번을 뗀 틀). 같은 장면의 같은 틀은 같은 창이다 */
  키: string;
  이름: string;
  /** 크롤 폴더 안 기록 파일(`003.yml`) — AI 가 정리를 덧붙이고 에이전트가 올린다 */
  파일: string;
  지문: string;
  글자지문: string;
  /** 이 창에서 나간 연결 — 버튼을 눌러 뜬 창 */
  연결: { toUrl: string; via: string }[];
}

export type 저장한창 = { 상태: 상태; 키: string; 지문: string; 글자지문: string; 훑은날: string };
export type 견준창 = 창 & { 저장본: '같음' | '바뀜' | '새 창' };

const 지문꼴 = /^[0-9a-f]{1,64}$/;
const 파일꼴 = /^\d{3}\.yml$/;

/** 장소 이름 — 지도 열쇠 `zone:<구역>` 의 구역(도메인/게임 §3.10 「게임에만 있는 지도 넷」 열쇠) */
export const 구역꼴 = /^[\p{L}\p{N}_-]{1,64}$/u;

/**
 * list.json 을 창 목록으로 — 첫 줄(`scene:<장면>`)이 장면을 정한다. 꼴이 틀린 줄은 뺀다. 첫 줄이 장면이 아니면 빈 목록이다.
 * `구역` 을 주면 시작 화면이 장소 기록 `game:<장면>/zone:<구역>` 이 된다 — 순간이동한 자리의 NPC · 몬스터 · 바닥 아이템 (도메인/게임 §3.10 「지도」 screen_record)
 */
export function 창목록(list: unknown, 구역?: string): 창[] {
  const 줄들 = (Array.isArray(list) ? list : []).filter(
    (x): x is 훑은창 =>
      typeof x?.주소 === 'string' && typeof x.이름 === 'string' && typeof x.틀 === 'string' && 파일꼴.test(String(x.파일)) &&
      지문꼴.test(String(x.지문)) && 지문꼴.test(String(x.글자지문)),
  );
  const 장면 = /^scene:(.+)$/.exec(줄들[0]?.주소 ?? '')?.[1];
  if (장면 === undefined) return [];
  // 시작 화면의 주소는 `scene:` 이고 창 주소는 순번 붙은 경로다 — 연곳이 가리키는 것은 주소라 틀로 옮겨 키를 만든다
  const 키 = (x: 훑은창): string => (x.주소.startsWith('scene:') ? `game:${장면}${구역 === undefined ? '' : `/zone:${구역}`}` : `game:${장면}${x.틀}`);
  const 주소키 = new Map(줄들.map((x) => [x.주소, 키(x)]));
  const 창들: 창[] = 줄들.map((x) => ({ 키: 키(x), 이름: x.이름, 파일: x.파일, 지문: x.지문, 글자지문: x.글자지문, 연결: [] }));
  const 키창 = new Map(창들.map((c) => [c.키, c]));
  for (const x of 줄들) {
    const 앞 = x.연곳 === null ? undefined : 키창.get(주소키.get(x.연곳.창) ?? '');
    if (앞 === undefined || x.연곳 === null) continue;
    const via = `${x.연곳.버튼}${x.연곳.글자 === '' ? '' : ` 「${x.연곳.글자}」`}`.slice(0, 500);
    if (!앞.연결.some((l) => l.toUrl === 키(x) && l.via === via)) 앞.연결.push({ toUrl: 키(x), via });
  }
  return 창들;
}

/** 지문 둘 다 같고 30일 안이면 같음 — 저장 기록(AI 가 정리한 것)을 그대로 쓰고 다시 정리하지도 올리지도 않는다(웹 「바뀐 화면만 다시 훑는다」 그대로) */
export function 견주기(창들: 창[], 상태: 상태, 저장: 저장한창[], 오늘: string): 견준창[] {
  const 옛것 = new Map(저장.filter((x) => x.상태 === 상태).map((x) => [x.키, x]));
  return 창들.map((c) => {
    const 옛 = 옛것.get(c.키);
    if (옛 === undefined) return { ...c, 저장본: '새 창' };
    const 같음 = 옛.지문 === c.지문 && 옛.글자지문 === c.글자지문 && 날수(옛.훑은날, 오늘) <= 다시훑는날수;
    return { ...c, 저장본: 같음 ? '같음' : '바뀜' };
  });
}

/** list.json 글의 지문 — game.json 에 남겨, 견주기 뒤에 같은 폴더를 다시 훑었으면(crawl 은 game.json 을 안 지운다) 낡은 표시로 올리지 않게 한다 */
export const 목록지문 = (글: string): string => createHash('sha1').update(글).digest('hex').slice(0, 16);

/** 저장본 목록(`game-kept/index.json`) — 에이전트가 쓴 파일이지만 자식이 고칠 수 있어 모양을 본다 */
export function 저장목록(값: unknown): (저장한창 & { 기록: string })[] {
  return (Array.isArray(값) ? 값 : []).filter(
    (x): x is 저장한창 & { 기록: string } =>
      상태인가(x?.상태) && typeof x.키 === 'string' && typeof x.지문 === 'string' && typeof x.글자지문 === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(String(x.훑은날)) && /^\d+\.yml$/.test(String(x.기록)),
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [폴더, 상태값, 구역] = process.argv.slice(2);
  if (폴더 === undefined || !상태인가(상태값) || (구역 !== undefined && !구역꼴.test(구역))) {
    console.error("쓰는 법: npx tsx scripts/authoring-game-crawl.ts <자료 폴더>/game-crawl/<이름> '<로그아웃 | 로그인:<역할>>' [<구역 — 글자 · 숫자 · _ · ->]");
    process.exit(1);
  }
  const 목록글 = 안전히읽기(폴더, 'list.json', 2_000_000);
  if (목록글 === null) {
    console.error(`${폴더}/list.json 이 없다 — control-cli crawl --out ${폴더} 부터 돌린다`);
    process.exit(1);
  }
  const 저장 = 저장목록(JSON.parse(안전히읽기(join(폴더, '..', '..', 'game-kept'), 'index.json', 2_000_000) ?? '[]'));
  const 창들 = 견주기(창목록(JSON.parse(목록글), 구역), 상태값, 저장, new Date().toISOString().slice(0, 10));
  if (창들.length === 0) {
    console.error('list.json 첫 줄이 시작 화면(scene:)이 아니라 창 목록을 못 만들었다 — crawl 을 다시 돌린다');
    process.exit(1);
  }
  const 기록 = new Map(저장.map((x) => [`${x.상태} ${x.키}`, x.기록]));
  // 구역도 남긴다 — 에이전트가 list.json 에서 창을 다시 만들 때 같은 장소 열쇠를 쓴다(authoring-game 폴더읽기)
  writeFileSync(join(폴더, 'game.json'), JSON.stringify({ 상태: 상태값, ...(구역 === undefined ? {} : { 구역 }), 목록: 목록지문(목록글), 창: 창들 }, null, 2));
  const 셈 = (s: string) => 창들.filter((c) => c.저장본 === s);
  console.log(`- 창 ${창들.length}개 — 같음 ${셈('같음').length} · 바뀜 ${셈('바뀜').length} · 새 창 ${셈('새 창').length}`);
  for (const c of 셈('같음')) console.log(`- 같음 ${c.키} → 저장 기록 game-kept/${기록.get(`${상태값} ${c.키}`) ?? '?'} (다시 정리하지 않는다)`);
  for (const c of [...셈('바뀜'), ...셈('새 창')]) console.log(`- ${c.저장본} ${c.키} → ${c.파일} 끝에 「## 정리」를 덧붙인다`);
}

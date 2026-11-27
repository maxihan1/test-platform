// 오브젝트 펼치기 — 게임을 배우는 AI 와 케이스를 쓰는 AI 가 오브젝트 하나에 무엇이 붙어 있고 어떤 값 · 함수가 있나를 한 번에 본다 (도메인/게임 §3.10 「오브젝트 펼치기」)
// members 를 컴포넌트마다 부르면 오브젝트 하나가 수백 칸이고 대부분 네트워크 틀이다(2026-11-25 Cats Go! 식물 575칸) — 틀을 거르고 값 · 묶음 · 목록 · 함수로 가른다
// 쓰는 법: npx tsx scripts/authoring-game-props.ts <주소> — 잡은 디바이스에서 게임을 켜 둔 채 부른다. 읽기만 한다
import { pathToFileURL } from 'node:url';

import { gameLink } from '@platform/kit/game';
import { Game, type Link } from 'control-cli';

import { 환경비밀번호들 } from './authoring-accounts.js';
import { 게임자료환경 } from './authoring-check-game.js';
import { type 종류표, 값파일쓰기, 묶음읽기, 묶음타입, 종류, 종류표읽기 } from './authoring-game-bundles.js';
import { 정리알림 } from './authoring-game-find.js';
import { 엔진것, 이름만, 틀칸 } from './authoring-game-watch-report.js';
import { 비밀가리기 } from './authoring-reverse.js';
import { 게임환경, 돌발팝업값 } from './authoring-run3-env.js';
import { 잡은폰 } from './authoring-run3-game.js';

type 칸 = { name: string; type: string; value?: unknown; static?: boolean };
export interface 펼친것 {
  name: string;
  type: string;
  fields: 칸[];
  properties: 칸[];
  methods: { name: string; args: string[] }[];
  /** 같은 컴포넌트가 몇 개 붙었나 — members · get 은 늘 첫째를 준다 */
  수?: number;
}

const 줄상한 = 1_600;
const 함수상한 = 40;
/** 이만큼의 게임 컴포넌트에 똑같이 있는 함수가 이만큼 많으면 같은 틀(네트워크 컴포넌트)을 물려받은 것이다 */
const 되풀이 = 3;
const 틀함수수 = 15;
const 틀이름 = /^(?:__|k_Rpc|m_Delivery|NetworkVariable(?:Fields|Indexes)|m_?Network(?:Manager|Object)$|NetworkManager$|NetworkObject$|NetworkBehaviour|RpcTarget$)/;
const 알림꼴 = /^(?:(?:Action|Func|UnityEvent|UnityAction)(?:`\d+)?|Coroutine|ProfilerMarker|.*Delegate(?:Handler)?)$/;
const 목록꼴 = /\[\]$|^(?:List|HashSet|Dictionary|SerializedDictionary|Queue|Stack|IReadOnly|IList|IEnumerable|NetworkList)/;
const 묶음값 = /^(.*) \(([^()]+)\)$/s;

const 까닭 = (e: unknown): string => (e instanceof Error ? e.message : String(e));
const 자름 = (글: string): string => (글.length > 줄상한 ? `${글.slice(0, 줄상한)}…` : 글);
const 짧은 = (타입: string): string => 타입.split('.').pop()!;
const 네트워크값 = (f: 칸): boolean => f.type.startsWith('NetworkVariable');

/** 여러 컴포넌트가 물려받은 함수 — 값 칸은 이름이 같아도 게임 값일 수 있어 세어서 거르지 않는다 */
function 물려준함수(들: readonly 펼친것[]): Set<string> {
  const 수 = new Map<string, number>();
  for (const c of 들) for (const n of new Set(c.methods.map((x) => x.name))) 수.set(n, (수.get(n) ?? 0) + 1);
  const 되풀이된 = [...수].filter(([, n]) => n >= 되풀이).map(([n]) => n);
  return new Set(되풀이된.length >= 틀함수수 ? 되풀이된 : []);
}

/** 게임이 만든 칸만 — 켜짐 · 틀 · 알림(이벤트)은 뺀다 */
const 볼칸들 = (c: 펼친것): 칸[] => [...c.fields, ...c.properties].filter((f) => !틀칸.test(f.name) && !틀이름.test(f.name) && !알림꼴.test(f.type));

/** `.Value` 로 읽을 칸 — 네트워크 값은 members 에 타입 이름만 찍힌다 */
export const 더읽을것 = (들: readonly 펼친것[]): string[] => 들.flatMap((c) => 볼칸들(c).filter(네트워크값).map((f) => `${c.name}.${f.name}.Value`));

/** 컴포넌트마다 값 · 묶음(안에 칸이 더 있다) · 목록 · 빈 칸 · 함수 */
export function 펼친글(주소: string, 이름: string, 들: readonly 펼친것[], 엔진: readonly string[], 읽은: ReadonlyMap<string, unknown>): string[] {
  const 물려준 = 물려준함수(들);
  const 줄: string[] = [`# ${주소}`, ...(엔진.length === 0 ? [] : [`엔진 부품: ${엔진.join(' · ')}`])];
  for (const c of 들) {
    const 값: string[] = [];
    const 묶음: string[] = [];
    const 목록: string[] = [];
    const 빈: string[] = [];
    for (const f of 볼칸들(c)) {
      const 이름표 = `${f.name}${f.static === true ? '(static)' : ''}`;
      if (네트워크값(f)) {
        const v = 읽은.get(`${c.name}.${f.name}.Value`);
        if (v === undefined) 묶음.push(이름표);
        else 값.push(`${f.name}.Value=${JSON.stringify(v)}`);
      } else if (f.value === null) 빈.push(f.name);
      else if (목록꼴.test(f.type)) 목록.push(이름표);
      else if (f.value === undefined) continue;
      else if (typeof f.value !== 'string' || f.type === 'String') 값.push(`${이름표}=${JSON.stringify(f.value)}`);
      else {
        const m = 묶음값.exec(f.value);
        if (m === null) (f.value.includes('.') ? 묶음 : 값).push(f.value.includes('.') ? `${이름표} → (${짧은(f.value)})` : `${이름표}=${f.value}`);
        // 자기 오브젝트의 다른 컴포넌트를 가리키는 칸은 이미 여기 펼쳐진다
        else if (m[1] !== 이름) {
          묶음.push(`${이름표} → ${m[1]!} (${짧은(m[2]!)})`);
          // 칸 이름 표(game-types.txt)로 읽은 묶음 안 값 — 하위 칸마다 `묶음.하위=값`
          for (const [열쇠, v] of 읽은) if (열쇠.startsWith(`${c.name}.${f.name}.`)) 값.push(`${열쇠.slice(c.name.length + 1)}=${JSON.stringify(v)}`);
        }
      }
    }
    const 함수 = [...new Set(c.methods.filter((m) => !물려준.has(m.name) && !틀이름.test(m.name)).map((m) => `${m.name}(${m.args.join(', ')})`))];
    if (값.length + 묶음.length + 목록.length + 빈.length + 함수.length === 0) continue;
    줄.push(
      `■ ${c.name}${c.수 === undefined || c.수 < 2 ? '' : ` ×${c.수} — 첫째만 읽힌다`}`,
      ...(값.length === 0 ? [] : [`  값 ${값.join(' · ')}`]),
      ...(묶음.length === 0 ? [] : [`  묶음 ${묶음.join(' · ')}`]),
      ...(목록.length === 0 ? [] : [`  목록 ${목록.join(' · ')}`]),
      ...(빈.length === 0 ? [] : [`  비어 있음 ${빈.join(' · ')}`]),
      ...(함수.length === 0 ? [] : [`  함수 ${함수.slice(0, 함수상한).join(' · ')}${함수.length > 함수상한 ? ` 외 ${함수.length - 함수상한}개` : ''}`]),
    );
  }
  return [
    ...줄.map(자름),
    '값은 `get <주소> <컴포넌트.칸>` 으로 다시 읽는다(static 은 `static-get <컴포넌트>.<칸>` — get 은 「칸이 없습니다」라고 한다). 묶음 안은 칸 이름을 알아야 읽힌다(`get <주소> <컴포넌트.묶음.칸>`) — 칸 이름은 자료 폴더 game-types.txt 에 있고 그 표로 읽은 값은 위에 `묶음.칸=값` 으로 나온다. 목록은 `.Count` · `.Length` 만.',
  ];
}

export interface 펼침 {
  글: string[];
  /** `컴포넌트.칸` · `컴포넌트.묶음.하위칸` → 읽은 값 — 값 파일에 남긴다 */
  값: Record<string, unknown>;
  목록칸: string[];
}

/**
 * 오브젝트 하나를 펼친다 — 판 돌리기도 판 도중 새로 나온 것에 부른다. 이름은 자기 컴포넌트를 가리키는 칸을 거르는 데 쓴다.
 * 표(game-types.txt)가 있으면 묶음 칸도 칸 이름으로 한 번 더 읽는다
 */
export async function 펼쳐읽기(game: Game, 주소: string, 이름 = 주소.split('/').pop()!.replace(/\[\d+\]$/, ''), 표: 종류표 = new Map(), 그침인가?: (e: unknown) => boolean): Promise<펼침> {
  const 컴포넌트 = await game.components(주소);
  const 들: 펼친것[] = [];
  const 게임것 = 컴포넌트.filter((x) => !엔진것.test(x.type));
  for (const c of 게임것.filter((x, i) => 게임것.findIndex((y) => y.type === x.type) === i)) 들.push({ ...c, ...(await game.members(주소, c.name)), 수: 게임것.filter((x) => x.type === c.type).length });
  const 읽은 = new Map<string, unknown>();
  for (const 칸이름 of 더읽을것(들)) {
    try {
      읽은.set(칸이름, await game.get(주소, 칸이름));
    } catch (e) {
      if (그침인가?.(e) === true) throw e;
      // 값이 아직 없는 네트워크 값이다 — 이름만 보인다
    }
  }
  const 목록칸: string[] = [];
  for (const c of 들) {
    for (const f of 볼칸들(c)) {
      const 타입 = 네트워크값(f) || f.value === null || 목록꼴.test(f.type) ? null : 묶음타입(f.type, f.value, 표);
      const m = typeof f.value === 'string' ? 묶음값.exec(f.value) : null;
      if (타입 === null || m === null || m[1] === 이름) continue;
      const r = await 묶음읽기(game, 주소, `${c.name}.${f.name}`, 타입, 표, 1, undefined, 그침인가);
      for (const [열쇠, v] of r.값) 읽은.set(열쇠, v);
      목록칸.push(...r.목록칸);
    }
  }
  const 값: Record<string, unknown> = {};
  for (const c of 들) for (const f of 볼칸들(c)) if (!네트워크값(f) && f.value !== undefined && f.value !== null && !목록꼴.test(f.type)) 값[`${c.name}.${f.name}`] = f.value;
  for (const [열쇠, v] of 읽은) 값[열쇠] = v;
  return { 글: 펼친글(주소, 이름, 들, 컴포넌트.filter((x) => 엔진것.test(x.type)).map((x) => x.name), 읽은), 값, 목록칸 };
}

export const 펼친다 = async (game: Game, 주소: string, 이름?: string, 표?: 종류표): Promise<string[]> => (await 펼쳐읽기(game, 주소, 이름, 표)).글;

/** 환경의 계정 비밀번호를 값 파일에서 가린다 — 환경 값이 틀려 못 읽으면 가릴 것이 없는 것으로 */
function 비밀가리개(): (글: string) => string {
  let 비밀들: string[] = [];
  try {
    비밀들 = 환경비밀번호들(process.env);
  } catch {
    // PLATFORM_ACCOUNTS 가 JSON 이 아니면 값 파일에 섞일 비밀번호도 모른다
  }
  return (글) => 비밀가리기(글, 비밀들);
}

/**
 * 펼치고 값 파일 `game-props/<종류>.json` 로 남긴다 — 판 도중 자동 펼치기와 손으로 부른 펼치기가 같이 쓴다. 파일을 못 써도 펼친 글은 돌려준다.
 * 파일은 다 읽은 뒤에만 쓴다 — 그침이 나면 던져서 아무것도 안 쓴다
 */
export async function 펼쳐남기기(game: Game, 주소: string, 이름: string, 값파일정보: { 종류: string; 장면: string | null; 자료?: string; 덧?: { 치트: true; call: string[] }; 그침인가?: (e: unknown) => boolean }): Promise<string[]> {
  const { 자료 } = 값파일정보;
  const r = await 펼쳐읽기(game, 주소, 이름, 종류표읽기(자료), 값파일정보.그침인가);
  if (자료 === undefined) return r.글;
  const 못씀 = 값파일쓰기(자료, { 종류: 값파일정보.종류, 장면: 값파일정보.장면, 읽은때: new Date().toISOString(), 출처: '실행 중', 칸: r.값, 목록칸: r.목록칸, ...값파일정보.덧 }, 비밀가리개());
  return 못씀 === null ? r.글 : [...r.글, `값 파일을 못 썼다: ${못씀}`];
}

/** 0 펼쳤다 · 1 그 주소를 못 읽었다 · 2 부를 수 없다 */
export async function 실행(인자: string[], 트리 = process.cwd(), env: NodeJS.ProcessEnv = process.env, 길?: Link): Promise<number> {
  const [주소] = 인자;
  if (주소 === undefined || 인자.length !== 1) {
    console.error('쓰는 법: npx tsx scripts/authoring-game-props.ts <주소> — 같은 이름이 여럿이면 끝에 [0] 을 붙인다');
    return 2;
  }
  const 폰 = 잡은폰(트리);
  if (폰 === null) {
    console.error('[펼치기] 잡은 디바이스가 없다 — `npx control-cli hold --minutes 30`(PC 게임은 `--pc`)으로 잡고 게임을 켠 뒤 다시 부른다');
    return 2;
  }
  const 자료 = env[게임자료환경];
  let 비밀들: string[];
  let game: Game;
  try {
    비밀들 = 환경비밀번호들(env);
    game = new Game(길 ?? (await gameLink({ ...env, ...게임환경(폰), PLATFORM_PAD: '', PLATFORM_GAME_POPUPS: 돌발팝업값(자료) })));
  } catch (e) {
    console.error(`[펼치기] 게임에 못 붙었다 — ${까닭(e)}`);
    return 2;
  }
  let 글: string[];
  try {
    const 장면 = await game.scenes().then((x) => (typeof x.active === 'string' ? x.active : null), () => null);
    // 종류는 넘겨받은 주소 글자가 아니라 오브젝트의 실제 경로에서 만든다 — `//*[@id=123]` 이 `*[@id=123]` 종류가 되지 않게. 못 찾으면 값 파일을 안 쓴다
    const 찾음 = await game.find(주소);
    const 이름 = 이름만(찾음?.path ?? 주소);
    글 = 찾음 === null || 자료 === undefined ? await 펼쳐남기기(game, 주소, 이름, { 종류: '', 장면 }) : await 펼쳐남기기(game, 주소, 이름, { 종류: 종류(찾음.path), 장면, 자료 });
    if (찾음 === null && 자료 !== undefined) 글.push('값 파일은 안 썼다 — 주소로 오브젝트를 찾지 못해 종류를 알 수 없다');
  } catch (e) {
    console.error(`[펼치기] ${비밀가리기(까닭(e), 비밀들)}`);
    return 1;
  }
  console.log(비밀가리기(글.join('\n'), 비밀들));
  if (자료 !== undefined) for (const 줄 of 정리알림(자료)) console.log(줄);
  return 0;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(await 실행(process.argv.slice(2)));

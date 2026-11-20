// Android 앱 작성의 탐색 — 목표표 검사(체크포인트) · 결과 줄 · 맵 올리기 · 탐색 세션 프롬프트 절 (도메인/작성 §3.6 「★ 앱 탐색」 · APP-F4-06)
// 쓰는 법(자식이 탐색 세션을 끝내기 전에 스스로 검사): npx tsx scripts/authoring-app-explore.ts <자료 폴더> — 0 지남 · 1 못 지남 · 2 부를 수 없음
// 게임 탐색 플레이(authoring-explore.ts)와 틀은 같고 맵 · 목표 꼴은 따로다 — 결정 6
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { 앱크롤올리기, 크롤맵줄, 크롤색인상한 } from './authoring-app-crawl-route.js';
import { type 맵줄, 경로, 맵줄읽기, 새맵줄이름, 새줄더하기, 출발고르기 } from './authoring-app-route.js';
import { 앱맵받기 } from './authoring-app-screen.js';
import type { 탐색단계 } from './authoring-explore.js';
import { 부른다 } from './authoring-io.js';
import { 거절말고 } from './authoring-prd-io.js';
import { 계정섞였나 } from './authoring-reverse.js';
import { type 화면통로, 새로쓰기, 안전히읽기 } from './authoring-screens-keep-io.js';

/** 목표표 · 체크포인트를 지난 표시(결과 줄) — 이어받은 실행은 지남 표시를 보고 탐색 세션을 건너뛴다 */
export const 앱탐색자리 = { 목표: 'app-explore.json', 지남: 'app-explore.done' } as const;

const 결과들 = ['길 있음', '경로 확보', '진행 불가', null] as const;
export interface 앱목표 {
  /** 표준 기획서의 기능 단위 */
  기능: string;
  /** 목표 화면 키 — `app:<activity>/<이름표>` */
  화면: string;
  /** 들어오는 이동이 없는 화면이 여럿일 때만 — 경로 검색 `--from` */
  출발?: string;
  결과: (typeof 결과들)[number];
  까닭?: string;
}
/** 계정비우기 — 「함」 또는 「못 함 — <까닭>」(결정 4) */
export interface 앱목표표 { 목표: 앱목표[]; 계정비우기: string }

const 파일상한 = 1_000_000;
const 글인가 = (v: unknown): v is string => typeof v === 'string' && v.trim() !== '';

/** 목표표(app-explore.json)를 읽는다. 꼴이 틀리면 까닭 글 */
export function 목표표읽기(글: string | null): 앱목표표 | string {
  const 이름 = 앱탐색자리.목표;
  if (글 === null) return `${이름} 이 없거나 1MB 를 넘는다 — 탐색을 시작할 때 목표부터 적는다`;
  let 몸: { 목표?: unknown; 계정비우기?: unknown } | null;
  try {
    몸 = JSON.parse(글) as typeof 몸;
  } catch {
    return `${이름} 을 JSON 으로 못 읽었다`;
  }
  if (!Array.isArray(몸?.목표)) return `${이름} 에 「목표」 배열이 없다`;
  const 들: 앱목표[] = [];
  for (const [i, x] of (몸.목표 as Record<string, unknown>[]).entries()) {
    const 결과 = x?.결과 ?? null;
    if (!글인가(x?.기능) || !글인가(x.화면) || !(결과들 as readonly unknown[]).includes(결과) || (x.출발 !== undefined && !글인가(x.출발)) || (x.까닭 !== undefined && typeof x.까닭 !== 'string')) {
      return `${이름} 목표 ${String(i + 1)} 의 꼴이 틀렸다 — 기능 · 화면(화면 키) · 결과(「길 있음」 · 「경로 확보」 · 「진행 불가」 · null) · 까닭 · 출발`;
    }
    들.push({ 기능: x.기능, 화면: x.화면, ...(x.출발 === undefined ? {} : { 출발: x.출발 as string }), 결과: 결과 as 앱목표['결과'], ...(x.까닭 === undefined ? {} : { 까닭: x.까닭 as string }) });
  }
  return { 목표: 들, 계정비우기: typeof 몸.계정비우기 === 'string' ? 몸.계정비우기.trim() : '' };
}

/** 탐색 맵 — 받은 맵 글 · crawl 결과 줄 · 이번 작성이 적은 줄(이 차례로 얹는다 — 같은 줄이면 AI 가 적은 것이 이긴다) */
export interface 탐색맵 { 줄들: 맵줄[]; 크롤화면: Set<string>; 이번화면: Set<string> }

export function 탐색맵읽기(자료: string): 탐색맵 | { 못읽음: string } {
  const 받은 = 맵줄읽기(자료);
  if (받은 !== null && '못읽음' in 받은) return 받은;
  let 색인: unknown = null;
  try {
    색인 = JSON.parse(안전히읽기(join(자료, 'crawl'), 'index.json', 크롤색인상한) ?? 'null');
  } catch {
    // 깨진 색인은 crawl 이 없는 것과 같다 — 「길 있음」 목표가 맵에 없다고 짚힌다
  }
  const 크롤화면 = new Set((Array.isArray((색인 as { screens?: unknown } | null)?.screens) ? ((색인 as { screens: unknown[] }).screens) : [])
    .map((x) => (x as { key?: unknown } | null)?.key).filter(글인가));
  let 이번: unknown = null;
  try {
    이번 = JSON.parse(안전히읽기(자료, 새맵줄이름, 4 * 1024 * 1024) ?? 'null');
  } catch {
    // 맵줄읽기가 그 까닭을 이미 안다 — 이번 줄 없이 본다
  }
  const 이번줄 = Array.isArray((이번 as { rows?: unknown } | null)?.rows) ? ((이번 as { rows: Record<string, unknown>[] }).rows) : [];
  const 이번화면 = new Set(이번줄.filter((r) => r?.kind === 'MOVE' || r?.kind === 'SETUP').map((r) => r.toKey).filter(글인가));
  const 줄들 = 새줄더하기(새줄더하기(받은?.줄들 ?? [], { rows: 크롤맵줄(색인).줄들 }), 이번 ?? {});
  return { 줄들, 크롤화면, 이번화면 };
}

const 자르기 = (글: string, 상한: number) => (글.length > 상한 ? `${글.slice(0, 상한)}…` : 글);

/**
 * 체크포인트 — 목표마다 결과가 하나 있나, 「길 있음」 화면이 crawl 목록이나 맵에 있나, 「경로 확보」가 이번 작성이 적은 줄이고 「확인」 줄로 길이 나나,
 * 진행 불가에 까닭이 있나, 계정 비우기 결과가 있나. 못 지난 까닭 줄들 — 비면 지났다. 진행 불가가 있어도 지난다(그 기능 단위의 케이스는 보류 줄이 된다)
 */
export function 체크포인트(표: 앱목표표, 맵: 탐색맵): string[] {
  const 비우기 = 표.계정비우기 === '함' || /^못 함 — \S/.test(표.계정비우기) ? [] : ['「계정비우기」가 없다 — 「함」 또는 「못 함 — <까닭>」'];
  if (표.목표.length === 0) return ['목표가 하나도 없다 — 표준 기획서의 기능 단위마다 목표를 적는다', ...비우기];
  const 맵화면 = new Set(맵.줄들.flatMap((r) => [r.from, r.to]).filter((k): k is string => k !== null));
  return [...표.목표.flatMap((g): string[] => {
    const 이름 = `「${자르기(g.기능, 40)}」`;
    if (g.결과 === null) return [`${이름} — 결과가 없다(「길 있음」 · 「경로 확보」 · 「진행 불가」와 까닭)`];
    if (g.결과 === '진행 불가') return g.까닭?.trim() ? [] : [`${이름} — 진행 불가 까닭이 없다`];
    if (g.결과 === '길 있음') return 맵.크롤화면.has(g.화면) || 맵화면.has(g.화면) ? [] : [`${이름} — 「길 있음」인데 ${g.화면} 이 crawl 목록에도 맵에도 없다`];
    if (!맵.이번화면.has(g.화면)) return [`${이름} — 「경로 확보」인데 ${새맵줄이름} 에 ${g.화면} 에 닿는 이동 · 데이터 세팅 줄이 없다`];
    const 출발 = 출발고르기(맵.줄들, g.출발);
    if ('까닭' in 출발) return [`${이름} — ${출발.까닭.replace('--from 으로 준다', '목표의 「출발」 칸에 적는다')}`];
    return 경로(맵.줄들, g.화면, 출발.출발).다찾음 ? [] : [`${이름} — 경로 검색이 「확인」 줄만으로 길을 다 못 낸다 — 폰에서 통과한 동작을 ${새맵줄이름} 에 적었나 본다`];
  }), ...비우기];
}

const 까닭상한 = 5;

/** 결과 줄 — 작성 결과 요약과 PR 머리에 같은 줄이 실린다. 공개 저장소의 PR 이라 계정 비밀번호가 섞였으면 까닭을 적지 않는다 */
export function 앱탐색줄(표: 앱목표표, 비밀: readonly string[]): string {
  const 셈 = (r: 앱목표['결과']) => String(표.목표.filter((g) => g.결과 === r).length);
  const 불가 = 표.목표.filter((g) => g.결과 === '진행 불가');
  const 머리 = `앱 탐색: 목표 ${String(표.목표.length)}개 — 길 있음 ${셈('길 있음')} · 경로 확보 ${셈('경로 확보')} · 진행 불가 ${셈('진행 불가')}`;
  const 못비움 = 표.계정비우기 === '함' ? '' : ` / 계정 비우기 못 함(${자르기(표.계정비우기.replace(/^못 함 — /, ''), 80)}) — 폰 돌려 보기 초록은 탐색이 남긴 데이터 덕일 수 있다`;
  // 자르기 전에 본다 — 자른 자리에 걸친 비밀번호 앞부분이 남지 않게
  if (계정섞였나([...불가.flatMap((g) => [g.기능, g.까닭 ?? '']), 표.계정비우기], 비밀)) return `${머리} — 까닭에 테스트 계정 비밀번호가 들어 있어 안 적음`;
  const 까닭들 = 불가.slice(0, 까닭상한).map((g) => `${자르기(g.기능, 40)}(${자르기(g.까닭 ?? '', 80)})`);
  return `${머리}${불가.length === 0 ? '' : ` — ${까닭들.join(' · ')}${불가.length > 까닭상한 ? ` 외 ${String(불가.length - 까닭상한)}개` : ''}`}${못비움}`;
}

/** 이번 작성이 적은 줄(app-route.json — PUT app-route 본문)을 올린다. 꼴이 틀려 서버가 거절하면(400) `틀림` — 체크포인트가 그것으로 멈춘다 */
export async function 앱맵올리기(통로: 화면통로, 자료: string, 비밀: readonly string[]): Promise<{ 줄: string | null; 틀림: string | null }> {
  const 글 = 안전히읽기(자료, 새맵줄이름, 4 * 1024 * 1024);
  if (글 === null && existsSync(join(자료, 새맵줄이름))) return { 줄: `앱 조작 맵: ${새맵줄이름} 이 4MB 를 넘거나 일반 파일이 아니라 안 올림`, 틀림: `${새맵줄이름} 이 4MB 를 넘거나 일반 파일이 아니다` };
  if (글 === null) return { 줄: null, 틀림: null };
  let 몸: { rows?: unknown; remove?: unknown };
  try {
    몸 = JSON.parse(글) as typeof 몸;
  } catch {
    return { 줄: `앱 조작 맵: ${새맵줄이름} 을 JSON 으로 못 읽어 안 올림`, 틀림: `${새맵줄이름} 을 JSON 으로 못 읽었다` };
  }
  const 글자들 = (v: unknown): string[] => (typeof v === 'string' ? [v] : typeof v === 'object' && v !== null ? Object.entries(v).flatMap(([k, x]) => [k, ...글자들(x)]) : []);
  if (계정섞였나(글자들(몸), 비밀)) return { 줄: '앱 조작 맵: 탐색 줄에 테스트 계정 비밀번호가 들어 있어 안 올림', 틀림: `${새맵줄이름} 에 테스트 계정 비밀번호가 들어 있다` };
  const 수 = (v: unknown) => (Array.isArray(v) ? v.length : 0);
  try {
    const 답 = await 부른다(통로.주소기지, 통로.토큰, `/authoring/requests/${String(통로.번호)}/app-route`, { method: 'PUT', body: 몸 });
    if (답.status === 204) return { 줄: `앱 조작 맵: 탐색 줄 ${String(수(몸.rows))}개 올림${수(몸.remove) > 0 ? ` · ${String(수(몸.remove))}개 지움` : ''}`, 틀림: null };
    const 자리 = (답.몸 as { detail?: unknown } | null)?.detail;
    const 왜 = `서버 ${String(답.status)}${typeof 자리 === 'string' ? ` (${자리.slice(0, 100)})` : ''}`;
    return { 줄: `앱 조작 맵: 탐색 줄 못 올림 — ${왜}`, 틀림: 답.status === 400 ? `${새맵줄이름} 을 서버가 거절했다 — ${왜}` : null };
  } catch (e) {
    return { 줄: `앱 조작 맵: 탐색 줄 못 올림 — ${거절말고(e)}`, 틀림: null };
  }
}

/**
 * 에이전트의 체크포인트 — crawl 결과(맵 줄 · 화면 기록) → 탐색 줄 차례로 올리고 맵 글을 다시 받아 목표표를 본다(작성 끝이 아니라 여기서 올려 케이스 세션의 경로 검색이 그 길을 쓴다).
 * 지나면 결과 줄을 남겨(이어받은 실행이 탐색을 건너뛴다) 돌려준다. crawl 올린 줄은 PR 머리에 싣게 돌려준다
 */
export async function 앱체크포인트돌기(통로: 화면통로, 자료: string, 비밀: readonly string[], 빌드: string | undefined): Promise<({ 줄: string } | { 거절: string }) & { 크롤줄: string[] }> {
  const 크롤줄 = await 앱크롤올리기(통로, 자료, 비밀, 빌드, false);
  const 올림 = await 앱맵올리기(통로, 자료, 비밀);
  // 다시 받은 맵 글에 서버가 합친 줄이 든다. 못 받으면 파일이 없어 crawl · 이번 줄만으로 본다(앱맵받기가 로그를 남긴다)
  await 앱맵받기(통로, 통로.번호, 자료);
  const 표 = 목표표읽기(안전히읽기(자료, 앱탐색자리.목표, 파일상한));
  const 맵 = 탐색맵읽기(자료);
  const 못지남 = [
    ...(typeof 표 === 'string' ? [표] : '못읽음' in 맵 ? [맵.못읽음] : 체크포인트(표, 맵)),
    ...(올림.틀림 === null ? [] : [올림.틀림]),
  ];
  if (못지남.length > 0) return { 거절: `앱 탐색 체크포인트를 못 지났다 — ${못지남.slice(0, 10).join(' / ')}${못지남.length > 10 ? ` 외 ${String(못지남.length - 10)}개` : ''}`, 크롤줄 };
  const 줄 = 앱탐색줄(표 as 앱목표표, 비밀);
  try {
    새로쓰기(join(자료, 앱탐색자리.지남), 줄);
  } catch (e) {
    return { 거절: `${앱탐색자리.지남} 을 자료 폴더에 못 썼다 — ${e instanceof Error ? e.message : String(e)}`, 크롤줄 };
  }
  return { 줄, 크롤줄 };
}

/** 작성 끝에 PR 머리에 싣는 줄 — 결과 줄 · 탐색 줄 다시 올리기(케이스 세션이 채운 함수 이름). 탐색을 안 한 작성도 이번 줄이 있으면 올린다 */
export async function 앱탐색끝줄(통로: 화면통로, 자료: string, 비밀: readonly string[]): Promise<string[]> {
  const 지남 = 안전히읽기(자료, 앱탐색자리.지남, 파일상한)?.trim();
  const 올림 = await 앱맵올리기(통로, 자료, 비밀);
  return [지남, 올림.줄].filter((x): x is string => x !== null && x !== undefined && x !== '');
}

/**
 * 탐색 절 — 무엇을 왜는 명세가, 목표 고르기 · 줄 적는 요령 · 빈 곳 해 보기는 앱 작성 지침(진행판 APP-F4-07)이 정본이다.
 * 첫 세션은 케이스를 쓰지 않고 끝낸다 — 체크포인트를 지나면 에이전트가 새 세션을 띄운다. 시간 상한은 없다(결정 7)
 */
export function 앱탐색절(탐색: 탐색단계, 자료폴더 = '자료 폴더'): string[] {
  const 자리 = (이름: string) => `\`${join(자료폴더, 이름)}\``;
  const 경로검색 = `\`npx tsx scripts/authoring-app-route.ts ${자료폴더} <목표 화면 키> [--from <출발 화면 키>]\``;
  const 폰 = '- 폰은 작성이 끝날 때까지 한 대를 쥔다 — 에이전트가 팜 잡기를 늘리고 작성 끝에 놓는다. app.md 의 「30분 안에」 · 「30분이 지나면 release 뒤 다시 hold」 · 「끝에 release」는 이 작성에서 따르지 말고, 놓지 마라. `.appium-cli/held` 에 폰 번호가 있으면 그 폰을 그대로 쓴다.';
  if ('끝' in 탐색) {
    return [
      '',
      '--- 앱 탐색 ---',
      '앱 탐색은 앞 세션이 마쳤고 체크포인트를 지났다. crawl · 빈 곳 해 보기 · 계정 비우기를 다시 하지 말고 「요구별 케이스 목록 쓰기」부터 해라.',
      `- 목표와 결과는 ${자리(앱탐색자리.목표)} 에 있다. 「진행 불가」 목표의 기능 단위 케이스는 그 까닭으로 보류 줄을 쓴다. crawl 화면 목록은 ${자리('crawl/list.json')} 이다.`,
      `- 그 화면까지 가는 데이터 세팅 · 이동은 경로 검색(${경로검색})이 찍는 차례를 옮긴다. 맵 글(${자리('app-route.txt')})을 통째로 읽지 마라. 폰으로 눌러 보는 것은 맵에 없는 곳만이다.`,
      폰,
      `- 동작을 화면 파일 함수로 만들면 ${자리(새맵줄이름)} 의 그 줄 fields.fn 에 \`<클래스 이름>.<함수 이름>\` 을 채워라(없는 줄은 더한다) — 에이전트가 끝에 다시 올린다.`,
      `- 결과 요약에 이 줄을 그대로 넣어라: ${탐색.끝}`,
    ];
  }
  return [
    '',
    '--- 앱 탐색 ---',
    '이번 세션은 앱 탐색까지만 한다. 표준 기획서 옮기기를 마치면 `[단계] 앱 탐색` 을 말하고 아래를 한다. 요구별 케이스 목록 · 케이스는 쓰지 마라 — 체크포인트를 지나면 에이전트가 새 세션을 띄워 맡긴다. 시간 상한은 없다. 차례의 까닭은 docs/spec/도메인/작성.md §3.6 「★ 앱 탐색」이다.',
    폰,
    '1. 폰을 잡고(`npx appium-cli hold --minutes 30`) 앱 서버에 닿는지 본다(app.md §4 의 1). 못 닿으면 목표를 모두 "진행 불가" · 까닭 "앱 서버에 못 닿음" 으로 적고 7 로 간다.',
    `2. 테스트 계정을 비운다 — 경로 검색 맵에 화면 키 없는 데이터 세팅 줄(계정 비우기)이 있으면 그 도우미로. 없으면(첫 작성) 건너뛴다.`,
    `3. crawl — app.md §6 의 1 · 2 대로 앱을 열고 로그인 스크립트를 만든 뒤 \`npx tsx scripts/authoring-app-crawl.ts ${자료폴더} [--login <로그인 스크립트>]\` 를 0 이 날 때까지 부른다(3 이면 같은 명령을 다시, 1 이면 한 번만 다시 — 또 1 이면 crawl 없이 간다). 도는 동안 폰 · probe 세션을 건드리지 마라. 끝나면 ${자리('crawl/list.json')} 만 읽는다.`,
    `4. 목표표 — 표준 기획서의 기능 단위마다 목표 화면 하나를 정해 ${자리(앱탐색자리.목표)} 에 먼저 적는다 — \`{"목표":[{"기능":"알림 상세","화면":"app:.StatusActivity/글 상세","결과":null}],"계정비우기":null}\`. crawl 목록이나 경로 검색으로 닿는 화면은 "길 있음" 이다.`,
    `5. 남은 목표(빈 곳 — 데이터가 없어 화면이 안 뜸 · crawl 이 위험 글자라 안 누름 · 로그인 말고 다른 값을 넣어야 넘어감)는 폰에서 해 본다. 데이터가 필요하면 세팅 → 해 보기 → 확인을 목표마다 3번까지 한다. 해낸 이동 · 데이터 세팅 · API · 돌발 팝업은 ${자리(새맵줄이름)} 에 줄로 적는다(\`{"rows":[…]}\` — 칸은 docs/spec/도메인/작성.md §7 「앱 조작 맵 통로」 PUT 본문). 해내면 "경로 확보", 못 하면 "진행 불가" 와 "까닭". 계정 자체를 바꾸는 동작은 새로 가입한 일회용 회원으로 하고, 다른 앱으로 넘어가면 거기서 멈춘다. 해 보며 본 값은 맵에 적지 마라 — 기대값의 근거가 아니다.`,
    `6. 테스트 계정을 시드 상태로 비운다 — 비우기 도우미를 만들어 ${자리(새맵줄이름)} 에 화면 키 없는 데이터 세팅 줄로 적는다. 했으면 "계정비우기": "함", 못 했으면 "못 함 — <까닭>".`,
    `7. \`npx tsx scripts/authoring-app-explore.ts ${자료폴더}\` 가 0 으로 끝날 때까지 고친다. 그다음 결과 요약 대신 「앱 탐색 끝」 한 줄만 쓰고 끝낸다 — 에이전트가 crawl 줄 · 탐색 줄을 맵에 올리고 체크포인트를 다시 본다.`,
  ];
}

/** 0 지남 · 1 못 지남 · 2 부를 수 없음 — 자식이 탐색 세션을 끝내기 전에 부른다. 맵은 올리지 않고 자료 폴더의 맵 · crawl 결과 · 이번 줄로 본다 */
export function 실행(인자: string[]): number {
  const [자료] = 인자;
  if (자료 === undefined || 인자.length !== 1) {
    console.error('쓰는 법: npx tsx scripts/authoring-app-explore.ts <자료 폴더>');
    return 2;
  }
  const 표 = 목표표읽기(안전히읽기(자료, 앱탐색자리.목표, 파일상한));
  if (typeof 표 === 'string') {
    console.error(`[앱 탐색] ${표}`);
    return 1;
  }
  const 맵 = 탐색맵읽기(자료);
  if ('못읽음' in 맵) {
    console.error(`[앱 탐색] ${맵.못읽음}`);
    return 2;
  }
  const 못지남 = 체크포인트(표, 맵);
  for (const 줄 of 못지남) console.log(`못 지남: ${줄}`);
  console.log(못지남.length === 0 ? 앱탐색줄(표, []) : `[앱 탐색] 체크포인트를 못 지났다 — ${String(못지남.length)}건을 고친다`);
  return 못지남.length === 0 ? 0 : 1;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = 실행(process.argv.slice(2));
}

// 빠른 검사의 게임 갈래 — 케이스가 적은 게임 요소가 지도에 있나 · 몸통이 게임 꼴인가 · 좌표를 안 쓰나 (도메인/게임 §3.10 「작성 — 한 바퀴」 6 · 공통/3 「게임 테스트 타입」 elements)
// 어느 케이스가 게임인지는 작성 에이전트만 안다(kit 은 종류를 모른다) — 그래서 저장소 전체 형식 검사(K 표)가 아니라 여기서 본다

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import ts from 'typescript';

import { 명세글, 속성, 읽기 } from './authoring-held-apply.js';

/** 에이전트가 게임 작성에서만 자식에게 넘기는 자료 폴더 — 지난 지도 `game-map.txt` 와 이번에 쓴 `game-elements.json` 이 있다(authoring-game.ts 게임자리) */
export const 게임자료환경 = 'AUTHORING_GAME_DIR';

/** 지도 열쇠 — 지난 지도 글의 요소 줄(`- <열쇠> · <이름> …` — prd/gameMap.ts 지도글)과 이번 요소 파일의 열쇠, 이번에 지우는 열쇠는 뺀다 */
export function 지도열쇠들(지도글: string | null, 요소글: string | null): { 열쇠: Set<string>; 까닭?: string } {
  const 열쇠 = new Set<string>();
  for (const 줄 of (지도글 ?? '').split('\n')) {
    const m = /^- (.+?) · /.exec(줄);
    if (m) 열쇠.add(m[1]!);
  }
  if (요소글 === null) return { 열쇠 };
  let 몸: { elements?: unknown; remove?: unknown };
  try {
    몸 = JSON.parse(요소글) as typeof 몸;
  } catch {
    return { 열쇠, 까닭: 'game-elements.json 을 JSON 으로 못 읽었다 — 이번에 쓴 요소는 지도에 없는 것으로 본다' };
  }
  for (const e of Array.isArray(몸.elements) ? (몸.elements as { key?: unknown }[]) : []) if (typeof e?.key === 'string') 열쇠.add(e.key);
  for (const k of Array.isArray(몸.remove) ? 몸.remove : []) if (typeof k === 'string') 열쇠.delete(k);
  return { 열쇠 };
}

/** 부른 사슬의 맨 앞 — `driver.action('pointer').move(…)` 는 `driver` */
function 사슬뿌리(e: ts.Expression): ts.Expression {
  let n = e;
  while (ts.isPropertyAccessExpression(n) || ts.isElementAccessExpression(n) || ts.isCallExpression(n) || ts.isNonNullExpression(n) || ts.isParenthesizedExpression(n) || ts.isAwaitExpression(n)) n = n.expression;
  return n;
}

/**
 * 그 파일이 쓴 좌표 — Appium `driver` 를 부르는 사슬의 인자에 `{ x, y }` 를 함께 든 객체(누르기 동작 · 제스처). 게임 드라이버에는 좌표를 받는 메서드가 없다.
 * `driver` 밖의 `{ x, y }`(어드민 순간이동 본문 · 위치 verify 기대값)는 주소가 아니라 값이라 안 본다
 */
function 좌표자리(sf: ts.SourceFile): number[] {
  const 줄들 = new Set<number>();
  const 객체들 = (n: ts.Node): void => {
    if (ts.isObjectLiteralExpression(n)) {
      const 이름들 = new Set(n.properties.flatMap((p) => (p.name !== undefined && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) ? [p.name.text] : [])));
      if (이름들.has('x') && 이름들.has('y')) 줄들.add(sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1);
    }
    ts.forEachChild(n, 객체들);
  };
  const 걷기 = (n: ts.Node): void => {
    if (ts.isCallExpression(n)) {
      const 뿌리 = 사슬뿌리(n.expression);
      if (ts.isIdentifier(뿌리) && 뿌리.text === 'driver') n.arguments.forEach(객체들);
    }
    ts.forEachChild(n, 걷기);
  };
  걷기(sf);
  return [...줄들].sort((a, b) => a - b);
}

/** `test(spec, async ({ … }) => …)` 몸통이 꺼내는 이름들. 꺼내지 않고 통째로 받으면 빈 목록 */
function 몸통이름들(sf: ts.SourceFile): string[] {
  const 이름들: string[] = [];
  const 걷기 = (n: ts.Node): void => {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'test') {
      const 몸통 = n.arguments[1];
      const 첫 = 몸통 !== undefined && (ts.isArrowFunction(몸통) || ts.isFunctionExpression(몸통)) ? 몸통.parameters[0] : undefined;
      if (첫 !== undefined && ts.isObjectBindingPattern(첫.name)) {
        for (const e of 첫.name.elements) 이름들.push((e.propertyName ?? e.name).getText(sf));
      }
    }
    ts.forEachChild(n, 걷기);
  };
  걷기(sf);
  return 이름들;
}

/** 리터럴 배열이면 글자들, 아니면 null(변수 · 식 · 펼침). 칸이 없으면 빈 목록 */
function 요소읽기(명세: ts.ObjectLiteralExpression): string[] | null {
  const 식 = 속성(명세, 'elements')?.initializer;
  if (식 === undefined) return 명세.properties.some((p) => ts.isShorthandPropertyAssignment(p) && p.name.text === 'elements') ? null : [];
  if (!ts.isArrayLiteralExpression(식) || !식.elements.every(ts.isStringLiteralLike)) return null;
  // kit(defineCase)처럼 빈 열쇠 · 겹침은 버린다 — DB 에 안 가는 값으로 관문을 막지 않는다
  return [...new Set(식.elements.map((e) => (e as ts.StringLiteralLike).text).filter((k) => k !== ''))];
}

/** 케이스 글이 적은 요소 열쇠 — 글자 배열이 아니거나 케이스가 아니면 빈 목록(에이전트의 「아직 안 다룬 요소」 셈) */
export function 케이스요소들(글: string): string[] {
  const 명세 = 명세글(읽기(글));
  return 명세 === undefined ? [] : (요소읽기(명세) ?? []);
}

/**
 * 파일들(저장소 뿌리 기준 경로와 글)을 본다. 지도가 null 이면 게임 작성이 아니다 — 케이스가 elements 를 적었는지만 본다.
 * 케이스(`.spec.ts`)는 요소 · 디바이스 · 몸통을, 모든 파일(화면 객체 · 도우미 포함)은 좌표를 본다
 */
export function 게임형식(파일들: readonly { 경로: string; 글: string }[], 지도: Set<string> | null): string[] {
  const 틀림: string[] = [];
  for (const f of 파일들) {
    // 게임 아닌 작성은 웹 폴더 전체(1,000건 넘게)를 받을 수 있다 — 낱말이 없으면 파서를 안 돌린다
    if (지도 === null && !f.글.includes('elements')) continue;
    const sf = 읽기(f.글);
    const 명세 = f.경로.endsWith('.spec.ts') ? 명세글(sf) : undefined;
    const 요소 = 명세 === undefined ? [] : 요소읽기(명세);
    if (지도 === null) {
      if (요소 === null || 요소.length > 0) 틀림.push(`${f.경로} — 게임 애플리케이션 작성이 아닌데 elements 를 적었다. 칸을 뺀다`);
      continue;
    }
    if (명세 !== undefined) {
      if (요소 === null) 틀림.push(`${f.경로} — elements 는 글자 배열 리터럴로 적는다(변수 · 식 · 펼침 금지)`);
      else for (const k of 요소.filter((k) => !지도.has(k))) 틀림.push(`${f.경로} — 요소 ${k} 가 게임 지도에 없다. game-elements.json 에 먼저 적거나 game-map.txt 의 열쇠를 쓴다`);
      let 기기 = 속성(명세, 'platforms')?.initializer;
      while (기기 !== undefined && (ts.isAsExpression(기기) || ts.isSatisfiesExpression(기기) || ts.isParenthesizedExpression(기기))) 기기 = 기기.expression;
      const 안드로이드만 = 기기 !== undefined && ts.isArrayLiteralExpression(기기) && 기기.elements.length === 1 && ts.isStringLiteralLike(기기.elements[0]!) && 기기.elements[0].text === 'android';
      if (!안드로이드만) 틀림.push(`${f.경로} — 게임 케이스의 platforms 는 ['android'] 하나다`);
      if (몸통이름들(sf).includes('page')) 틀림.push(`${f.경로} — 게임 케이스 몸통에는 page 가 없다. game · admin · driver 를 쓴다`);
    }
    for (const 줄 of 좌표자리(sf)) 틀림.push(`${f.경로}:${줄} — 좌표({ x, y })를 쓴다. 오브젝트 이름이나 / 경로로 찾는다`);
  }
  return 틀림;
}

/**
 * 폴더 전체의 스모크 케이스 수 — `defineCase` 의 `smoke: true` 글자만 센다. 0건이면 빌드를 올려도 스모크 없이 회귀가 바로 돈다.
 * 보조 AI 는 묶음 하나만 봐 애매하면 빼 두므로 합친 뒤 폴더로 센다(GAME-F1-14 PR #443 — 287건에 0건)
 */
export function 스모크틀림(폴더: string, 글들: readonly string[]): { 수: number; 틀림: string[] } {
  const 수 = 글들.filter((글) => {
    const 명세 = 글.includes('smoke') ? 명세글(읽기(글)) : undefined;
    return 명세 !== undefined && 속성(명세, 'smoke')?.initializer.kind === ts.SyntaxKind.TrueKeyword;
  }).length;
  return { 수, 틀림: 수 > 0 ? [] : [`tests/${폴더} — 스모크 케이스(smoke: true)가 0건이다. 다 합친 뒤 핵심 경로(로그인 → 캐릭터 → 월드 입장 → 사냥 → 상점)를 게임 화면으로 지나는 정상 기능 케이스 5~10건에 단다(tpx-cases game.md §5)`] };
}

/** 빠른 검사가 부른다 — 게임 작성이 아니고 걸린 것도 없으면 null(웹 · 앱 작성의 출력은 그대로). 폴더를 주면(`마지막`) 스모크도 폴더 전체로 센다 */
export function 게임검사(트리: string, 경로들: readonly string[], env: NodeJS.ProcessEnv, 폴더?: string): { 이름: string; ok: boolean; 줄들: string[]; 머리?: string } | null {
  const 자료 = env[게임자료환경];
  const 읽음 = (p: string) => (existsSync(p) ? readFileSync(p, 'utf8') : null);
  const 지도 = 자료 ? 지도열쇠들(읽음(join(자료, 'game-map.txt')), 읽음(join(자료, 'game-elements.json'))) : null;
  const 파일들 = 경로들.filter((p) => p.startsWith('tests/') && p.endsWith('.ts') && existsSync(join(트리, p))).map((p) => ({ 경로: p, 글: readFileSync(join(트리, p), 'utf8') }));
  const 틀림 = 게임형식(파일들, 지도?.열쇠 ?? null);
  if (지도 === null && 틀림.length === 0) return null;
  const 케이스글들 = (자리: string) => (existsSync(자리) ? readdirSync(자리).filter((n) => n.endsWith('.spec.ts')).map((n) => readFileSync(join(자리, n), 'utf8')) : []);
  const 스모크 = 지도 === null || 폴더 === undefined ? null : 스모크틀림(폴더, 케이스글들(join(트리, 'tests', 폴더)));
  if (스모크 !== null) 틀림.push(...스모크.틀림);
  return {
    이름: '게임 케이스 형식',
    ok: 틀림.length === 0,
    줄들: 틀림,
    머리: 지도 === null ? undefined : `지도 열쇠 ${지도.열쇠.size}개 · 본 파일 ${파일들.length}개${스모크 === null ? '' : ` · 스모크 ${스모크.수}건`}${지도.까닭 ? ` · ${지도.까닭}` : ''}`,
  };
}

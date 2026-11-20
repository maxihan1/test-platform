// 게임 조작 맵 경로 검색 — 작성 AI 가 맵 글(자료 폴더 game-route.txt)을 통째로 읽지 않고 목표까지의 차례만 받아 본다 (도메인/게임 §3.10 「탐색 플레이 · 조작 맵」 경로 검색)
// 쓰는 법: npx tsx scripts/authoring-game-route.ts <자료 폴더> <목표 열쇠…> [--from <출발 열쇠>] — 폰 없이 파일만 읽는다. 「확인」 행으로만 길을 낸다
import { pathToFileURL } from 'node:url';

import { 게임자리 } from './authoring-game.js';
import { 안전히읽기 } from './authoring-screens-keep-io.js';

const 종류들 = ['MOVE', 'SETUP', 'LOG', 'TERM', 'POPUP'] as const;
type 종류 = (typeof 종류들)[number];

export interface 맵행 {
  kind: 종류;
  from: string;
  action: string;
  to: string | null;
  status: 'OK' | 'RECHECK' | 'BLOCKED';
  warning: string | null;
  /** 맵 글의 그 줄(「- 」 뒤) — 결과에 그대로 찍어 빌드 · 소요 · 도우미 · 함수 · 칸을 다시 만들지 않는다 */
  line: string;
}

export interface 목표 {
  /** 상태 조각 — `state:직업=탱커,레벨=1` 의 `직업=탱커` · `레벨=1` */
  상태: string[];
  /** 창 · 구역 열쇠 하나 */
  자리: string | null;
}

/**
 * 맵 글을 행으로 — 서버 맵글짓기(apps/admin/src/prd/gameRoute.ts)의 꼴을 거꾸로 읽는다.
 * 글 칸에는 「 · 」 「 → 」가 못 들어가(올리기 검사) 그것으로 자른다. 꼴이 틀린 줄은 뺀다
 */
export function 맵읽기(글: string): 맵행[] {
  const 행들: 맵행[] = [];
  let kind: 종류 | null = null;
  for (const 줄 of 글.split('\n')) {
    const 머리 = /^## .+ \((\w+)\) — \d+행$/.exec(줄);
    if (머리) {
      kind = (종류들 as readonly string[]).includes(머리[1]!) ? (머리[1] as 종류) : null;
      continue;
    }
    if (kind === null || !줄.startsWith('- ')) continue;
    const line = 줄.slice(2);
    const [앞, 상태글, ...뒤] = line.split(' · ');
    const 칸들 = (앞 ?? '').split(' → ');
    const status = 상태글 === '확인' ? 'OK' : 상태글 === '재확인 필요' ? 'RECHECK' : 상태글?.startsWith('진행 불가 — ') ? 'BLOCKED' : null;
    if (칸들.length < 2 || 칸들.length > 3 || status === null) continue;
    // 칸(JSON)은 늘 맨 끝이고 값 안에 「 · 」가 들 수 있다 — 그 앞까지만 봐야 JSON 조각을 경고로 읽지 않는다
    const 칸자리 = 뒤.findIndex((x) => x.startsWith('칸 '));
    const 경고 = (칸자리 < 0 ? 뒤 : 뒤.slice(0, 칸자리)).find((x) => x.startsWith('⚠ '));
    행들.push({ kind, from: 칸들[0]!, action: 칸들[1]!, to: 칸들[2] ?? null, status, warning: 경고?.slice(2) ?? null, line });
  }
  return 행들;
}

const 상태조각 = (열쇠: string | null): string[] =>
  열쇠?.startsWith('state:') === true ? 열쇠.slice('state:'.length).split(',').map((x) => x.trim()).filter((x) => x !== '') : [];
/** 상태 조각의 이름 — `레벨=1` 은 `레벨`, 값이 없는 조각(`몬스터 없음`)은 그대로 */
const 이름 = (조각: string): string => 조각.split('=')[0]!;

/**
 * 맵에 나오는 장면 첫 화면(`game:<장면>`) — 창 훑기가 로그인 직후 시작 화면을 이 꼴로 적는다(authoring-game-crawl.ts 창목록).
 * 하나뿐일 때만 출발로 쓴다 — 여럿이면 어느 장면이 로그인 직후인지 몰라 「게임 시작」 같은 장면 이동 걸음을 빼먹은 길을 낼 수 있다
 */
export const 장면첫화면들 = (행들: 맵행[]): string[] => [...new Set(행들.flatMap((r) => [r.from, r.to ?? '']).filter((k) => /^game:[^/]+$/.test(k)))];
const 걸음이름 = { MOVE: '이동 · 조작', SETUP: '상태 설정' } as const;

/** 자리에서 자리로 — 이동 · 조작 행과 자리를 바꾸는 상태 설정 행(순간이동). 너비 우선이라 걸음 수가 가장 적은 길 */
function 길찾기(행들: 맵행[], 출발: Set<string>, 도착: string, 쓸상태: ReadonlySet<맵행['status']>): 맵행[] | null {
  if (출발.has(도착)) return [];
  const 길목 = 행들.filter(
    (r): r is 맵행 & { to: string } =>
      r.to !== null && r.to !== r.from && 쓸상태.has(r.status) && (r.kind === 'MOVE' || (r.kind === 'SETUP' && !r.to.startsWith('state:'))),
  );
  const 온길 = new Map<string, 맵행 | null>([...출발].map((k) => [k, null]));
  for (let 앞줄 = [...출발]; 앞줄.length > 0; ) {
    const 다음: string[] = [];
    for (const 자리 of 앞줄) {
      for (const r of 길목) {
        if (r.from !== 자리 || 온길.has(r.to)) continue;
        온길.set(r.to, r);
        다음.push(r.to);
        if (r.to !== 도착) continue;
        const 길: 맵행[] = [];
        for (let x = 온길.get(도착); x; x = 온길.get(x.from)) 길.unshift(x);
        return 길;
      }
    }
    앞줄 = 다음;
  }
  return null;
}

const 확인만 = new Set<맵행['status']>(['OK']);
const 재확인까지 = new Set<맵행['status']>(['OK', 'RECHECK']);

/** 목표까지 — 상태 설정 차례 → 목표 자리까지 이동 · 조작 차례, 그다음 그 자리에서 하는 동작 · 남는 로그 · 돌발 팝업. 길이 없는 목표는 「길 없음」 줄과 그 목표에 걸린 확인 아닌 행 */
export function 경로(행들: 맵행[], 목표: 목표, 출발: string): { 줄들: string[]; 다찾음: boolean } {
  const 목표글 = [목표.상태.length > 0 ? `state:${목표.상태.join(',')}` : '', 목표.자리 ?? ''].filter((x) => x !== '').join(' ');
  const 줄들 = [`# 경로 검색 — 목표 ${목표글} · 출발 ${출발} — 「확인」 행으로만 길을 낸다 · 기대값의 근거가 아니다`];
  const 지난: 맵행[] = [];
  let 지금 = new Set([출발]);
  let 다찾음 = true;
  const 걸음 = (r: 맵행, 이름: string) => 줄들.push(`${String(지난.push(r))}. [${이름}] ${r.line}`);

  const 길없음 = (대상: string, 왜: string) => {
    다찾음 = false;
    줄들.push(`길 없음: ${대상} (${왜}) — 폰에서 해 볼 목표다`);
    const 조각 = 대상.startsWith('state:') ? 대상.slice('state:'.length) : null;
    const 닿음 = (r: 맵행) => (조각 === null ? r.from === 대상 || r.to === 대상 : [...상태조각(r.from), ...상태조각(r.to)].includes(조각));
    // 「재확인 필요」 행을 지나야만 길이 나는 목표도 다시 해 볼 목표다(§3.10 차례 2) — 그 길에 낀 행까지 붙인다
    const 재확인길 = 조각 === null ? (길찾기(행들, 지금, 대상, 재확인까지) ?? []) : [];
    for (const r of 행들) if (r.status !== 'OK' && (닿음(r) || 재확인길.includes(r))) 줄들.push(`  ${r.status === 'BLOCKED' ? '진행 불가' : '재확인 필요'}: ${r.line}`);
  };
  const 이동 = (도착: string, 왜: string): boolean => {
    const 길 = 길찾기(행들, 지금, 도착, 확인만);
    if (길 === null) {
      길없음(도착, 왜);
      return false;
    }
    for (const r of 길) 걸음(r, 걸음이름[r.kind as keyof typeof 걸음이름]);
    지금 = new Set([도착]);
    return true;
  };

  // 상태 조각마다 그것을 만드는 확인 행 — 한 행이 여럿을 맞추면 그 행 하나로. 맞추는 수가 같으면 목표 밖 상태를 덜 건드리는 행
  const 설정들 = 행들.filter((r) => r.kind === 'SETUP' && r.status === 'OK');
  const 남은 = new Set(목표.상태);
  const 못찾음 = new Set<string>();
  const 고른: 맵행[] = [];
  for (const 조각 of 목표.상태) {
    if (!남은.has(조각)) continue;
    const 덮는수 = (r: 맵행) => 상태조각(r.to).filter((x) => 남은.has(x)).length;
    const 군더더기 = (r: 맵행) => 상태조각(r.to).filter((x) => !목표.상태.includes(x)).length;
    const 고름 = 설정들
      .filter((r) => 상태조각(r.to).includes(조각))
      .reduce<맵행 | null>((a, b) => (a === null || 덮는수(b) > 덮는수(a) || (덮는수(b) === 덮는수(a) && 군더더기(b) < 군더더기(a)) ? b : a), null);
    if (고름 === null) {
      남은.delete(조각);
      못찾음.add(조각);
      길없음(`state:${조각}`, '그 상태를 만드는 상태 설정 행이 없다');
      continue;
    }
    고른.push(고름);
    for (const x of 상태조각(고름.to)) 남은.delete(x);
  }
  // 다른 상태를 흔드는 설정을 먼저 친다 — 경고(부작용)가 달렸거나 목표 조각과 이름이 같고 값이 다른 조각을 같이 바꾸는 행.
  // /gm killall 이 경험치를 줘 레벨을 올리듯, 흔드는 명령 뒤에 맞춘 값이 남게(PR #833)
  const 흔듦 = (r: 맵행) => r.warning !== null || 상태조각(r.to).some((x) => !목표.상태.includes(x) && 목표.상태.some((y) => 이름(y) === 이름(x)));
  const 친것 = new Map<string, { 조각: string; 행: 맵행 }>();
  for (const r of [...고른.filter(흔듦), ...고른.filter((x) => !흔듦(x))]) {
    if (!지금.has(r.from) && !이동(r.from, `상태 설정 「${r.action}」 을 치는 자리`)) continue;
    지금 = new Set([r.from]);
    걸음(r, '상태 설정');
    for (const x of 상태조각(r.to)) 친것.set(이름(x), { 조각: x, 행: r });
  }
  // 흔드는 행끼리 서로 덮으면 순서로 못 푼다 — 끝에 남는 값이 목표와 다르면 알린다
  for (const 조각 of 목표.상태) {
    const 끝 = 친것.get(이름(조각));
    if (끝 !== undefined && 끝.조각 !== 조각 && !못찾음.has(조각)) 길없음(`state:${조각}`, `뒤에 치는 「${끝.행.action}」 이 ${끝.조각} 으로 덮어쓴다`);
  }
  const 도착함 = 목표.자리 !== null && 이동(목표.자리, '목표 자리');

  for (const r of 행들) {
    if (!도착함 || r.kind !== 'MOVE' || r.from !== 목표.자리) continue;
    if (r.status === 'OK') {
      줄들.push(`그 자리에서 하는 동작: ${r.line}`);
      continue;
    }
    // 정식 실행이 실패로 단 동작은 대개 목표 자리의 되풀이 동작이다 — 길이 나도 다시 해 볼 목표로 남긴다(§3.10 차례 2)
    다찾음 = false;
    줄들.push(`확인 안 된 동작: ${r.line}`);
  }
  for (const r of 행들) {
    if (r.status !== 'OK' || r.kind !== 'LOG') continue;
    // 지난 행은 그 동작이 남기는 로그만, 목표 자리는 거기서 하는 동작이 남기는 로그 전부 — 로그 행의 출발 열쇠는 그 동작의 출발 열쇠다
    if (지난.some((s) => s.from === r.from && s.action === r.action) || (도착함 && r.from === 목표.자리)) 줄들.push(`남는 로그: ${r.line}`);
  }
  // 공지 · 초대 창은 장면을 가리지 않고 뜬다 — 실행도 장면을 떼고 싣는다(GAME-F5-03)
  for (const r of 행들) if (r.status === 'OK' && r.kind === 'POPUP') 줄들.push(`돌발 팝업: ${r.line}`);
  return { 줄들, 다찾음 };
}

// 서버 game-route 본문 상한(4MiB)과 같다 — 넘으면 자식이 고친 파일이다
const 맵상한 = 4_000_000;
const 쓰는법 = '쓰는 법: npx tsx scripts/authoring-game-route.ts <자료 폴더> <목표 열쇠…> [--from <출발 열쇠>] — 목표 열쇠는 state:<이름>=<값>,… 와 창 · 구역 열쇠 하나';

/** 0 길을 다 찾았다 · 1 길이 없는 목표가 있다(찾은 데까지 찍는다) · 2 부를 수 없다 */
export function 실행(인자: string[]): number {
  const [폴더, ...나머지] = 인자;
  const 앞 = 나머지.indexOf('--from');
  const 출발 = 앞 < 0 ? undefined : 나머지[앞 + 1];
  const 열쇠들 = 나머지.filter((_, i) => 앞 < 0 || (i !== 앞 && i !== 앞 + 1));
  const 자리들 = 열쇠들.filter((k) => !k.startsWith('state:'));
  const 상태 = [...new Set(열쇠들.flatMap(상태조각))];
  // 같은 이름에 값이 둘이면(레벨=1 · 레벨=2) 어느 쪽을 뜻했는지 모른다
  const 이름겹침 = new Set(상태.map(이름)).size < 상태.length;
  if (폴더 === undefined || (상태.length === 0 && 자리들.length === 0) || 자리들.length > 1 || 이름겹침 || (앞 >= 0 && 출발 === undefined)) {
    console.error(쓰는법);
    return 2;
  }
  const 글 = 안전히읽기(폴더, 게임자리.맵, 맵상한);
  if (글 === null) {
    console.error(`[경로 검색] ${폴더}/${게임자리.맵} 이 없다 — 에이전트가 조작 맵을 못 받았다. 목표를 폰에서 해 본다`);
    return 2;
  }
  const 행들 = 맵읽기(글);
  const 첫화면들 = 장면첫화면들(행들);
  if (출발 === undefined && 첫화면들.length !== 1) {
    console.error(
      `[경로 검색] 장면 첫 화면(game:<장면>)이 ${첫화면들.length === 0 ? '맵에 없다' : `여럿이다 — ${첫화면들.join(' · ')}`} — 로그인 직후 화면 열쇠를 --from 으로 준다`,
    );
    return 2;
  }
  const { 줄들, 다찾음 } = 경로(행들, { 상태, 자리: 자리들[0] ?? null }, 출발 ?? 첫화면들[0]!);
  console.log(줄들.join('\n'));
  return 다찾음 ? 0 : 1;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = 실행(process.argv.slice(2));
}

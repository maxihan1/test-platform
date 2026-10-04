// 화면 크롤러 — 작성 자식이 로그인 뒤 명령 한 번으로 돌린다. 링크만 따라가며 화면마다 ariaSnapshot · 입력칸 속성을 파일로 (도메인/작성 §3.6 「★ 역방향」)
// 실행: npx tsx scripts/authoring-crawl.ts <주소>... --out <폴더> [--state <로그인 상태 파일>] [--follow] [--max 100] [--minutes 10]
// 판정은 authoring-crawl-rules 의 순수 함수에 있다. 여기는 브라우저 · 파일만 다룬다. 계정 값은 읽지 않는다 — 로그인은 자식이 한다

import { existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

import { chromium, type BrowserContext, type Page } from '@playwright/test';

import { 견주기, 저장본모양, type 저장본 } from './authoring-screens-keep.js';
import { type 목록항목, 걸러진까닭, 글자지문, 둘째장볼까, 로그인풀렸나, 목록고르기, 부모키, 주소고르기, 지문, 틀키 } from './authoring-crawl-rules.js';

const 간격 = 1_000; // 운영 서버도 돈다 — 한 장씩, 1초 이상 띄운다
const 부모상한 = 20; // 숫자가 아닌 상세(슬러그)가 장수를 다 먹지 않게. 그누보드 `/bbs/*.php` 처럼 한 폴더에 화면이 몰린 사이트가 있어 넉넉히
const 구조상한 = 40_000; // 무한 목록이 수천 줄이 되지 않게
const 연속오류상한 = 3; // 429 · 5xx · 연결 실패가 이어지면 그 서버를 그만 두드린다
const 장상한 = 100;
const 분상한 = 10;

type 상태 = '로그아웃' | '로그인';
interface 인자 {
  주소들: string[];
  출력: string;
  상태파일: string | null;
  따라가기: boolean;
  최대: number;
  분: number;
  저장본: 저장본 | null;
}

function 그만(말: string): never {
  console.error(`크롤: ${말}`);
  process.exit(2);
}

function 인자읽기(argv: string[]): 인자 {
  const 주소들: string[] = [];
  const 값 = (이름: string): string | undefined => {
    const i = argv.indexOf(이름);
    return i < 0 ? undefined : argv[i + 1];
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a.startsWith('--')) {
      if (a !== '--follow') i++;
      continue;
    }
    주소들.push(a);
  }
  const 출력 = 값('--out');
  if (주소들.length === 0 || 출력 === undefined) 그만('쓰임: npx tsx scripts/authoring-crawl.ts <주소>... --out <폴더> [--state <파일>] [--follow] [--max 100] [--minutes 10]');
  // 값이 틀리면 상한 · 마감이 꺼진다 — 거절하고, 상한을 넘는 값은 상한으로 자른다
  const 수 = (이름: string, 기본: number, 상한: number): number => {
    const 글 = 값(이름);
    if (글 === undefined) return 기본;
    const n = Number(글);
    if (!Number.isFinite(n) || n < 1) 그만(`${이름} 값이 틀렸다: ${글}`);
    return Math.min(Math.floor(n), 상한);
  };
  const 상태파일 = 값('--state') ?? null;
  // 로그아웃 크롤을 다 돈 뒤에 죽지 않게 먼저 본다
  if (상태파일 !== null && !existsSync(상태파일)) 그만(`로그인 상태 파일이 없다: ${상태파일}`);
  // 저장본(에이전트가 자료 폴더 kept/ 에 넣어 준 것) — 링크 · 큰 파일 · 틀린 모양은 없는 것으로 (2026-10-04 · 바뀐 화면만 다시 훑는다)
  const 저장파일 = 값('--keep');
  let 저장: 저장본 | null = null;
  if (저장파일 !== undefined) {
    const 정보 = lstatSync(저장파일, { throwIfNoEntry: false });
    if (정보?.isFile() === true && 정보.size < 2_000_000) {
      try {
        저장 = 저장본모양(JSON.parse(readFileSync(저장파일, 'utf8')));
      } catch {
        저장 = null;
      }
    }
  }
  return { 주소들, 출력: resolve(출력), 상태파일, 따라가기: argv.includes('--follow'), 최대: 수('--max', 장상한, 장상한), 분: 수('--minutes', 분상한, 분상한), 저장본: 저장 };
}

interface 입력칸 { 종류: string; 이름: string; 라벨: string; 안내: string; 필수: boolean; 읽기전용: boolean; 최대글자: number | null; 최소글자: number | null; 형식: string | null }
interface 본화면 extends 목록항목 {
  최종: string;
  지문: string;
  글자지문: string;
  짧음: boolean;
  로그인풀림: boolean;
  입력칸: 입력칸[];
  링크수: number;
}
interface 판 {
  본: 본화면[];
  걸러짐: Map<string, { 글자: string; 까닭: string }>;
  잘림: number;
  연속오류: number;
  멈춘까닭: string | null;
}

const 쉬기 = (ms: number) => new Promise((r) => setTimeout(r, ms));

type 본것 = { 상태코드: number; 최종: string; 제목: string; 구조: string; 비밀번호칸: boolean; 입력칸: 입력칸[]; 링크: { href: string; text: string }[] };

/** 화면 하나 — 내려받기 · 다른 출처는 '건너뜀', 연결 실패 · 시간 초과는 '실패'(연속 오류로 센다) */
async function 보기(쪽: Page, 주소: string): Promise<본것 | '건너뜀' | '실패'> {
  try {
    const 응답 = await 쪽.goto(주소, { waitUntil: 'domcontentloaded', timeout: 15_000 });
    await 쪽.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined);
    const 최종 = 쪽.url();
    if (new URL(최종).origin !== new URL(주소).origin) return '건너뜀';
    const 구조 = await 쪽.locator('body').ariaSnapshot({ timeout: 10_000 });
    // 보이는 칸만 — 숨은 칸까지 세면 본인 확인 화면도 로그인 화면으로 보인다
    const 입력칸 = await 쪽.evaluate(() =>
      [...document.querySelectorAll('input, select, textarea')]
        .filter((el) => (el as HTMLInputElement).type !== 'hidden' && el.getClientRects().length > 0)
        .map((el) => {
          const e = el as HTMLInputElement;
          return {
            종류: e.tagName.toLowerCase() === 'input' ? e.type : e.tagName.toLowerCase(),
            이름: e.name || e.id || '',
            라벨: (e.labels?.[0]?.innerText ?? e.getAttribute('aria-label') ?? '').trim().slice(0, 40),
            안내: e.placeholder ?? '',
            필수: e.required,
            읽기전용: e.readOnly || e.disabled,
            최대글자: e.maxLength > 0 ? e.maxLength : null,
            최소글자: e.minLength > 0 ? e.minLength : null,
            형식: e.pattern || null,
          };
        }),
    );
    // 그림만 든 링크는 글자가 비어 있다 — 위험 글자를 놓치지 않게 alt · title 까지 본다
    const 링크 = await 쪽.evaluate(() =>
      [...document.querySelectorAll('a[href]')].map((a) => ({
        href: a.getAttribute('href') ?? '',
        text: [(a as HTMLElement).innerText, a.getAttribute('aria-label'), a.getAttribute('title'), ...[...a.querySelectorAll('img[alt]')].map((i) => i.getAttribute('alt'))]
          .filter(Boolean)
          .join(' ')
          .trim()
          .slice(0, 60),
      })),
    );
    return { 상태코드: 응답?.status() ?? 0, 최종, 제목: await 쪽.title(), 구조, 비밀번호칸: 입력칸.some((x) => x.종류 === 'password'), 입력칸, 링크 };
  } catch (e) {
    return /download/i.test(String(e)) ? '건너뜀' : '실패';
  }
}

const 칸줄 = (x: 입력칸): string =>
  `# 입력칸: ${x.종류} ${x.라벨 || x.이름 || x.안내}${x.필수 ? ' · 필수' : ''}${x.읽기전용 ? ' · 읽기 전용' : ''}${x.최대글자 === null ? '' : ` · 최대 ${x.최대글자}자`}${x.최소글자 === null ? '' : ` · 최소 ${x.최소글자}자`}${x.형식 === null ? '' : ` · 형식 ${x.형식}`}`;

async function 한상태(맥락: BrowserContext, 상태: 상태, a: 인자, 몫: { 장: number; 마감: number }, 판: 판): Promise<void> {
  const 쪽 = await 맥락.newPage();
  const 시작틀 = new Set(a.주소들.map(틀키));
  const 대기: string[] = a.주소들.map((x) => new URL(x).toString());
  // 숫자 값 인자로 화면을 가르는 틀은 둘째 장까지 연다 — 지문(구조)이 다르면 둘 다 남긴다
  const 틀들 = new Map<string, string[]>();
  const 연주소 = new Set<string>();
  const 더볼수 = (틀: string): number => (둘째장볼까(틀) ? 2 : 1);
  const 부모수 = new Map<string, number>();
  mkdirSync(join(a.출력, 상태), { recursive: true });

  while (대기.length > 0) {
    if (몫.장 <= 0) return void (판.멈춘까닭 ??= `${상태} 몫 ${a.최대}장`);
    if (Date.now() > 몫.마감) return void (판.멈춘까닭 ??= `${상태} 몫 시간`);
    if (판.연속오류 >= 연속오류상한) return void (판.멈춘까닭 ??= '서버 오류 · 연결 실패가 이어짐');
    const 주소 = 대기.shift()!;
    if (연주소.has(주소)) continue;
    const 틀 = 틀키(주소);
    const 앞지문 = 틀들.get(틀) ?? [];
    if (앞지문.length >= 더볼수(틀)) continue;
    const 부모 = 부모키(주소);
    if (앞지문.length === 0 && 부모 !== null && (부모수.get(부모) ?? 0) >= 부모상한 && !시작틀.has(틀)) {
      판.잘림++;
      continue;
    }

    연주소.add(주소);
    const 본 = await 보기(쪽, 주소);
    await 쉬기(간격);
    if (본 === '건너뜀') continue;
    if (본 === '실패') {
      판.연속오류++;
      continue;
    }
    판.연속오류 = 본.상태코드 === 429 || 본.상태코드 >= 500 ? 판.연속오류 + 1 : 0;
    몫.장--;
    const 이지문 = 지문(본.구조);
    if (앞지문.includes(이지문)) {
      틀들.set(틀, [...앞지문, 이지문]);
      continue; // 둘째 장이 같은 구조 — 같은 틀이다
    }
    틀들.set(틀, [...앞지문, 이지문]);
    if (앞지문.length === 0 && 부모 !== null) 부모수.set(부모, (부모수.get(부모) ?? 0) + 1);
    const 아이디칸 = 본.입력칸.some((x) => (x.종류 === 'text' || x.종류 === 'email') && !x.읽기전용);
    const 풀림 = 상태 === '로그인' && 로그인풀렸나({ 요청: 주소, 최종: 본.최종, 비밀번호칸: 본.비밀번호칸, 아이디칸 });
    const 파일 = join(상태, `${String(판.본.length + 1).padStart(3, '0')}.yml`);
    const 구조 = 본.구조.length > 구조상한 ? `${본.구조.slice(0, 구조상한)}\n# … 길어서 잘랐다` : 본.구조;
    // 입력칸 속성은 머리에 — 보조는 이 파일만 읽는다
    const 파일글 = [`# ${본.최종}`, ...본.입력칸.map(칸줄), 구조, ''].join('\n');
    writeFileSync(join(a.출력, 파일), 파일글);
    판.본.push({
      상태, 틀: 앞지문.length === 0 ? 틀 : `${틀} (구조 다름)`, 주소, 최종: 본.최종, 이름: 본.제목, 파일, 시작: 시작틀.has(틀),
      지문: 이지문, 글자지문: 글자지문(파일글), 짧음: 본.구조.length < 200, 로그인풀림: 풀림, 입력칸: 본.입력칸, 링크수: 본.링크.length,
    });
    // 로그인이 풀렸으면 더 돌지 않는다 — 같은 상태 파일을 쓰는 보조도 튕긴다. 자식이 다시 로그인한다
    if (풀림) return void (판.멈춘까닭 ??= '로그인이 풀림');
    if (!a.따라가기) continue;
    for (const l of 본.링크) {
      const 다음 = 주소고르기(l.href, l.text, 본.최종);
      if (다음 !== null) {
        const 다음틀 = 틀키(다음);
        if (!연주소.has(다음) && (틀들.get(다음틀)?.length ?? 0) < 더볼수(다음틀)) 대기.push(다음);
        continue;
      }
      const 까닭 = 걸러진까닭(l.href, l.text, 본.최종);
      if (까닭 !== null) 판.걸러짐.set(new URL(l.href, 본.최종).toString(), { 글자: l.text, 까닭 });
    }
  }
}

function 남기기(a: 인자, 판: 판, 시작: number): void {
  const 고른 = 목록고르기(판.본.filter((x) => !x.로그인풀림)) as 본화면[];
  const 견줌 = a.저장본 === null ? null : 견주기(고른, a.저장본, new Date().toISOString().slice(0, 10));
  const 목록 = 고른.map((본) => ({
    주소: 본.주소, 이름: 본.이름, 상태: 본.상태, 파일: 본.파일, 틀: 본.틀, 지문: 본.지문, 글자지문: 본.글자지문,
    ...(본.짧음 ? { 짧음: true } : {}),
    ...(견줌?.표시.get(본.주소) ?? {}),
  }));
  // 에이전트가 저장본을 갈 때 본다 — 다 봤을 때만 이번에 못 본 화면을 지운다
  writeFileSync(join(a.출력, 'summary.json'), JSON.stringify({ 멈춘까닭: 판.멈춘까닭, 따라가기: a.따라가기 }));
  const 걸러짐 = [...판.걸러짐].map(([주소, v]) => ({ 주소, ...v }));
  writeFileSync(join(a.출력, 'index.json'), JSON.stringify({ 화면: 판.본, 걸러짐 }, null, 1));
  writeFileSync(join(a.출력, 'list.json'), JSON.stringify(목록, null, 1));
  const 셈 = (s: string) => 판.본.filter((x) => x.상태 === s).length;
  console.log(
    `크롤: 로그아웃 ${셈('로그아웃')}장 · 로그인 ${셈('로그인')}장 · 목록 ${목록.length}장 · 빈 화면 의심 ${목록.filter((x) => x.짧음).length}장` +
      ` · 걸러진 링크 ${걸러짐.length}개 · 부모 상한으로 안 연 것 ${판.잘림}개` +
      (견줌 === null
        ? ' · 저장본 없음'
        : ` · 저장본 같음 ${목록.filter((x) => x.저장본 === '같음').length} · 바뀜 ${목록.filter((x) => x.저장본 === '바뀜').length} · 새 화면 ${목록.filter((x) => x.저장본 === '새 화면').length}` +
          ` · 저장본에 있는데 못 본 화면 ${견줌.못본.length}${견줌.가장오래된 === null ? '' : ` · 가장 오래된 것 ${견줌.가장오래된}일`}`) +
      ` · 로그인 풀림 ${판.본.some((x) => x.로그인풀림) ? '있음 — 다시 로그인해 상태 파일을 새로 만든다' : '없음'}` +
      ` · 멈춘 까닭 ${판.멈춘까닭 ?? '다 봄'} · ${Math.round((Date.now() - 시작) / 1000)}초 · ${relative(process.cwd(), join(a.출력, 'list.json'))}`,
  );
}

async function main(): Promise<void> {
  const a = 인자읽기(process.argv.slice(2));
  // 작업 트리 안에 쓰면 올리기에 섞인다 — 자료 폴더(작업 트리 밖)만 받는다
  if (a.출력 === process.cwd() || a.출력.startsWith(process.cwd() + sep)) 그만(`--out 이 작업 트리 안이다 — 트리 밖 폴더를 준다: ${a.출력}`);
  mkdirSync(a.출력, { recursive: true });
  const 시작 = Date.now();
  const 판: 판 = { 본: [], 걸러짐: new Map(), 잘림: 0, 연속오류: 0, 멈춘까닭: null };
  const 상태들: 상태[] = a.상태파일 === null ? ['로그아웃'] : ['로그아웃', '로그인'];
  const 브라우저 = await chromium.launch();
  try {
    // 장수 · 시간을 상태마다 나눈다 — 로그아웃 크롤이 다 쓰면 로그인 화면을 하나도 못 본다
    for (const [i, 상태] of 상태들.entries()) {
      const 몫 = { 장: Math.floor(a.최대 / 상태들.length), 마감: 시작 + ((i + 1) * a.분 * 60_000) / 상태들.length };
      const 맥락 = await 브라우저.newContext(상태 === '로그인' && a.상태파일 !== null ? { storageState: a.상태파일 } : {});
      // 그림 · 글꼴 · 영상은 받지 않는다 — 구조만 본다
      await 맥락.route('**/*', (r) => (['image', 'font', 'media'].includes(r.request().resourceType()) ? r.abort() : r.continue()));
      판.연속오류 = 0;
      await 한상태(맥락, 상태, a, 몫, 판);
      await 맥락.close();
    }
  } finally {
    await 브라우저.close();
    남기기(a, 판, 시작); // 도중에 죽어도 본 것까지는 남긴다
  }
}

await main();

// 화면 크롤러 — 작성 자식이 로그인 뒤 명령 한 번으로 돌린다. 링크만 따라가며 화면마다 ariaSnapshot · 입력칸 속성을 파일로 (도메인/작성 §3.6 「★ 역방향」)
// 실행: npx tsx scripts/authoring-crawl.ts <주소>... --out <폴더> [--state <로그인 상태 파일>] [--follow] [--max 100] [--minutes 10]
// 판정은 authoring-crawl-rules 의 순수 함수에 있다. 여기는 브라우저 · 파일만 다룬다. 계정 값은 읽지 않는다 — 로그인은 자식이 한다

import { mkdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

import { chromium, type BrowserContext, type Page } from '@playwright/test';

import { type 목록항목, 로그인풀렸나, 목록고르기, 부모키, 주소고르기, 지문, 틀키 } from './authoring-crawl-rules.js';

const 간격 = 1_000; // 운영 서버도 돈다 — 한 장씩, 1초 이상 띄운다
const 부모상한 = 8; // 숫자가 아닌 상세(슬러그)가 장수를 다 먹지 않게
const 구조상한 = 40_000; // 무한 목록이 수천 줄이 되지 않게
const 연속오류상한 = 3; // 429 · 5xx 가 이어지면 그 서버를 그만 두드린다

interface 인자 {
  주소들: string[];
  출력: string;
  상태파일: string | null;
  따라가기: boolean;
  최대: number;
  분: number;
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
  if (주소들.length === 0 || 출력 === undefined) {
    console.error('쓰임: npx tsx scripts/authoring-crawl.ts <주소>... --out <폴더> [--state <파일>] [--follow] [--max 100] [--minutes 10]');
    process.exit(2);
  }
  return { 주소들, 출력: resolve(출력), 상태파일: 값('--state') ?? null, 따라가기: argv.includes('--follow'), 최대: Number(값('--max') ?? 100), 분: Number(값('--minutes') ?? 10) };
}

interface 본화면 extends 목록항목 {
  최종: string;
  지문: string;
  짧음: boolean;
  로그인풀림: boolean;
  입력칸: unknown[];
  링크수: number;
}

const 쉬기 = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 화면 하나 — 실패하면 null(내려받기 시작 · 다른 출처 · 시간 초과) */
async function 보기(쪽: Page, 주소: string): Promise<{ 상태코드: number; 최종: string; 제목: string; 구조: string; 비밀번호칸: boolean; 아이디칸: boolean; 입력칸: { 종류: string }[]; 링크: { href: string; text: string }[] } | null> {
  try {
    const 응답 = await 쪽.goto(주소, { waitUntil: 'domcontentloaded', timeout: 15_000 });
    await 쪽.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined);
    const 최종 = 쪽.url();
    if (new URL(최종).origin !== new URL(주소).origin) return null;
    const 구조 = await 쪽.locator('body').ariaSnapshot({ timeout: 10_000 });
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
            최대글자: e.maxLength > 0 ? e.maxLength : null,
            최소글자: e.minLength > 0 ? e.minLength : null,
            형식: e.pattern || null,
          };
        }),
    );
    const 링크 = await 쪽.evaluate(() =>
      [...document.querySelectorAll('a[href]')].map((a) => ({ href: a.getAttribute('href') ?? '', text: ((a as HTMLElement).innerText || a.getAttribute('aria-label') || '').trim().slice(0, 40) })),
    );
    return { 상태코드: 응답?.status() ?? 0, 최종, 제목: await 쪽.title(), 구조, 비밀번호칸: (await 쪽.locator('input[type=password]').count()) > 0,
      // 화면에 보이는 입력칸 목록으로 본다 — 숨은 칸까지 세면 본인 확인 화면도 로그인 화면으로 보인다
      아이디칸: 입력칸.some((x) => x.종류 === 'text' || x.종류 === 'email'), 입력칸, 링크 };
  } catch {
    return null;
  }
}

async function 한상태(
  맥락: BrowserContext,
  상태: '로그아웃' | '로그인',
  a: 인자,
  판: { 남은: number; 마감: number; 연속오류: number; 본: 본화면[]; 멈춘까닭: string | null },
): Promise<void> {
  const 쪽 = await 맥락.newPage();
  const 시작틀 = new Set(a.주소들.map(틀키));
  const 대기: string[] = [...a.주소들];
  const 본틀 = new Set<string>();
  const 부모수 = new Map<string, number>();
  mkdirSync(join(a.출력, 상태), { recursive: true });

  while (대기.length > 0) {
    if (판.남은 <= 0) return void (판.멈춘까닭 ??= `최대 ${a.최대}장`);
    if (Date.now() > 판.마감) return void (판.멈춘까닭 ??= `${a.분}분`);
    if (판.연속오류 >= 연속오류상한) return void (판.멈춘까닭 ??= '서버 오류가 이어짐(429 · 5xx)');
    const 주소 = 대기.shift()!;
    const 틀 = 틀키(주소);
    if (본틀.has(틀)) continue;
    const 부모 = 부모키(주소);
    if (부모 !== null && (부모수.get(부모) ?? 0) >= 부모상한 && !시작틀.has(틀)) continue;
    본틀.add(틀);
    if (부모 !== null) 부모수.set(부모, (부모수.get(부모) ?? 0) + 1);

    const 본것 = await 보기(쪽, 주소);
    await 쉬기(간격);
    if (본것 === null) continue;
    판.연속오류 = 본것.상태코드 === 429 || 본것.상태코드 >= 500 ? 판.연속오류 + 1 : 0;
    판.남은--;
    const 풀림 = 상태 === '로그인' && 로그인풀렸나({ 요청: 주소, 최종: 본것.최종, 비밀번호칸: 본것.비밀번호칸, 아이디칸: 본것.아이디칸 });
    const 파일 = join(상태, `${String(판.본.length + 1).padStart(3, '0')}.yml`);
    const 구조 = 본것.구조.length > 구조상한 ? `${본것.구조.slice(0, 구조상한)}\n# … 길어서 잘랐다` : 본것.구조;
    writeFileSync(join(a.출력, 파일), `# ${본것.최종}\n${구조}\n`);
    판.본.push({
      상태, 틀, 주소, 최종: 본것.최종, 이름: 본것.제목, 파일, 시작: 시작틀.has(틀),
      지문: 지문(본것.구조), 짧음: 본것.구조.length < 200, 로그인풀림: 풀림, 입력칸: 본것.입력칸, 링크수: 본것.링크.length,
    });
    // 로그인이 풀렸으면 더 돌지 않는다 — 같은 상태 파일을 쓰는 보조도 튕긴다. 자식이 다시 로그인한다
    if (풀림) return void (판.멈춘까닭 ??= '로그인이 풀림');
    if (!a.따라가기) continue;
    for (const l of 본것.링크) {
      const 다음 = 주소고르기(l.href, l.text, 본것.최종);
      if (다음 !== null && !본틀.has(틀키(다음))) 대기.push(다음);
    }
  }
}

async function main(): Promise<void> {
  const a = 인자읽기(process.argv.slice(2));
  // 작업 트리 안에 쓰면 올리기에 섞인다 — 자료 폴더(작업 트리 밖)만 받는다
  if (a.출력 === process.cwd() || a.출력.startsWith(process.cwd() + sep)) {
    console.error(`크롤: --out 이 작업 트리 안이다 — 트리 밖 폴더를 준다: ${a.출력}`);
    process.exit(2);
  }
  mkdirSync(a.출력, { recursive: true });
  const 시작 = Date.now();
  const 판 = { 남은: a.최대, 마감: 시작 + a.분 * 60_000, 연속오류: 0, 본: [] as 본화면[], 멈춘까닭: null as string | null };
  const 브라우저 = await chromium.launch();
  try {
    const 상태들: ('로그아웃' | '로그인')[] = a.상태파일 === null ? ['로그아웃'] : ['로그아웃', '로그인'];
    for (const 상태 of 상태들) {
      const 맥락 = await 브라우저.newContext(상태 === '로그인' && a.상태파일 !== null ? { storageState: a.상태파일 } : {});
      // 그림 · 글꼴 · 영상은 받지 않는다 — 구조만 본다
      await 맥락.route('**/*', (r) => (['image', 'font', 'media'].includes(r.request().resourceType()) ? r.abort() : r.continue()));
      await 한상태(맥락, 상태, a, 판);
      await 맥락.close();
    }
  } finally {
    await 브라우저.close();
  }

  const 목록 = 목록고르기(판.본.filter((x) => !x.로그인풀림)).map((x) => {
    const 본 = x as 본화면;
    return { 주소: 본.주소, 이름: 본.이름, 상태: 본.상태, 파일: 본.파일, ...(본.짧음 ? { 짧음: true } : {}) };
  });
  writeFileSync(join(a.출력, 'index.json'), JSON.stringify(판.본, null, 1));
  writeFileSync(join(a.출력, 'list.json'), JSON.stringify(목록, null, 1));
  const 셈 = (s: string) => 판.본.filter((x) => x.상태 === s).length;
  console.log(
    `크롤: 로그아웃 ${셈('로그아웃')}장 · 로그인 ${셈('로그인')}장 · 목록 ${목록.length}장 · 빈 화면 의심 ${목록.filter((x) => x.짧음).length}장` +
      ` · 로그인 풀림 ${판.본.some((x) => x.로그인풀림) ? '있음 — 다시 로그인해 상태 파일을 새로 만든다' : '없음'}` +
      ` · 멈춘 까닭 ${판.멈춘까닭 ?? '다 봄'} · ${Math.round((Date.now() - 시작) / 1000)}초 · ${relative(process.cwd(), join(a.출력, 'list.json'))}`,
  );
}

await main();

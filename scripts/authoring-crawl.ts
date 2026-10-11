// 화면 크롤러 — 작성 자식이 로그인 뒤 명령 한 번으로 돌린다. 링크를 따라가고 버튼을 눌러 화면마다 ariaSnapshot · 입력칸 속성 · 화면 연결을 파일로 (도메인/작성 §3.6 「★ 역방향」 · 「★ 표준 기획서」)
// 실행: npx tsx scripts/authoring-crawl.ts <주소>... --out <폴더> [--state <로그인 상태 파일>] [--login <로그인 스크립트>] [--follow] [--max 100] [--minutes 10] [--exclude <경로>]... [--covered <파일>]
// 여기는 인자 · 결과 파일만. 상태 하나 도는 것은 authoring-crawl-state, 판정은 authoring-crawl-rules · authoring-crawl-press, 쪽 다루기는 authoring-crawl-page. 계정 값은 읽지 않는다 — 로그인은 자식의 스크립트가 한다

import { existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

import { chromium } from '@playwright/test';

import { type 본화면, type 상태, type 인자, type 판, 한상태 } from './authoring-crawl-state.js';
import { 덮은틀읽기, 덮음인가, 목록고르기, 빼는주소인가, 뺄경로읽기, 연결모으기 } from './authoring-crawl-rules.js';
import { 견주기, 저장본모양, type 저장본 } from './authoring-screens-keep.js';

const 장상한 = 100;
const 분상한 = 10;

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
  if (주소들.length === 0 || 출력 === undefined) {
    그만('쓰임: npx tsx scripts/authoring-crawl.ts <주소>... --out <폴더> [--state <파일>] [--login <스크립트>] [--follow] [--max 100] [--minutes 10] [--exclude <경로>]... [--covered <파일>]');
  }
  // 값이 틀리면 상한 · 마감이 꺼진다 — 거절하고, 상한을 넘는 값은 상한으로 자른다
  const 수 = (이름: string, 기본: number, 상한: number): number => {
    const 글 = 값(이름);
    if (글 === undefined) return 기본;
    const n = Number(글);
    if (!Number.isFinite(n) || n < 1) 그만(`${이름} 값이 틀렸다: ${글}`);
    return Math.min(Math.floor(n), 상한);
  };
  const 뺄 = 뺄경로읽기(argv);
  if (typeof 뺄 === 'string') 그만(뺄);
  const 상태파일 = 값('--state') ?? null;
  // 로그아웃 크롤을 다 돈 뒤에 죽지 않게 먼저 본다
  if (상태파일 !== null && !existsSync(상태파일)) 그만(`로그인 상태 파일이 없다: ${상태파일}`);
  const 로그인 = 값('--login') ?? null;
  if (로그인 !== null && !existsSync(로그인)) 그만(`로그인 스크립트가 없다: ${로그인}`);
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
  // 덮은 틀(에이전트가 자료 폴더에 넣은 covered.json) — 링크 · 큰 파일 · 틀린 모양은 없는 것으로
  const 덮은파일 = 값('--covered');
  let 덮은틀: Set<string> | null = null;
  if (덮은파일 !== undefined) {
    const 정보 = lstatSync(덮은파일, { throwIfNoEntry: false });
    if (정보?.isFile() === true && 정보.size < 2_000_000) 덮은틀 = 덮은틀읽기(readFileSync(덮은파일, 'utf8'));
  }
  // 견주기 전에 뺀다 — 안 그러면 제외를 켠 첫 실행에서 그 경로의 저장 기록이 전부 「저장본에 있는데 못 본 화면」으로 뜬다 (#153)
  if (저장 !== null) 저장 = { ...저장, 항목: 저장.항목.filter((x) => !빼는주소인가(x.주소, 뺄)) };
  return {
    주소들, 출력: resolve(출력), 상태파일, 로그인: 상태파일 === null ? null : 로그인, 따라가기: argv.includes('--follow'),
    최대: 수('--max', 장상한, 장상한), 분: 수('--minutes', 분상한, 분상한), 저장본: 저장, 뺄, 덮은틀,
  };
}

// 자식이 이 말을 보고 다시 로그인한다(scan-fanout §2) — 크롤러가 이미 다시 로그인했으면 상태 파일이 새것이라 「있음」으로 쓰지 않는다
const 풀림말 = (판: 판): string =>
  판.멈춘까닭 === '로그인이 풀림' || 판.멈춘까닭 === '로그아웃 뒤 다시 로그인 못 함'
    ? '있음 — 다시 로그인해 상태 파일을 새로 만든다'
    : 판.본.some((x) => x.로그인풀림)
      ? '있었음 — 크롤러가 다시 로그인했거나 로그인 칸이 있는 화면이다(상태 파일 그대로 쓴다)'
      : '없음';

function 남기기(a: 인자, 판: 판, 시작: number, 돈: { 상태들: string[]; 예외: boolean }): void {
  const 고른 = 목록고르기(판.본.filter((x) => !x.로그인풀림)) as 본화면[];
  const 견줌 = a.저장본 === null ? null : 견주기(고른, a.저장본, new Date().toISOString().slice(0, 10));
  const 목록 = 고른.map((본) => ({
    주소: 본.주소, 이름: 본.이름, 상태: 본.상태, 파일: 본.파일, 틀: 본.틀, 지문: 본.지문, 글자지문: 본.글자지문,
    ...(본.짧음 ? { 짧음: true } : {}),
    ...(덮음인가(본.틀, a.덮은틀) ? { 덮음: true } : {}),
    ...(견줌?.표시.get(`${본.상태} ${본.주소}`) ?? {}),
  }));
  // 에이전트가 저장본을 갈 때 본다 — 다 봤을 때만 이번에 못 본 화면을 지운다
  writeFileSync(join(a.출력, 'summary.json'), JSON.stringify({ 멈춘까닭: 판.멈춘까닭, 따라가기: a.따라가기, 상태들: 돈.상태들, 예외: 돈.예외 }));
  const 걸러짐 = [...판.걸러짐].map(([주소, v]) => ({ 주소, ...v }));
  const 뺀수 = 걸러짐.filter((x) => x.까닭 === '뺄 경로').length;
  writeFileSync(join(a.출력, 'index.json'), JSON.stringify({ 화면: 판.본, 걸러짐 }, null, 1));
  writeFileSync(join(a.출력, 'list.json'), JSON.stringify(목록, null, 1));
  // 화면 연결 — 자식은 읽지 않는다(대화 토큰). 에이전트가 화면 기록을 올릴 때 같이 올린다 (PRD-F6-02)
  const 연결들 = 연결모으기(판.본, 판.연결, 고른);
  writeFileSync(join(a.출력, 'links.json'), JSON.stringify(연결들));
  const 셈 = (s: string) => 판.본.filter((x) => x.상태 === s).length;
  console.log(
    `크롤: 로그아웃 ${셈('로그아웃')}장 · 로그인 ${셈('로그인')}장 · 목록 ${목록.length}장 · 빈 화면 의심 ${목록.filter((x) => x.짧음).length}장` +
      (a.덮은틀 === null ? '' : ` · PRD 에 있는 화면 ${고른.filter((x) => 덮음인가(x.틀, a.덮은틀)).length}장`) +
      ` · 걸러진 링크 ${걸러짐.length - 뺀수}개 · 뺄 경로 ${a.뺄.length}개(안 연 주소 ${뺀수}개) · 부모 상한으로 안 연 것 ${판.잘림}개` +
      ` · 누를 것 ${판.누를것}개 중 ${판.누름}개 누름 · 화면 연결 ${연결들.reduce((n, x) => n + x.연결.length, 0)}개 · 다시 로그인 ${판.다시로그인}번` +
      (a.주소들.some((x) => 빼는주소인가(x, a.뺄)) ? ' · ⚠️ 시작 주소가 뺄 경로 안이다 — 서비스 설정을 고친다' : '') +
      (견줌 === null
        ? ' · 저장본 없음'
        : ` · 저장본 같음 ${목록.filter((x) => x.저장본 === '같음').length} · 바뀜 ${목록.filter((x) => x.저장본 === '바뀜').length} · 새 화면 ${목록.filter((x) => x.저장본 === '새 화면').length}` +
          ` · 저장본에 있는데 못 본 화면 ${견줌.못본.length}${견줌.가장오래된 === null ? '' : ` · 가장 오래된 것 ${견줌.가장오래된}일`}`) +
      ` · 로그인 풀림 ${풀림말(판)}` +
      ` · 멈춘 까닭 ${판.멈춘까닭 ?? '다 봄'} · ${Math.round((Date.now() - 시작) / 1000)}초 · ${relative(process.cwd(), join(a.출력, 'list.json'))}`,
  );
}

async function main(): Promise<void> {
  const a = 인자읽기(process.argv.slice(2));
  // 작업 트리 안에 쓰면 올리기에 섞인다 — 자료 폴더(작업 트리 밖)만 받는다
  if (a.출력 === process.cwd() || a.출력.startsWith(process.cwd() + sep)) 그만(`--out 이 작업 트리 안이다 — 트리 밖 폴더를 준다: ${a.출력}`);
  mkdirSync(a.출력, { recursive: true });
  const 시작 = Date.now();
  const 판: 판 = { 본: [], 연결: new Map(), 걸러짐: new Map(), 잘림: 0, 연속오류: 0, 멈춘까닭: null, 누를것: 0, 누름: 0, 다시로그인: 0 };
  const 상태들: 상태[] = a.상태파일 === null ? ['로그아웃'] : ['로그아웃', '로그인'];
  const 브라우저 = await chromium.launch();
  // 끝까지 돈 상태와 예외 — 에이전트가 저장본에서 못 본 화면을 지울지 이것으로 정한다
  const 돈 = { 상태들: [] as string[], 예외: false };
  try {
    // 장수 · 시간을 상태마다 나눈다 — 로그아웃 크롤이 다 쓰면 로그인 화면을 하나도 못 본다
    for (const [i, 상태] of 상태들.entries()) {
      const 몫 = { 장: Math.floor(a.최대 / 상태들.length), 마감: 시작 + ((i + 1) * a.분 * 60_000) / 상태들.length };
      판.연속오류 = 0;
      await 한상태(브라우저, 상태, a, 몫, 판);
      돈.상태들.push(상태);
    }
  } catch (e) {
    돈.예외 = true;
    throw e;
  } finally {
    await 브라우저.close();
    남기기(a, 판, 시작, 돈); // 도중에 죽어도 본 것까지는 남긴다
  }
}

await main();

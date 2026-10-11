// 크롤러의 상태 하나(로그아웃 · 로그인) — 링크 화면을 먼저 다 보고 남은 시간에 버튼을 누른다. 로그아웃 · 로그인 풀림 뒤 다시 로그인 (도메인/작성 §3.6 「★ 표준 기획서」 「화면 기록과 크롤러」)
// 껍데기 authoring-crawl.ts 가 부른다. 판정은 authoring-crawl-rules · authoring-crawl-press, 쪽 다루기는 authoring-crawl-page
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Browser, BrowserContext, Page } from '@playwright/test';

import { 칸줄, 누르기, 보기, 읽기, 열기, 창수, 확인창누르기, 후보모으기, type 본것 } from './authoring-crawl-page.js';
import { type 누름종류, 누를까, 누름키, 로그아웃인가, 연결이름, 탈퇴말인가, 탈퇴주소인가 } from './authoring-crawl-press.js';
import { type 목록항목, 걸러진까닭, 글자지문, 둘째장볼까, 로그인풀렸나, 부모키, 빼는주소인가, 주소고르기, 지문, 틀키 } from './authoring-crawl-rules.js';
import type { 저장본 } from './authoring-screens-keep.js';

const 간격 = 1_000; // 운영 서버도 돈다 — 한 장씩, 1초 이상 띄운다
const 부모상한 = 20; // 숫자가 아닌 상세(슬러그)가 장수를 다 먹지 않게. 그누보드 `/bbs/*.php` 처럼 한 폴더에 화면이 몰린 사이트가 있어 넉넉히
const 구조상한 = 40_000; // 무한 목록이 수천 줄이 되지 않게
const 연속오류상한 = 3; // 429 · 5xx · 연결 실패가 이어지면 그 서버를 그만 두드린다
const 화면누름상한 = 30; // 버튼이 수백 개인 화면 하나가 시간을 다 먹지 않게
const 다시로그인상한 = 3; // 누를 때마다 로그아웃되는 사이트에서 돌고 돌지 않게
const 연결상한 = 1_000; // 화면 하나에서 나간 연결 — 서버 상한과 같다(§7 PUT …/screens)

export type 상태 = '로그아웃' | '로그인';
export interface 인자 {
  주소들: string[];
  출력: string;
  상태파일: string | null;
  /** 자식의 로그인 스크립트 — 로그아웃 · 로그인 풀림 뒤 이것을 다시 돌려 상태 파일을 새로 만든다 (PRD-F6-02) */
  로그인: string | null;
  따라가기: boolean;
  최대: number;
  분: number;
  저장본: 저장본 | null;
  /** 서비스 설정의 훑지 않을 경로 — 이 아래 주소는 열지 않는다 (#153) */
  뺄: string[];
}

export interface 본화면 extends 목록항목 {
  최종: string;
  지문: string;
  글자지문: string;
  짧음: boolean;
  로그인풀림: boolean;
  입력칸: 본것['입력칸'];
  링크수: number;
}
export interface 연결 { to: string; via: string }
export interface 판 {
  본: 본화면[];
  /** 본 화면 번호 → 나간 연결(키 `to via`) */
  연결: Map<number, Map<string, 연결>>;
  걸러짐: Map<string, { 글자: string; 까닭: string }>;
  잘림: number;
  연속오류: number;
  멈춘까닭: string | null;
  누를것: number;
  누름: number;
  다시로그인: number;
}
interface 누를일 { 본번: number; 주소: string; 틀: string; 키: string; 이름: string; 종류: 누름종류; 로그아웃: boolean; 탈퇴: boolean }

const 쉬기 = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function 새쪽(브라우저: Browser, 상태: 상태, a: 인자): Promise<{ 맥락: BrowserContext; 쪽: Page }> {
  const 맥락 = await 브라우저.newContext(상태 === '로그인' && a.상태파일 !== null ? { storageState: a.상태파일 } : {});
  // 그림 · 글꼴 · 영상은 받지 않는다 — 구조만 본다
  await 맥락.route('**/*', (r) => (['image', 'font', 'media'].includes(r.request().resourceType()) ? r.abort() : r.continue()));
  const 쪽 = await 맥락.newPage();
  // 브라우저 확인 창은 늘 취소한다 — 탈퇴 · 삭제의 마지막 확인일 수 있다. 떠나기 확인만 받아 다음 화면으로 간다
  쪽.on('dialog', (d) => void (d.type() === 'beforeunload' ? d.accept() : d.dismiss()).catch(() => undefined));
  // 누르기는 한 쪽에서만 — 스크립트가 띄운 새 창은 닫는다
  맥락.on('page', (p) => void p.close().catch(() => undefined));
  return { 맥락, 쪽 };
}

/**
 * 자식의 로그인 스크립트를 다시 돈다 — 계정은 그 안에서 process.env 로 읽고 입력 직전 출처를 본다(tpx-author reverse.md §2).
 * 그 스크립트가 상태 파일을 새로 써야 한다 — 안 바뀌었으면 실패로 본다. 실패하면 까닭(비밀번호는 가림), 되면 null
 */
function 로그인돌리기(스크립트: string, 상태파일: string): string | null {
  const 전 = statSync(상태파일, { throwIfNoEntry: false })?.mtimeMs ?? 0;
  const r = spawnSync(process.execPath, ['--input-type=module'], { input: readFileSync(스크립트), cwd: process.cwd(), env: process.env, timeout: 90_000, encoding: 'utf8' });
  if (r.status !== 0) {
    const 비밀 = process.env.TARGET_LOGIN_PASSWORD;
    const 끝줄 = `${r.stderr ?? ''}\n${r.stdout ?? ''}`.split('\n').map((x) => x.trim()).filter(Boolean).at(-1) ?? '';
    return `로그인 스크립트가 실패했다(종료 코드 ${r.status ?? '시간 초과'})${끝줄 === '' ? '' : ` — ${(비밀 ? 끝줄.split(비밀).join('••••••') : 끝줄).slice(0, 200)}`}`;
  }
  if ((statSync(상태파일, { throwIfNoEntry: false })?.mtimeMs ?? 0) <= 전) return '상태 파일이 새로 써지지 않았다 — 로그인 스크립트가 --state 와 같은 파일에 쓰는지 본다';
  return null;
}

export async function 한상태(브라우저: Browser, 상태: 상태, a: 인자, 몫: { 장: number; 마감: number }, 판: 판): Promise<void> {
  let { 맥락, 쪽 } = await 새쪽(브라우저, 상태, a);
  const 출처 = new URL(a.주소들[0]!).origin;
  const 시작틀 = new Set(a.주소들.map(틀키));
  const 대기: string[] = a.주소들.map((x) => new URL(x).toString());
  // 숫자 값 인자로 화면을 가르는 틀은 둘째 장까지 연다 — 지문(구조)이 다르면 둘 다 남긴다
  const 틀들 = new Map<string, string[]>();
  const 연주소 = new Set<string>();
  const 더볼수 = (틀: string): number => (둘째장볼까(틀) ? 2 : 1);
  const 부모수 = new Map<string, number>();
  const 누를것: 누를일[] = [];
  const 넣은키 = new Set<string>();
  // 탈퇴 낱말로 들어선 화면 — 그 안에서는 아무것도 누르지 않는다
  const 탈퇴틀 = new Set<string>();
  const 다시본 = new Set<string>();
  mkdirSync(join(a.출력, 상태), { recursive: true });

  const 이을 = (본번: number, 틀: string, 이름: string, 종류: 누름종류): void => {
    const 나 = 판.본[본번]!;
    if (틀 === 틀키(나.주소) || 틀 === 틀키(나.최종)) return; // 제 화면(리다이렉트로 간 곳 포함)
    const 칸 = 판.연결.get(본번) ?? new Map<string, 연결>();
    const via = 연결이름(종류, 이름);
    if (칸.size >= 연결상한) return;
    칸.set(`${틀} ${via}`, { to: 틀, via });
    판.연결.set(본번, 칸);
  };

  // 다시 로그인 — 로그인 판에서만, 스크립트가 있을 때만, 세 번까지. 다 썼으면 로그아웃도 안 누른다(누르면 그 상태 크롤이 거기서 멈춘다)
  const 로그인남음 = (): boolean => 상태 === '로그인' && a.로그인 !== null && a.상태파일 !== null && 판.다시로그인 < 다시로그인상한;
  const 다시로그인 = async (): Promise<boolean> => {
    if (!로그인남음()) return false;
    판.다시로그인++;
    await 맥락.close();
    const 까닭 = 로그인돌리기(a.로그인!, a.상태파일!);
    if (까닭 !== null) {
      console.error(`크롤: 다시 로그인 못 함 — ${까닭}`);
      return false;
    }
    ({ 맥락, 쪽 } = await 새쪽(브라우저, 상태, a));
    return true;
  };

  /** 지금 쪽에 열린 화면을 남긴다 — 둘째 장이 같은 구조면 안 남긴다. 로그인이 풀렸으면 '풀림' */
  const 남기기 = async (요청: string, 틀: string, 본: 본것): Promise<'풀림' | 'ok'> => {
    const 앞지문 = 틀들.get(틀) ?? [];
    const 부모 = 부모키(요청);
    몫.장--;
    const 이지문 = 지문(본.구조);
    틀들.set(틀, [...앞지문, 이지문]);
    if (앞지문.includes(이지문)) return 'ok'; // 둘째 장이 같은 구조 — 같은 틀이다
    if (앞지문.length === 0 && 부모 !== null) 부모수.set(부모, (부모수.get(부모) ?? 0) + 1);
    const 아이디칸 = 본.입력칸.some((x) => (x.종류 === 'text' || x.종류 === 'email') && !x.읽기전용);
    const 풀림 = 상태 === '로그인' && 로그인풀렸나({ 요청, 최종: 본.최종, 비밀번호칸: 본.비밀번호칸, 아이디칸 });
    const 파일 = join(상태, `${String(판.본.length + 1).padStart(3, '0')}.yml`);
    const 구조 = 본.구조.length > 구조상한 ? `${본.구조.slice(0, 구조상한)}\n# … 길어서 잘랐다` : 본.구조;
    // 입력칸 속성은 머리에 — 보조는 이 파일만 읽는다
    const 파일글 = [`# ${본.최종}`, ...본.입력칸.map(칸줄), 구조, ''].join('\n');
    writeFileSync(join(a.출력, 파일), 파일글);
    const 본번 = 판.본.length;
    판.본.push({
      상태, 틀: 앞지문.length === 0 ? 틀 : `${틀} (구조 다름)`, 주소: 요청, 최종: 본.최종, 이름: 본.제목, 파일, 시작: 시작틀.has(틀),
      지문: 이지문, 글자지문: 글자지문(파일글), 짧음: 본.구조.length < 200, 로그인풀림: 풀림, 입력칸: 본.입력칸, 링크수: 본.링크.length,
    });
    if (풀림) return '풀림';
    if (!a.따라가기) return 'ok';
    const 탈퇴흐름 = 탈퇴틀.has(틀) || 탈퇴주소인가(본.최종) || 탈퇴말인가(본.제목);
    for (const l of 본.링크) {
      const 다음 = 주소고르기(l.href, l.text, 본.최종);
      if (다음 !== null) {
        const 다음틀 = 틀키(다음);
        if (탈퇴말인가(l.text)) 탈퇴틀.add(다음틀);
        if (!빼는주소인가(다음, a.뺄)) 이을(본번, 다음틀, l.text, '링크');
        if (!연주소.has(다음) && (틀들.get(다음틀)?.length ?? 0) < 더볼수(다음틀)) 대기.push(다음);
        continue;
      }
      const 까닭 = 걸러진까닭(l.href, l.text, 본.최종);
      // 위험 글자 · 동작 낱말 링크는 이동하지 않고 아래 누르기로 누른다 — 확인 창 처리기를 거치게
      if (까닭 === '내려받기') 판.걸러짐.set(new URL(l.href, 본.최종).toString(), { 글자: l.text, 까닭 });
    }
    const 상황 = { 상태, 탈퇴흐름, 다시로그인: 로그인남음() };
    let 이화면 = 0;
    for (const x of await 후보모으기(쪽).catch(() => [])) {
      if (이화면 >= 화면누름상한 || !누를까(x, 상황, 본.최종)) continue;
      const 키 = 누름키(x, 틀);
      if (넣은키.has(키)) continue;
      넣은키.add(키);
      이화면++;
      판.누를것++;
      누를것.push({ 본번, 주소: 본.최종, 틀, 키, 이름: x.이름, 종류: x.종류, 로그아웃: 로그아웃인가(x.이름, x.href, 본.최종), 탈퇴: 탈퇴말인가(x.이름) || (x.href !== null && 탈퇴주소인가(x.href, 본.최종)) });
    }
    return 'ok';
  };

  // 지금 쪽이 그 화면 그대로인가 — 주소가 안 바뀐 누르기(탭 · 슬라이드 · 펼치기) 뒤에는 다시 열지 않는다. 못 누르면 그때 다시 연다
  let 그대로 = false;
  // 일.주소 는 리다이렉트 뒤 주소다 — 견줄 때는 그 틀을 본다(일.틀 은 요청 주소의 틀이라 `/` → `/main` 이면 어긋난다)
  const 다시열기 = async (일: 누를일): Promise<'열림' | '안됨' | '그만'> => {
    const 열림 = await 열기(쪽, 일.주소);
    await 쉬기(간격);
    if (열림 === '실패') {
      판.연속오류++;
      return '안됨';
    }
    if (열림 === '건너뜀') return '안됨';
    판.연속오류 = 열림 === 429 || 열림 >= 500 ? 판.연속오류 + 1 : 0;
    if (틀키(쪽.url()) === 틀키(일.주소)) return '열림';
    // 로그인 화면으로 돌려보내졌다 — 로그아웃인 줄 몰랐던 버튼이 세션을 끝냈다. 다시 로그인해 한 번 더 연다
    if (상태 === '로그인' && 로그인풀렸나({ 요청: 일.주소, 최종: 쪽.url(), 비밀번호칸: false, 아이디칸: false })) {
      if (!(await 다시로그인())) {
        판.멈춘까닭 ??= '로그인이 풀림';
        return '그만';
      }
      return 다시열기(일);
    }
    return '안됨'; // 그사이 바뀌었다(지운 글)
  };

  /** 누를 일 하나 — 같은 키의 후보를 누른다. 새 화면으로 갔으면 연결을 남기고 처음 보는 틀이면 그 자리에서 남긴다 */
  const 누르기한번 = async (일: 누를일): Promise<'그만' | 'ok'> => {
    const 상황 = { 상태, 탈퇴흐름: 탈퇴틀.has(일.틀), 다시로그인: 로그인남음() };
    const 제틀 = 틀키(일.주소);
    const 눌러보기 = async (): Promise<number | null> => {
      const 전창 = await 창수(쪽);
      const i = (await 후보모으기(쪽).catch(() => [])).findIndex((x) => 누름키(x, 일.틀) === 일.키 && 누를까(x, 상황, 쪽.url()));
      return i >= 0 && (await 누르기(쪽, i)) ? 전창 : null;
    };
    const 이어서 = 그대로 && 쪽.url() === 일.주소;
    그대로 = false;
    if (!이어서) {
      const 열림 = await 다시열기(일);
      if (열림 !== '열림') return 열림 === '그만' ? '그만' : 'ok';
    }
    let 전창 = await 눌러보기();
    if (전창 === null && 이어서) {
      const 열림 = await 다시열기(일);
      if (열림 === '그만') return '그만';
      if (열림 === '열림') 전창 = await 눌러보기();
    }
    if (전창 === null) return 'ok';
    판.누름++;
    const 창 = 일.탈퇴 ? '탈퇴' : await 확인창누르기(쪽, 전창);
    const 뒤 = 쪽.url();
    그대로 = 뒤 === 일.주소 && 창 === '없음';
    await 쉬기(간격); // 누르기도 서버를 두드린다 — 한 번에 1초 이상 띄운다
    if (new URL(뒤).origin === 출처 && !빼는주소인가(뒤, a.뺄)) {
      const 뒤틀 = 틀키(뒤);
      // 제 화면에 머문 누르기(화면 안 창 · 펼치기)는 연결도 탈퇴 표시도 아니다 — 그 화면의 남은 누르기가 막힌다
      if (일.탈퇴 && 뒤틀 !== 제틀) 탈퇴틀.add(뒤틀);
      이을(일.본번, 뒤틀, 일.이름, 일.종류);
      // 링크로 못 가던 화면 — 다시 열면 동작(담기 · 지우기)이 또 돌 수 있어 지금 열린 것을 그 자리에서 남긴다
      if (!틀들.has(뒤틀) && 뒤틀 !== 제틀 && !일.로그아웃) {
        const 본 = 몫.장 > 0 ? await 읽기(쪽, 200, 출처).catch(() => '건너뜀' as const) : '건너뜀';
        if (몫.장 <= 0) 판.멈춘까닭 ??= `${상태} 몫 ${a.최대}장`;
        if (본 !== '건너뜀') {
          연주소.add(뒤);
          if ((await 남기기(뒤, 뒤틀, 본)) === '풀림' && !(await 다시로그인())) {
            판.멈춘까닭 ??= '로그인이 풀림';
            return '그만';
          }
        }
      }
    }
    if (일.로그아웃 && !(await 다시로그인())) {
      판.멈춘까닭 ??= '로그아웃 뒤 다시 로그인 못 함';
      return '그만';
    }
    return 'ok';
  };

  try {
    for (;;) {
      if (대기.length === 0 && 누를것.length === 0) return;
      if (Date.now() > 몫.마감) return void (판.멈춘까닭 ??= `${상태} 몫 시간`);
      if (판.연속오류 >= 연속오류상한) return void (판.멈춘까닭 ??= '서버 오류 · 연결 실패가 이어짐');
      // 링크로 갈 화면을 먼저 다 본다 — 누르기는 남은 시간에
      if (대기.length > 0 && 몫.장 <= 0) {
        판.멈춘까닭 ??= `${상태} 몫 ${a.최대}장`;
        대기.length = 0;
      }
      const 주소 = 대기.shift();
      if (주소 === undefined) {
        if ((await 누르기한번(누를것.shift()!)) === '그만') return;
        continue;
      }
      if (연주소.has(주소)) continue;
      // 시작 주소도 여기서 걸린다. 본 것으로 적어 두어 다른 화면의 같은 링크가 대기에 다시 안 쌓이게 (SPEC 도메인/작성 §3.6)
      if (빼는주소인가(주소, a.뺄)) {
        연주소.add(주소);
        판.걸러짐.set(주소, { 글자: '', 까닭: '뺄 경로' });
        continue;
      }
      const 틀 = 틀키(주소);
      const 앞지문 = 틀들.get(틀) ?? [];
      if (앞지문.length >= 더볼수(틀)) continue;
      const 부모 = 부모키(주소);
      if (앞지문.length === 0 && 부모 !== null && (부모수.get(부모) ?? 0) >= 부모상한 && !시작틀.has(틀)) {
        판.잘림++;
        continue;
      }

      연주소.add(주소);
      그대로 = false;
      const 본 = await 보기(쪽, 주소);
      await 쉬기(간격);
      if (본 === '건너뜀') continue;
      if (본 === '실패') {
        판.연속오류++;
        continue;
      }
      판.연속오류 = 본.상태코드 === 429 || 본.상태코드 >= 500 ? 판.연속오류 + 1 : 0;
      // 다른 주소에서 뺄 경로로 넘겨졌으면(리다이렉트) 그 화면도 남기지 않는다
      if (빼는주소인가(본.최종, a.뺄)) continue;
      if ((await 남기기(주소, 틀, 본)) === 'ok') continue;
      // 로그인이 풀렸다 — 다시 로그인해 그 화면을 한 번 더 연다. 다시 연 화면도 풀림이면 그 화면만 빼고 간다(로그인 칸이 있는 화면이다)
      if (!다시본.has(주소) && (await 다시로그인())) {
        다시본.add(주소);
        판.본.pop();
        틀들.set(틀, 앞지문);
        if (앞지문.length === 0 && 부모 !== null) 부모수.set(부모, (부모수.get(부모) ?? 1) - 1);
        연주소.delete(주소);
        몫.장++;
        대기.unshift(주소);
        continue;
      }
      if (다시본.has(주소)) continue;
      // 같은 상태 파일을 쓰는 보조도 튕긴다. 자식이 다시 로그인한다
      return void (판.멈춘까닭 ??= '로그인이 풀림');
    }
  } finally {
    await 맥락.close();
  }
}


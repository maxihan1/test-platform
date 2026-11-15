// 크롤러가 화면마다 「어떻게 움직이나」를 모아 크롤 파일 머리 줄로 만든다 — 늦게 채워짐 · 굴림 · 덮개 · 안쪽 링크 · 같은 이름 · 확인 창 (도메인/작성 §3.6 「화면 기록과 크롤러」 「움직임」)
// 쪽 안에서 도는 부분(재료읽기 · 굴려보기)과 줄로 바꾸는 순수 함수(움직임줄)를 나눴다. 줄은 API 줄처럼 글자 지문을 잰 뒤에 끼운다
import type { Page } from '@playwright/test';

import { 뜬창 } from './authoring-crawl-session.js';

export interface 재료 {
  /** 문서 높이 ÷ 창 높이 */
  높이배: number;
  영역: { 이름: string; 줄: number }[];
  덮개: { 이름: string; 넓이: number; 버튼: string[]; 창: boolean }[];
  안쪽: { 겉: string; 안: string[] }[];
  이름들: { 종류: '링크' | '버튼'; 이름: string }[];
}
export interface 굴린뒤 { 쪽: 줄변화 | null; 영역: (줄변화 | null)[] }
export interface 줄변화 { 앞수: number; 뒤수: number; 첫줄바뀜: boolean }

const 줄상한 = 20;
const 항목 = 'li, article, [role="listitem"], [role="article"], [role="row"], tr';
const 덮개말 = /쿠키|cookie|동의|공지|설문|팝업|다시 ?보지|오늘 ?하루|광고|구독|알림 ?받기|consent/i;

// 쪽 안에서 도는 코드는 글자로 넘긴다 — tsx 가 이름 붙은 함수에 끼우는 __name 이 쪽에 없어 ReferenceError 가 난다(authoring-crawl-page.ts 는 도우미를 아예 안 둔다)
const 재료글 = String.raw`(({ 항목, 덮개말 }) => {
  const 말 = new RegExp(덮개말, 'i');
  const 창넓이 = innerWidth * innerHeight;
  const 보임 = [...document.querySelectorAll('body *')].filter((el) => el.getClientRects().length > 0);
  const 글 = (el) => ([el.innerText, el.getAttribute('aria-label'), el.getAttribute('title'), el.value].find((x) => typeof x === 'string' && x.trim() !== '') ?? '').trim().replace(/\s+/g, ' ').slice(0, 40);
  const 영역 = [];
  const 덮개 = [];
  for (const el of 보임) {
    const 꼴 = getComputedStyle(el);
    const 칸 = el.getBoundingClientRect();
    if (/(auto|scroll)/.test(꼴.overflowY) && el.scrollHeight > el.clientHeight + 20 && el.clientHeight > 100 && 영역.length < 3) {
      el.setAttribute('data-crawl-scroll', String(영역.length));
      영역.push({ 이름: el.getAttribute('aria-label') || el.querySelector('h1,h2,h3,[role="heading"]')?.textContent?.trim().slice(0, 30) || el.id || '', 줄: el.querySelectorAll(항목).length });
    }
    const 창 = el.matches('[role="dialog"], [role="alertdialog"], dialog[open], [aria-modal="true"]');
    if ((꼴.position === 'fixed' || 창) && !el.matches('header, nav, [role="banner"], [role="navigation"]') && 덮개.length < 3) {
      const 넓이 = Math.round(((Math.max(0, Math.min(칸.right, innerWidth) - Math.max(칸.left, 0)) * Math.max(0, Math.min(칸.bottom, innerHeight) - Math.max(칸.top, 0))) / 창넓이) * 100);
      const 이름 = 글(el);
      if (이름 !== '' && (창 || 넓이 >= 25 || (넓이 >= 3 && 말.test(이름)))) {
        덮개.push({ 이름, 넓이, 창, 버튼: [...el.querySelectorAll('button, a[href], [role="button"]')].map(글).filter((x) => x !== '').slice(0, 4) });
      }
    }
  }
  const 누름 = 'a[href], button, [role="button"], [role="link"], input[type="submit"], input[type="button"]';
  const 안쪽 = [];
  for (const el of 보임) {
    if (안쪽.length >= 5) break;
    const 겉누름 = el.matches(누름) || el.hasAttribute('onclick') || (el.matches('article, li, [role="article"], [tabindex="0"]') && getComputedStyle(el).cursor === 'pointer');
    if (!겉누름) continue;
    const 안 = [...el.querySelectorAll('a[href], button')].filter((x) => x.getClientRects().length > 0).map(글).filter((x) => x !== '').slice(0, 3);
    if (안.length > 0 && !안쪽.some((x) => x.안.join() === 안.join())) 안쪽.push({ 겉: 글(el), 안 });
  }
  const 이름들 = 보임.filter((el) => el.matches(누름)).map((el) => ({ 종류: el.matches('a[href], [role="link"]') ? '링크' : '버튼', 이름: 글(el) })).filter((x) => x.이름 !== '');
  return { 높이배: Math.round((document.documentElement.scrollHeight / innerHeight) * 10) / 10, 영역, 덮개, 안쪽, 이름들 };
})`;

const 재기글 = String.raw`((항목) => {
  const 첫 = (root) => { const 줄 = root.querySelectorAll(항목); return [줄.length, (줄[0]?.innerText ?? '').slice(0, 40)]; };
  return { 쪽: 첫(document), 영역: [...document.querySelectorAll('[data-crawl-scroll]')].map(첫) };
})`;

/** 다 온 뒤의 화면에서 덮개 · 굴리는 영역 · 안쪽 링크 · 누를 것 이름을 읽는다. 굴리는 영역에는 굴려보기가 찾을 표시를 단다 */
export async function 재료읽기(쪽: Page): Promise<재료> {
  return 쪽.evaluate<재료>(`${재료글}(${JSON.stringify({ 항목, 덮개말: 덮개말.source })})`);
}

/** 쪽과 굴리는 영역을 끝까지 굴려 줄이 붙는지(늘어나는 목록) · 줄 수는 그대로인데 첫 줄이 바뀌는지(가상 목록) 본다. 다 보고 맨 위로 되돌린다 */
export async function 굴려보기(쪽: Page, 재: 재료, 기다림 = 700): Promise<굴린뒤 | null> {
  if (재.높이배 < 1.5 && 재.영역.length === 0) return null;
  const 재기 = (): Promise<{ 쪽: [number, string]; 영역: [number, string][] }> => 쪽.evaluate(`${재기글}(${JSON.stringify(항목)})`);
  const 굴리기 = (끝: boolean): Promise<void> =>
    쪽.evaluate(`(() => {
      window.scrollTo(0, ${끝 ? 'document.documentElement.scrollHeight' : '0'});
      document.querySelectorAll('[data-crawl-scroll]').forEach((el) => el.scrollTo(0, ${끝 ? 'el.scrollHeight' : '0'}));
    })()`);
  try {
    const 앞 = await 재기();
    await 굴리기(true);
    await 쪽.waitForTimeout(기다림);
    const 뒤 = await 재기();
    await 굴리기(false);
    return { 쪽: 재.높이배 < 1.5 ? null : 줄변화보기(앞.쪽, 뒤.쪽), 영역: 앞.영역.map((x, i) => 줄변화보기(x, 뒤.영역[i])) };
  } catch {
    return null;
  }
}

export function 줄변화보기(앞: [number, string] | undefined, 뒤: [number, string] | undefined): 줄변화 | null {
  return 앞 === undefined || 뒤 === undefined || 앞[0] === 0 ? null : { 앞수: 앞[0], 뒤수: 뒤[0], 첫줄바뀜: 앞[1] !== 뒤[1] };
}

/** ariaSnapshot 한 장에서 이름 붙은 요소(`- heading "알림"`)를 `heading 「알림」` 으로 모은다 */
export function 이름요소(구조: string): string[] {
  const 모음: string[] = [];
  for (const 줄 of 구조.split('\n')) {
    const m = /^\s*- ([a-z]+) "([^"]+)"/.exec(줄);
    if (m !== null) 모음.push(`${m[1]} 「${m[2]!.slice(0, 30)}」`);
  }
  return 모음;
}

const 굴림말 = (x: 줄변화 | null): string =>
  x === null ? '' : x.뒤수 > x.앞수 ? ` · 굴리면 줄이 붙는다(${x.앞수}→${x.뒤수})` : x.첫줄바뀜 ? ' · 줄 수는 그대로인데 첫 줄이 바뀐다(가상 목록)' : '';

/** 크롤 파일 머리 줄 — 늦게 채워짐 · 굴림 · 덮개 · 안쪽 링크 · 같은 이름. 확인 창 줄은 누를 때 따로 붙는다 */
export function 움직임줄(이른구조: string, 늦은구조: string, 재: 재료, 굴린: 굴린뒤 | null): string[] {
  const 줄들: string[] = [];
  const 이른 = new Set(이름요소(이른구조));
  const 늦은 = 이름요소(늦은구조);
  const 늦게 = [...new Set(늦은.filter((x) => !이른.has(x)))];
  if (늦게.length > 0) {
    줄들.push(`# 늦게 채워짐: 막 떴을 때 ${이른.size}개 → 다 온 뒤 ${new Set(늦은).size}개 · ${늦게.slice(0, 8).join(' ')}${늦게.length > 8 ? ` 외 ${늦게.length - 8}개` : ''}`);
  }
  if (재.높이배 >= 1.5) 줄들.push(`# 굴림: 쪽 — 화면 높이의 ${재.높이배}배${굴림말(굴린?.쪽 ?? null)}`);
  재.영역.forEach((x, i) => 줄들.push(`# 굴림: 영역 「${x.이름 || '이름 없음'}」 — 줄 ${x.줄}개${굴림말(굴린?.영역[i] ?? null)}`));
  for (const x of 재.덮개) {
    줄들.push(`# 덮개: ${x.창 ? '창 ' : ''}「${x.이름}」 · 화면의 ${x.넓이}%${x.버튼.length === 0 ? '' : ` · 버튼 ${x.버튼.map((b) => `「${b}」`).join(' ')}`}`);
  }
  for (const x of 재.안쪽) 줄들.push(`# 안쪽 링크: 「${x.겉}」 안에 ${x.안.map((b) => `「${b}」`).join(' ')}`);
  const 셈 = new Map<string, number>();
  for (const x of 재.이름들) 셈.set(`${x.종류} 「${x.이름}」`, (셈.get(`${x.종류} 「${x.이름}」`) ?? 0) + 1);
  const 여럿 = [...셈].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]);
  if (여럿.length > 0) 줄들.push(`# 같은 이름: ${여럿.slice(0, 8).map(([k, n]) => `${k} ${n}개`).join(' · ')}`);
  return 줄들.slice(0, 줄상한);
}

/** 브라우저 확인 창 — 누른 것(없으면 화면을 열 때)과 같이 */
export const 확인창줄 = (창: string, 누른것: string | null): string => `# 확인 창: ${창} ← ${누른것 ?? '화면을 열 때'}`;

/** 그 쪽에 뜬 확인 창을 비우며 그 화면 움직임에 더한다 — 같은 줄은 한 번, 화면 하나에 다섯 줄까지. 화면이 없으면(남기지 않은 화면) 버리기만 한다 */
export function 창남기기(쪽: Page, 화면: { 움직임?: string[] } | undefined, 누른것: string | null): void {
  const 창들 = 뜬창.get(쪽)?.splice(0) ?? [];
  if (화면 === undefined) return;
  const 움직임 = (화면.움직임 ??= []);
  for (const 줄 of 창들.map((x) => 확인창줄(x, 누른것))) {
    if (!움직임.includes(줄) && 움직임.filter((x) => x.startsWith('# 확인 창:')).length < 5) 움직임.push(줄);
  }
}

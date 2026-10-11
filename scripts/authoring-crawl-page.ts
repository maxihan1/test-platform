// 크롤러의 브라우저 쪽 — 화면 하나 읽기 · 누를 후보 모으기 · 하나 누르기 · 화면 안 확인 창 (도메인/작성 §3.6 「★ 역방향」 · 「★ 표준 기획서」)
// 판정은 authoring-crawl-rules · authoring-crawl-press 의 순수 함수에 있다. 여기는 쪽(Page)만 다룬다
import type { Page } from '@playwright/test';

import { type 후보, 탈퇴말인가, 확인버튼고르기 } from './authoring-crawl-press.js';

export interface 입력칸 { 종류: string; 이름: string; 라벨: string; 안내: string; 필수: boolean; 읽기전용: boolean; 최대글자: number | null; 최소글자: number | null; 형식: string | null }
export type 본것 = { 상태코드: number; 최종: string; 제목: string; 구조: string; 비밀번호칸: boolean; 입력칸: 입력칸[]; 링크: { href: string; text: string }[] };

/** 지금 열린 화면을 읽는다 — 다른 출처면 '건너뜀' */
export async function 읽기(쪽: Page, 상태코드: number, 출처: string): Promise<본것 | '건너뜀'> {
  const 최종 = 쪽.url();
  if (new URL(최종).origin !== 출처) return '건너뜀';
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
  return { 상태코드, 최종, 제목: await 쪽.title(), 구조, 비밀번호칸: 입력칸.some((x) => x.종류 === 'password'), 입력칸, 링크 };
}

/** 주소로 연다 — 연결 실패 · 시간 초과는 '실패'(연속 오류로 센다) */
export async function 열기(쪽: Page, 주소: string): Promise<number | '건너뜀' | '실패'> {
  try {
    const 응답 = await 쪽.goto(주소, { waitUntil: 'domcontentloaded', timeout: 15_000 });
    await 쪽.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => undefined);
    return 응답?.status() ?? 0;
  } catch (e) {
    return /download/i.test(String(e)) ? '건너뜀' : '실패';
  }
}

/** 화면 하나 — 내려받기 · 다른 출처는 '건너뜀' */
export async function 보기(쪽: Page, 주소: string): Promise<본것 | '건너뜀' | '실패'> {
  const 열림 = await 열기(쪽, 주소);
  if (typeof 열림 !== 'number') return 열림;
  try {
    return await 읽기(쪽, 열림, new URL(주소).origin);
  } catch {
    return '실패';
  }
}

export const 칸줄 = (x: 입력칸): string =>
  `# 입력칸: ${x.종류} ${x.라벨 || x.이름 || x.안내}${x.필수 ? ' · 필수' : ''}${x.읽기전용 ? ' · 읽기 전용' : ''}${x.최대글자 === null ? '' : ` · 최대 ${x.최대글자}자`}${x.최소글자 === null ? '' : ` · 최소 ${x.최소글자}자`}${x.형식 === null ? '' : ` · 형식 ${x.형식}`}`;

const 고르개 = 'a[href], button, [role="button"], input[type="submit"], input[type="button"], input[type="image"]';
const 창고르개 = '[role="dialog"], [role="alertdialog"], dialog[open], [aria-modal="true"]';

/** 누를 후보 — 순번은 `querySelectorAll(고르개)` 차례다. 다시 연 화면에서 같은 키로 다시 찾는다 */
export async function 후보모으기(쪽: Page): Promise<후보[]> {
  // 쪽 안에서 도는 함수 — 이름 붙은 도우미를 두지 않는다(tsx 가 끼우는 __name 이 쪽에 없어 ReferenceError)
  return 쪽.evaluate((고르개) =>
    [...document.querySelectorAll(고르개)].map((el) => {
      const e = el as HTMLInputElement;
      const 링크 = el.tagName === 'A';
      // 입력칸이 있는 폼의 제출 — type 없는 button · submit · image. type="button"(중복 확인 · 우편번호 찾기)은 제출이 아니다
      const 제출꼴 = (el.tagName === 'BUTTON' && (el.getAttribute('type') ?? 'submit').toLowerCase() === 'submit') || (el.tagName === 'INPUT' && ['submit', 'image'].includes(e.type));
      const 폼 = e.form ?? el.closest('form');
      // 화면 위에 떠 있는 것(쿠키 동의 띠 · 붙박이 머리)도 화면마다 같다 — 데모마켓 「동의」가 화면마다 잡혔다
      let 떠있음 = false;
      for (let n: Element | null = el; n !== null && !떠있음; n = n.parentElement) 떠있음 = ['fixed', 'sticky'].includes(getComputedStyle(n).position);
      return {
        종류: 링크 ? ('링크' as const) : ('버튼' as const),
        이름: [(el as HTMLElement).innerText, el.getAttribute('aria-label'), el.getAttribute('title'), e.value && !링크 ? e.value : null, el.getAttribute('alt')]
          .find((x) => typeof x === 'string' && x.trim() !== '')
          ?.trim()
          .slice(0, 60) ?? '',
        href: 링크 ? el.getAttribute('href') : null,
        보임: el.getClientRects().length > 0 && !e.disabled && el.getAttribute('aria-disabled') !== 'true',
        머리바닥: el.closest('header, nav, footer, [role="banner"], [role="navigation"], [role="contentinfo"]') !== null || 떠있음,
        제출막힘:
          제출꼴 &&
          폼 !== null &&
          [...폼.querySelectorAll('input, select, textarea')].some((칸) => {
            const c = 칸 as HTMLInputElement;
            return !['hidden', 'submit', 'button', 'image', 'reset'].includes(c.type) && !c.disabled && !c.readOnly && 칸.getClientRects().length > 0;
          }),
      };
    }),
  고르개);
}

/** 보이는 화면 안 창 수 — 누르기 전과 견줘 새로 뜬 창만 본다(쿠키 동의 같은 원래 있던 창은 안 누른다) */
export async function 창수(쪽: Page): Promise<number> {
  return 쪽.evaluate((sel) => [...document.querySelectorAll(sel)].filter((el) => el.getClientRects().length > 0).length, 창고르개).catch(() => 0);
}

/** 마우스로 누르고, 처음부터 떠 있던 팝업 창이 가려 못 누르면 그 요소에 click 을 바로 보낸다 — 데모마켓 홈 팝업이 머리의 「로그아웃」을 가렸다 */
async function 클릭(쪽: Page, 고른것: string): Promise<void> {
  const 것 = 쪽.locator(고른것).first();
  await 것.click({ timeout: 1_500 }).catch(() => 것.dispatchEvent('click', undefined, { timeout: 1_500 }));
}

/** 순번의 후보를 누른다. 새 창으로 열지 않게 target 을 뗀다 */
export async function 누르기(쪽: Page, 순번: number): Promise<boolean> {
  try {
    await 쪽.evaluate(
      ([sel, i]) => {
        document.querySelector('[data-crawl-press]')?.removeAttribute('data-crawl-press');
        const el = document.querySelectorAll(sel)[i];
        el?.setAttribute('data-crawl-press', '');
        el?.removeAttribute('target');
        el?.closest('form')?.removeAttribute('target');
      },
      [고르개, 순번] as const,
    );
    await 클릭(쪽, '[data-crawl-press]');
    await 쪽.waitForLoadState('domcontentloaded', { timeout: 5_000 }).catch(() => undefined);
    await 쪽.waitForLoadState('networkidle', { timeout: 2_000 }).catch(() => undefined);
    return true;
  } catch {
    return false;
  }
}

/**
 * 누른 뒤 새로 뜬 화면 안 확인 창 — 탈퇴 글이면 안 누르고, 입력칸이 있으면(로그인 창) 안 누르고, 아니면 취소 · 닫기가 아닌 마지막 버튼을 한 번 누른다.
 * 브라우저 확인 창(confirm)은 쪽의 dialog 처리기가 늘 취소한다
 */
export async function 확인창누르기(쪽: Page, 전창수: number): Promise<'없음' | '탈퇴' | '입력' | '누름'> {
  // 창 안 버튼에 차례 번호를 달아 둔다 — 고른 번호를 그대로 누른다
  const 창 = await 쪽
    .evaluate(
      ([sel, 전]) => {
        const 보이는 = [...document.querySelectorAll(sel)].filter((el) => el.getClientRects().length > 0);
        if (보이는.length <= 전) return null;
        const 맨위 = 보이는[보이는.length - 1] as HTMLElement;
        const 버튼들 = [...맨위.querySelectorAll<HTMLElement>('button, [role="button"], input[type="submit"], input[type="button"]')].filter(
          (el) => el.getClientRects().length > 0 && !(el as HTMLButtonElement).disabled,
        );
        document.querySelectorAll('[data-crawl-dialog-button]').forEach((el) => el.removeAttribute('data-crawl-dialog-button'));
        버튼들.forEach((el, n) => el.setAttribute('data-crawl-dialog-button', String(n)));
        const 칸 = [...맨위.querySelectorAll('input, select, textarea')].some((el) => !['hidden', 'submit', 'button'].includes((el as HTMLInputElement).type) && el.getClientRects().length > 0);
        return {
          글: 맨위.innerText.slice(0, 2_000),
          칸,
          이름들: 버튼들.map((el) => (el.innerText || el.getAttribute('aria-label') || (el as HTMLInputElement).value || '').trim()),
        };
      },
      [창고르개, 전창수] as const,
    )
    .catch(() => null);
  if (창 === null) return '없음';
  if (탈퇴말인가(창.글)) return '탈퇴';
  if (창.칸) return '입력';
  const i = 확인버튼고르기(창.이름들);
  if (i === null) return '없음';
  try {
    await 클릭(쪽, `[data-crawl-dialog-button="${i}"]`);
    await 쪽.waitForLoadState('domcontentloaded', { timeout: 5_000 }).catch(() => undefined);
    await 쪽.waitForLoadState('networkidle', { timeout: 2_000 }).catch(() => undefined);
    return '누름';
  } catch {
    return '없음';
  }
}

import { defineCase, test, verify } from '@platform/kit';

import { 세션사용자, 맞는이름들 } from './helpers/shop-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 상품목록 } from './helpers/shop.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-169',
  name: '검색어를 바꿔 적으면 마지막 검색어에 맞는 자동완성만 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);

  await test.step('방해 요소를 막는다', async () => {
    await 방해막기(page);
  });

  await test.step('로그인하지 않은 상태인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', (await 세션사용자(page.request)) === null, true, { blocker: true });
  });

  await test.step('상품 목록 화면을 준비한다', async () => {
    await 목록.열기();
  });

  await test.step('상품 목록 첫 화면이 떴는지 확인한다', async () => {
    await 목록.첫화면기다리기();
    await verify('상품 목록 화면에 「쇼핑」 제목이 보인다', await 목록.제목.isVisible(), true, { blocker: true });
  });

  const 늦출검색어 = '데모';
  const 바꾼검색어 = '키';
  const 자동완성주소 = /\/api\/products\/suggest/;

  try {
    await test.step('첫 검색어의 자동완성 응답을 늦춘다', async () => {
      await page.context().route(자동완성주소, async (route) => {
        if (new URL(route.request().url()).searchParams.get('q') === 늦출검색어) await new Promise((끝) => setTimeout(끝, 1500));
        await route.continue();
      });
    });

    await test.step('검색어를 적은 뒤 다른 검색어로 바꿔 적는다', async () => {
      const 기대 = 맞는이름들((await 상품목록(page.request)).items, 바꾼검색어);
      const 첫요청 = page.waitForRequest((요청) => 자동완성주소.test(요청.url()) && new URL(요청.url()).searchParams.get('q') === 늦출검색어);
      const 늦은응답 = page.waitForResponse((응답) => 자동완성주소.test(응답.url()) && new URL(응답.url()).searchParams.get('q') === 늦출검색어);
      await 목록.검색칸.fill(늦출검색어);
      await 첫요청;
      await 목록.검색칸.fill(바꾼검색어);
      await 목록.자동완성.getByRole('option', { name: 기대[0] ?? '' }).waitFor();
      await 늦은응답;
      await page.evaluate(() => new Promise((끝) => requestAnimationFrame(() => requestAnimationFrame(() => 끝(null)))));
      await verify('검색어를 바꿔 적으면 마지막 검색어에 맞는 자동완성만 보인다', (await 목록.자동완성항목.allInnerTexts()).sort(), [...기대].sort());
    });
  } finally {
    await page.context().unroute(자동완성주소);
  }
});

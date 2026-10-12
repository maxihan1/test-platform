import { defineCase, test, verify } from '@platform/kit';

import { 방해막기 } from './helpers/quiet.helper.js';
import { 맞는이름들 } from './helpers/shop-tools.helper.js';
import { 상품목록 } from './helpers/shop.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-142',
  name: '검색어를 바꾸면 마지막 검색어 「데모」에 맞는 자동완성 항목만 보인다',
  precondition: ['첫 자동완성 응답이 늦게 온다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);

  await test.step('방해 요소를 막는다', async () => {
    await 방해막기(page);
  });

  await test.step('상품 목록 화면을 준비한다', async () => {
    await 목록.열기();
  });

  await test.step('상품 목록 첫 화면이 떴는지 확인한다', async () => {
    await 목록.첫화면기다리기();
    await verify('상품 목록 화면에 「쇼핑」 제목이 보인다', await 목록.제목.isVisible(), true, { blocker: true });
  });

  const 늦출검색어 = '가';
  const 바꾼검색어 = '데모';
  const 자동완성주소 = /\/api\/products\/suggest/;
  let 늦춘수 = 0;

  try {
    await test.step('첫 자동완성 응답을 늦춘다', async () => {
      await page.context().route(자동완성주소, async (route) => {
        if (new URL(route.request().url()).searchParams.get('q') === 늦출검색어) {
          늦춘수 += 1;
          await new Promise((끝) => setTimeout(끝, 1500));
        }
        await route.continue();
      });
    });

    await test.step('검색칸에 「가」를 적었다가 「데모」로 바꾼다', async () => {
      const 기대 = 맞는이름들((await 상품목록(page.request)).items, 바꾼검색어);
      const 첫요청 = page.waitForRequest((요청) => 자동완성주소.test(요청.url()) && new URL(요청.url()).searchParams.get('q') === 늦출검색어);
      const 늦은응답 = page.waitForResponse((응답) => 자동완성주소.test(응답.url()) && new URL(응답.url()).searchParams.get('q') === 늦출검색어);
      await 목록.검색칸.fill(늦출검색어);
      await 첫요청;
      await 목록.검색칸.fill(바꾼검색어);
      await 목록.자동완성.getByRole('option', { name: 기대[0] ?? '' }).waitFor();
      await 늦은응답;
      await page.evaluate(() => new Promise((끝) => requestAnimationFrame(() => requestAnimationFrame(() => 끝(null)))));
      await verify('첫 자동완성 응답이 늦춰졌다', 늦춘수 > 0, true, { blocker: true });
      await verify('검색어를 바꾸면 마지막 검색어 「데모」에 맞는 자동완성 항목만 보인다', (await 목록.자동완성항목.allInnerTexts()).sort(), [...기대].sort());
    });
  } finally {
    await page.context().unroute(자동완성주소);
  }
});

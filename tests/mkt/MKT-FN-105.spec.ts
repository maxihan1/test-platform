import { defineCase, test, verify } from '@platform/kit';

import { 상품상세화면 } from './pages/shop-detail.page.js';
import { 이미지확대창 } from './pages/shop-zoom.page.js';

type 상품요약 = { id: number; soldOut: boolean };

export const spec = defineCase({
  tcId: 'MKT-FN-105',
  name: '큰 이미지를 누르면 확대 보기 창이 뜨고 ESC 나 「닫기」 버튼을 누르면 닫힌다',
  precondition: ['비회원이다', '확대 보기 창이 열려 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 상품상세화면(page);
  const 확대 = new 이미지확대창(page);
  const 목록 = ((await (await page.request.get('/api/products?page=1&size=100')).json()) as { items: 상품요약[] }).items;
  const 대상 = 목록.find((상품) => !상품.soldOut) as 상품요약;

  await test.step('큰 이미지를 누른다', async () => {
    await 상세.열기(대상.id);
    await 상세.상품명().waitFor();
    await 상세.큰이미지버튼().click();
    await 확대.창().waitFor();
    await verify('큰 이미지를 누르면 확대 보기 창이 뜬다', await 확대.창().isVisible(), true);
  });

  await test.step('키보드 ESC 를 친다', async () => {
    await verify('확대 보기 창이 열려 있다', await 확대.창().isVisible(), true, { blocker: true });
    await page.keyboard.press('Escape');
    await 확대.창().waitFor({ state: 'hidden' });
    await verify('ESC 를 치면 확대 보기 창이 닫힌다', await 확대.창().isVisible(), false);
  });

  await test.step('「닫기」 버튼을 누른다', async () => {
    await 상세.큰이미지버튼().click();
    await 확대.창().waitFor();
    await verify('확대 보기 창이 열려 있다', await 확대.창().isVisible(), true, { blocker: true });
    await 확대.닫기버튼().click();
    await 확대.창().waitFor({ state: 'hidden' });
    await verify('「닫기」 버튼을 누르면 확대 보기 창이 닫힌다', await 확대.창().isVisible(), false);
  });
});

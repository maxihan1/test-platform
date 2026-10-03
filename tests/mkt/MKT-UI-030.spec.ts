import { defineCase, test, verify } from '@platform/kit';

import { 상품상세화면 } from './pages/shop-detail.page.js';
import { 이미지확대창 } from './pages/shop-zoom.page.js';

type 상품요약 = { id: number; soldOut: boolean };

export const spec = defineCase({
  tcId: 'MKT-UI-030',
  name: '상품 상세의 확대 보기 창이 화면 전체를 덮고 위쪽 현재 위치 · 좌우 화살표 · 닫기 버튼이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 상품상세화면(page);
  const 확대 = new 이미지확대창(page);
  const 목록 = ((await (await page.request.get('/api/products?page=1&size=100')).json()) as { items: 상품요약[] }).items;
  const 대상 = 목록.find((상품) => !상품.soldOut) as 상품요약;

  await test.step('상품 상세 화면에서 큰 이미지를 눌러 확대 보기 창을 연다', async () => {
    await 상세.열기(대상.id);
    await 상세.상품명().waitFor();
    await 상세.큰이미지버튼().click();
    await 확대.창().waitFor();
    await verify('확대 보기 창이 화면 전체를 덮어 보인다', await 확대.화면을덮는가(), true);
    await verify(
      '확대 보기 창 위쪽에 현재 위치 「1 / 4」가 보인다',
      [await 확대.위치글자().isVisible(), await 확대.위치(), await 확대.위치글자가이미지위에있는가()],
      [true, '1 / 4', true],
    );
    await verify(
      '확대 보기 창에 「이전 이미지」 「다음 이미지」 화살표와 「닫기」 버튼이 보인다',
      [await 확대.이전버튼().isVisible(), await 확대.다음버튼().isVisible(), await 확대.닫기버튼().isVisible()],
      [true, true, true],
    );
  });
});

import { defineCase, test, verify } from '@platform/kit';

import { 상품상세화면 } from './pages/shop-detail.page.js';

type 상품요약 = { id: number; soldOut: boolean };

export const spec = defineCase({
  tcId: 'MKT-FN-070',
  name: '썸네일에 마우스를 올리거나 썸네일을 누르면 큰 이미지가 그 썸네일로 바뀐다',
  precondition: ['상품 상세에 썸네일이 4장 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 상품상세화면(page);
  const 목록 = ((await (await page.request.get('/api/products?page=1&size=100')).json()) as { items: 상품요약[] }).items;
  const 대상 = 목록.find((상품) => !상품.soldOut) as 상품요약;

  await test.step('두 번째 썸네일에 마우스를 올린다', async () => {
    await 상세.열기(대상.id);
    await 상세.상품명().waitFor();
    await verify('상품 상세에 썸네일이 4장 있다', await 상세.썸네일버튼들().count(), 4, { blocker: true });
    await 상세.썸네일버튼(2).hover();
    await 상세.현재썸네일(2).waitFor();
    await verify('썸네일에 마우스를 올리면 큰 이미지가 그 썸네일로 바뀐다', await 상세.큰이미지주소(), await 상세.썸네일이미지주소(2));
  });

  await test.step('세 번째 썸네일을 누른다', async () => {
    await 상세.썸네일버튼(3).click();
    await 상세.현재썸네일(3).waitFor();
    await verify('썸네일을 누르면 큰 이미지가 그 썸네일로 바뀐다', await 상세.큰이미지주소(), await 상세.썸네일이미지주소(3));
  });
});

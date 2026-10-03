import { defineCase, test, verify } from '@platform/kit';

import { 상품상세화면 } from './pages/shop-detail.page.js';
import { 이미지확대창 } from './pages/shop-zoom.page.js';

type 상품요약 = { id: number; soldOut: boolean };

export const spec = defineCase({
  tcId: 'MKT-FN-106',
  name: '확대 보기 창에서 화살표 버튼이나 키보드 ← → 를 누르면 이미지가 넘어가고 위치가 바뀐다',
  precondition: ['확대 보기 창이 열려 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 상품상세화면(page);
  const 확대 = new 이미지확대창(page);
  const 목록 = ((await (await page.request.get('/api/products?page=1&size=100')).json()) as { items: 상품요약[] }).items;
  const 대상 = 목록.find((상품) => !상품.soldOut) as 상품요약;

  await test.step('「다음 이미지」 화살표를 누른다', async () => {
    await 상세.열기(대상.id);
    await 상세.상품명().waitFor();
    const 둘째그림 = await 상세.썸네일이미지주소(2);
    await 상세.큰이미지버튼().click();
    await 확대.창().waitFor();
    await verify('확대 보기 창이 열려 있다', await 확대.창().isVisible(), true, { blocker: true });
    await 확대.다음버튼().click();
    await 확대.위치글자().filter({ hasText: '2 / 4' }).waitFor();
    await verify('「다음 이미지」 화살표를 누르면 위치가 「2 / 4」로 바뀐다', await 확대.위치(), '2 / 4');
    await verify('확대 이미지가 두 번째 이미지로 바뀐다', await 확대.확대이미지주소(), 둘째그림);
  });

  await test.step('「이전 이미지」 화살표를 누른다', async () => {
    await 확대.이전버튼().click();
    await 확대.위치글자().filter({ hasText: '1 / 4' }).waitFor();
    await verify('「이전 이미지」 화살표를 누르면 위치가 「1 / 4」로 돌아온다', await 확대.위치(), '1 / 4');
  });

  await test.step('키보드 → 를 친다', async () => {
    await page.keyboard.press('ArrowRight');
    await 확대.위치글자().filter({ hasText: '2 / 4' }).waitFor();
    await verify('→ 를 치면 위치가 「2 / 4」로 바뀐다', await 확대.위치(), '2 / 4');
  });

  await test.step('키보드 ← 를 친다', async () => {
    await page.keyboard.press('ArrowLeft');
    await 확대.위치글자().filter({ hasText: '1 / 4' }).waitFor();
    await verify('← 를 치면 위치가 「1 / 4」로 돌아온다', await 확대.위치(), '1 / 4');
  });
});

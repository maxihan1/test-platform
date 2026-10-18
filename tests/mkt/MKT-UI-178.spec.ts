import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 상품상세화면 } from './pages/product.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-178',
  name: '확대 보기 위쪽에 현재 위치 「2 / 4」가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['확대 보기 모달이 떠 있다'],
  params: z.object({
    productId: z.number().describe('열어 볼 상품 번호 — 품절이 아닌 상품').default(2),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 상품상세화면(page);

  await test.step('상품 상세에서 확대 보기를 연다', async () => {
    await 방해창막기(page);
    await 상세.열기(params.productId);
    await 상세.확대보기열기();
  });

  await test.step('확대 보기가 떠 있는지 확인한다', async () => {
    await verify('확대 보기 모달이 떠 있다', await 상세.확대창.isVisible(), true, { blocker: true });
  });

  await test.step('다음 이미지로 한 번 넘긴다', async () => {
    await 상세.확대다음.click();
    const 쪽 = (await 상세.확대위치가위쪽인가()) ? '위쪽' : '위쪽 아님';
    await verify('확대 보기 위쪽에 현재 위치 「2 / 4」가 보인다', `${쪽} ${await 상세.확대위치.innerText()}`, '위쪽 2 / 4');
  });
});

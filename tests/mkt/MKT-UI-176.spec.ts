import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 상품상세화면 } from './pages/product.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-176',
  name: '확대 보기의 「다음 이미지」를 누르면 다음 이미지로 넘어간다',
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

  await test.step('확대 보기의 「다음 이미지」 화살표를 누른다', async () => {
    await 상세.확대다음.click();
    await verify('확대 보기의 「다음 이미지」를 누르면 다음 이미지로 넘어간다', await 상세.확대이미지.getAttribute('src'), await 상세.썸네일그림(2).getAttribute('src'));
  });

  await test.step('키보드 → 를 친다', async () => {
    await page.keyboard.press('ArrowRight');
    await verify('확대 보기에서 → 를 치면 다음 이미지로 넘어간다', await 상세.확대이미지.getAttribute('src'), await 상세.썸네일그림(3).getAttribute('src'));
  });

  await test.step('키보드 ← 를 친다', async () => {
    await page.keyboard.press('ArrowLeft');
    await verify('확대 보기에서 ← 를 치면 앞 이미지로 돌아간다', await 상세.확대이미지.getAttribute('src'), await 상세.썸네일그림(2).getAttribute('src'));
  });
});

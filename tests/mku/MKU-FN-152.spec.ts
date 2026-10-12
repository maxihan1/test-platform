import { defineCase, test, verify } from '@platform/kit';

import { 토스트 } from './components/toast.component.js';
import { 조회실패모킹 } from './helpers/checkout-flow.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-152',
  name: '상품 목록 응답이 실패하면 「잠시 후 다시 시도해 주세요」 안내가 보인다',
  techniques: ['오류 추정'],
  precondition: ['상품 목록 응답은 가짜 응답(모킹)이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);
  const 토스 = new 토스트(page);

  await test.step('방해 요소를 막는다', async () => {
    await 방해막기(page);
  });

  const 모킹 = await 조회실패모킹(page, /\/api\/products(\?.*)?$/);

  try {
    await test.step('상품 목록 응답을 500 으로 준 채 상품 목록을 연다', async () => {
      await 목록.열기();
      await 토스.글('잠시 후 다시 시도해 주세요').first().waitFor();
      await verify('상품 목록 요청이 가짜 응답으로 돌아갔다', 모킹.걸린수() > 0, true, { blocker: true });
      await verify('상품 목록 응답이 실패하면 「잠시 후 다시 시도해 주세요」 안내가 보인다', await 토스.글('잠시 후 다시 시도해 주세요').first().isVisible(), true);
    });
  } finally {
    await 모킹.풀기();
  }
});

import { defineCase, test, verify } from '@platform/kit';

import { 토스트 } from './components/toast.component.js';
import { 방해막기 } from './helpers/account.helper.js';
import { 오류응답걸기 } from './helpers/mock.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-070',
  name: '상품 목록 응답이 500 이면 상품 목록 화면이 깨지지 않고 오류 안내가 보인다',
  platforms: ['desktop'],
  precondition: ['상품 목록 응답은 500 가짜 응답(모킹)이다'],
  techniques: ['오류 추정'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);
  const 알림 = new 토스트(page);
  let 해제: (() => Promise<void>) | undefined;

  try {
    await test.step('상품 목록 응답을 500 으로 주고 상품 목록 화면을 연다', async () => {
      await 방해막기(page);
      해제 = await 오류응답걸기(page.context(), /\/api\/products\?/, 500, { code: 'INTERNAL' });
      await 목록.응답기다리지않고열기();
      await 알림.모두.first().waitFor();
      await verify(
        '상품 목록 응답이 500 이면 상품 목록 화면이 깨지지 않고 오류 안내가 보인다',
        { 제목: await 목록.제목.isVisible(), 오류안내: await 알림.모두.first().innerText() },
        { 제목: true, 오류안내: '잠시 후 다시 시도해 주세요' },
      );
    });
  } finally {
    await 해제?.();
  }
});

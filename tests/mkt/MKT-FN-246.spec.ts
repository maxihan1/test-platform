import { defineCase, test, verify } from '@platform/kit';

import { 토스트 } from './components/toast.component.js';
import { 세션사용자 } from './helpers/shop-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 고객센터화면 } from './pages/support.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-246',
  name: 'FAQ 응답이 실패하면 고객센터에 「잠시 후 다시 시도해 주세요」가 보인다',
  techniques: ['오류 추정'],
  precondition: ['비회원이다', 'FAQ 응답은 가짜 응답(모킹)이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 센터 = new 고객센터화면(page);
  const 토스 = new 토스트(page);

  await test.step('방해 요소를 막는다', async () => {
    await 방해막기(page);
  });

  await test.step('로그인하지 않은 상태인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', (await 세션사용자(page.request)) === null, true, { blocker: true });
  });

  const FAQ주소 = /\/api\/faq/;

  try {
    await test.step('FAQ 응답을 실패로 바꾼다', async () => {
      await page.context().route(FAQ주소, async (route) => {
        await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ code: 'INTERNAL' }) });
      });
    });

    await test.step('FAQ 응답을 실패로 바꾸고 고객센터를 연다', async () => {
      await 센터.열기();
      await 토스.알림들.first().waitFor();
      await verify('FAQ 응답이 실패하면 고객센터에 「잠시 후 다시 시도해 주세요」가 보인다', await 센터.패널.getByText('잠시 후 다시 시도해 주세요').isVisible(), true);
    });
  } finally {
    await page.context().unroute(FAQ주소);
  }
});

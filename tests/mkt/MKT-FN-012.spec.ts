import { defineCase, test, verify } from '@platform/kit';

import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-012',
  name: '이벤트 띠의 X 를 누르면 띠가 닫힌다',
  precondition: ['홈에 처음 들어온 비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('이벤트 띠의 X 를 누른다', async () => {
    await 홈.열기();
    await 홈.공지팝업닫기();
    await 홈.이벤트띠().waitFor();
    await verify('이벤트 띠가 보인다', await 홈.이벤트띠().isVisible(), true, { blocker: true });
    await 홈.이벤트띠닫기버튼().click();
    await verify('이벤트 띠의 X 를 누르면 띠가 닫힌다', await 홈.이벤트띠().isVisible(), false);
  });
});

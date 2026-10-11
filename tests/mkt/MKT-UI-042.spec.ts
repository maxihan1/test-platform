import { defineCase, test, verify } from '@platform/kit';

import { 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-042',
  name: '홈 배너 좌우에 「이전」 · 「다음」 화살표와 아래에 점 3개가 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('홈을 연다', async () => {
    await 방해막기(page);
    await 홈.열기();
    await 홈.점들.first().waitFor();
    await verify(
      '홈 배너 좌우에 「이전」 · 「다음」 화살표와 아래에 점 3개가 보인다',
      { 이전화살표: await 홈.이전.isVisible(), 다음화살표: await 홈.다음.isVisible(), 점개수: await 홈.점들.count() },
      { 이전화살표: true, 다음화살표: true, 점개수: 3 },
    );
  });
});

import { defineCase, test, verify } from '@platform/kit';

import { 세션아이디 } from './helpers/common-tools.helper.js';
import { 브라우저시각 } from './helpers/member-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-040',
  name: '23:59:50 에 연 홈의 카운트다운은 「00:00:10」이다',
  precondition: ['브라우저 시계가 23:59:50 이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('브라우저 시계를 23:59:50 으로 맞춘다', async () => {
    await page.clock.setFixedTime(new Date(2026, 9, 11, 23, 59, 50));
    await 방해막기(page);
    await 홈.열기();
    await verify('브라우저 시계가 23:59:50 이다', await 브라우저시각(page), '23:59:50', { blocker: true });
  });

  await test.step('홈을 연다', async () => {
    await 홈.열기();
    await 홈.시계.filter({ hasText: /\d\d:\d\d:\d\d/ }).waitFor();
    await verify('23:59:50 에 연 홈의 카운트다운은 「00:00:10」이다', await 홈.시계.innerText(), '00:00:10');
  });
});

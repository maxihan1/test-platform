import { defineCase, test, verify } from '@platform/kit';

import { 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-041',
  name: '브라우저 시각이 23시 59분 50초이면 타임세일 카운트다운이 「00:00:10」으로 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('브라우저 시각을 23시 59분 50초로 두고 홈을 연다', async () => {
    await page.clock.setFixedTime(new Date(2026, 9, 11, 23, 59, 50));
    await 방해막기(page);
    await 홈.열기();
    await 홈.시계.filter({ hasText: /\d\d:\d\d:\d\d/ }).waitFor();
    await verify('브라우저 시각이 23시 59분 50초이면 타임세일 카운트다운이 「00:00:10」으로 보인다', await 홈.시계.innerText(), '00:00:10');
  });
});

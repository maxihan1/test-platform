import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 개인정보와도달화면 } from './pages/privacy-settings.page.js';
import { 로그인화면 } from './pages/sign-in.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-160',
  name: '비회원으로 설정 화면 주소를 열면 「계속 하려면 로그인을 해야 합니다.」가 보인다',
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: null,
});

test(spec, async ({ page }) => {
  const 설정 = new 개인정보와도달화면(page);
  const 로그인 = new 로그인화면(page);

  await test.step('비회원으로 설정 화면 주소를 연다', async () => {
    await 한국어로(page);
    await 설정.비회원으로열기();
    await 로그인.그려질때까지();
    await verify('주소가 로그인 화면으로 바뀐다', new URL(page.url()).pathname, 로그인화면.주소);
    await verify(
      '비회원으로 설정 화면 주소를 열면 「계속 하려면 로그인을 해야 합니다.」가 보인다',
      await 로그인.안내('계속 하려면 로그인을 해야 합니다.').isVisible(),
      true,
    );
  });
});

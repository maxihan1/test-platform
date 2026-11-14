import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 로그인화면 } from './pages/sign-in.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-055',
  name: '로그인 화면에 제목 「mastodon.maxihan.com에 로그인」이 보인다',
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: null,
});

test(spec, async ({ page }) => {
  const 로그인 = new 로그인화면(page);

  await test.step('로그인 화면을 연다', async () => {
    await 한국어로(page);
    await 로그인.열기();
    await verify('로그인 화면에 제목 「mastodon.maxihan.com에 로그인」이 보인다', await 로그인.제목.isVisible(), true);
    await verify('「만약 내 계정이 다른 서버에 존재한다면, 여기서는 로그인 할 수 없습니다.」 안내가 보인다', await 로그인.안내문.isVisible(), true);
  });
});

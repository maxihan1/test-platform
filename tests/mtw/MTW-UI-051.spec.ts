import { defineCase, test, verify } from '@platform/kit';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 실시간피드화면 } from './pages/public-feed.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-051',
  name: '로그인 안내 창에 「이 서버에서」 · 「다른 서버에」 선택이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 실시간피드화면(page);

  await test.step('로그인 전 실시간 피드를 연다', async () => {
    await 한국어로(page);
    await 화면.열기();
    await verify('실시간 피드에 글이 보인다', await 화면.첫글.isVisible(), true, { blocker: true });
  });

  await test.step('로그인 전 실시간 피드에서 글의 「좋아요」를 눌러 로그인 안내 창을 연다', async () => {
    await 화면.좋아요.click();
    await 화면.안내창.창.waitFor();
    const 이서버 = await verify('로그인 안내 창에 「이 서버에서」 선택이 보인다', await 화면.안내창.글('이 서버에서').isVisible(), true);
    const 다른서버 = await verify('로그인 안내 창에 「다른 서버에」 선택이 보인다', await 화면.안내창.글('다른 서버에').isVisible(), true);
    await verify('로그인 안내 창에 「이 서버에서」 · 「다른 서버에」 선택이 보인다', 이서버 && 다른서버, true);
  });
});

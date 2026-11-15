import { defineCase, test, verify } from '@platform/kit';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 실시간피드화면 } from './pages/public-feed.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-051',
  name: '로그인 안내 창에 서버 주소 입력칸 · 「이동」 버튼 · 「계정 생성」 링크가 보인다',
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
    const 입력칸 = await verify('로그인 안내 창에 서버 주소 입력칸이 보인다', await 화면.안내창.서버칸.isVisible(), true);
    const 이동 = await verify('로그인 안내 창에 「이동」 버튼이 보인다', await 화면.안내창.이동.isVisible(), true);
    const 계정생성 = await verify('로그인 안내 창에 「계정 생성」 링크가 보인다', await 화면.안내창.계정생성.isVisible(), true);
    await verify('로그인 안내 창에 서버 주소 입력칸 · 「이동」 버튼 · 「계정 생성」 링크가 보인다', 입력칸 && 이동 && 계정생성, true);
  });
});

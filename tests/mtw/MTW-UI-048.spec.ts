import { defineCase, test, verify } from '@platform/kit';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 실시간피드화면 } from './pages/public-feed.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-048',
  name: '로그인 전 실시간 피드에서 글의 「인용」을 누르면 로그인 안내 창이 뜬다',
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

  await test.step('로그인 전 실시간 피드에서 글의 「인용」을 누른다', async () => {
    await 화면.부스트.click();
    const 떴다 = await 화면.안내창.창.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('로그인 전 실시간 피드에서 글의 「인용」을 누르면 로그인 안내 창이 뜬다', 떴다, true);
    await 화면.안내창닫기();
  });

  await test.step('로그인 전 실시간 피드에서 글의 「답장」을 누른다', async () => {
    await 화면.답장.click();
    const 떴다 = await 화면.안내창.창.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('실시간 피드 글의 「답장」도 로그인 안내 창을 띄운다', 떴다, true);
  });
});

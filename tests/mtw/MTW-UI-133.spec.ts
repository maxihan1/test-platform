import { defineCase, test, verify } from '@platform/kit';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 실시간피드화면 } from './pages/public-feed.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-133',
  name: '비회원 실시간 피드 글 카드의 「북마크」는 누를 수 없다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 실시간피드화면(page);

  await test.step('비회원으로 실시간 피드를 연다', async () => {
    await 한국어로(page);
    await 화면.열기();
    await verify('실시간 피드에 글이 보인다', await 화면.첫글.isVisible(), true, { blocker: true });
    await verify('비회원 실시간 피드 글 카드의 「북마크」는 누를 수 없다', await 화면.북마크.isDisabled(), true);
  });
});

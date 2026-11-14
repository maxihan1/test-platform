import { defineCase, test, verify } from '@platform/kit';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 실시간피드화면 } from './pages/public-feed.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-041',
  name: '실시간 피드 머리말 배너의 「지우기」를 누르면 배너가 닫힌다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 실시간피드화면(page);
  const 안내 = '여기 있는 것들은 계정이 mastodon.maxihan.com에 있는 사람들의 최근 공개 게시물들입니다.';

  await test.step('실시간 피드를 연다', async () => {
    await 한국어로(page);
    await 화면.열기();
    await verify('실시간 피드 머리말 배너가 보인다', await 화면.머리말(안내).isVisible(), true, { blocker: true });
  });

  await test.step('실시간 피드 머리말 배너의 「지우기」를 누른다', async () => {
    await 화면.지우기.click();
    const 닫혔다 = await 화면.머리말(안내).waitFor({ state: 'hidden', timeout: 10_000 }).then(() => true, () => false);
    await verify('실시간 피드 머리말 배너의 「지우기」를 누르면 배너가 닫힌다', 닫혔다, true);
  });
});

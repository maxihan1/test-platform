import { defineCase, test, verify } from '@platform/kit';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 실시간피드화면 } from './pages/public-feed.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-039',
  name: '실시간 피드 「이 서버」 머리말에 「여기 있는 것들은 계정이 mastodon.maxihan.com에 있는 사람들의 최근 공개 게시물들입니다.」가 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 실시간피드화면(page);

  await test.step('실시간 피드 「이 서버」를 연다', async () => {
    await 한국어로(page);
    await 화면.열기();
    await verify('실시간 피드에 「이 서버」 탭이 보인다', await 화면.이서버탭.isVisible(), true, { blocker: true });
    await verify(
      '실시간 피드 「이 서버」 머리말에 「여기 있는 것들은 계정이 mastodon.maxihan.com에 있는 사람들의 최근 공개 게시물들입니다.」가 보인다',
      await 화면.머리말('여기 있는 것들은 계정이 mastodon.maxihan.com에 있는 사람들의 최근 공개 게시물들입니다.').isVisible(),
      true,
    );
  });
});

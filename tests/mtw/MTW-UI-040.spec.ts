import { defineCase, test, verify } from '@platform/kit';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 실시간피드화면 } from './pages/public-feed.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-040',
  name: '실시간 피드 「다른 서버」 머리말에 「이 게시물들은 mastodon.maxihan.com에 있는 사람들이 팔로우하는 페디버스 사용자들의 최신 공개 게시물입니다.」가 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 실시간피드화면(page);
  const 안내 = '이 게시물들은 mastodon.maxihan.com에 있는 사람들이 팔로우하는 페디버스 사용자들의 최신 공개 게시물입니다.';

  await test.step('실시간 피드 「다른 서버」를 연다', async () => {
    await 한국어로(page);
    await 화면.다른서버열기();
    await verify('실시간 피드에 「다른 서버」 탭이 보인다', await 화면.다른서버탭.isVisible(), true, { blocker: true });
    await verify(
      '실시간 피드 「다른 서버」 머리말에 「이 게시물들은 mastodon.maxihan.com에 있는 사람들이 팔로우하는 페디버스 사용자들의 최신 공개 게시물입니다.」가 보인다',
      await 화면.머리말(안내).isVisible(),
      true,
    );
  });

  await test.step('실시간 피드 「모두」를 연다', async () => {
    await 화면.모두열기();
    await verify('실시간 피드에 「모두」 탭이 보인다', await 화면.모두탭.isVisible(), true, { blocker: true });
    await verify('「모두」 머리말에도 같은 페디버스 안내가 보인다', await 화면.머리말(안내).isVisible(), true);
  });
});

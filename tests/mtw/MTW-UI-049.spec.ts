import { defineCase, test, verify } from '@platform/kit';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 실시간피드화면 } from './pages/public-feed.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-049',
  name: '글에서 연 로그인 안내 창에 「로그인해서 계속하기」와 「{이름} 님의 게시물과 상호작용하려면 이용 중인 마스토돈 서버 계정으로 로그인하세요.」가 보인다',
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

  await test.step('로그인 전 실시간 피드에서 글의 「좋아요」를 누른다', async () => {
    const 이름 = await 화면.첫글작성자.innerText();
    await 화면.좋아요.click();
    await 화면.안내창.창.waitFor();
    const 제목 = await verify('로그인 안내 창에 「로그인해서 계속하기」가 보인다', await 화면.안내창.제목.isVisible(), true);
    const 안내 = await verify(
      '로그인 안내 창에 「{이름} 님의 게시물과 상호작용하려면 이용 중인 마스토돈 서버 계정으로 로그인하세요.」가 보인다',
      await 화면.안내창.글(`${이름} 님의 게시물과 상호작용하려면 이용 중인 마스토돈 서버 계정으로 로그인하세요.`).isVisible(),
      true,
    );
    await verify('글에서 연 로그인 안내 창에 「로그인해서 계속하기」와 「{이름} 님의 게시물과 상호작용하려면 이용 중인 마스토돈 서버 계정으로 로그인하세요.」가 보인다', 제목 && 안내, true);
  });
});

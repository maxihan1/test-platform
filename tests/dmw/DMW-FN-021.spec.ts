import { defineCase, test, verify } from '@platform/kit';

import { 바닥글 } from './components/footer.component.js';
import { 두프레임기다리기 } from './helpers/common-tools.helper.js';
import { 로그인상태인가, 스크롤멈출때까지 } from './helpers/board-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-021',
  name: '한 화면 이상 내리면 오른쪽 아래에 「맨 위로」 버튼이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);
  const 바닥 = new 바닥글(page);

  await test.step('게시판 목록 화면을 연다', async () => {
    const 화면 = page.viewportSize();
    if (화면 === null) throw new Error('화면 크기를 읽지 못했다');
    await page.setViewportSize({ width: 화면.width, height: 300 });
    await 안내창막기(page);
    await 목록.열기();
    await 바닥.그려질때까지();
    await verify('비회원이다', await 로그인상태인가(page, '비회원'), true, { blocker: true });
    await verify('게시판 목록 화면 제목 「커뮤니티」가 보인다', await 목록.큰제목.isVisible(), true, { blocker: true });
  });

  await test.step('게시판 목록을 한 화면 이상 내린다', async () => {
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForFunction(() => window.scrollY >= window.innerHeight);
    await 두프레임기다리기(page);
    const 상자 = await 바닥.맨위로.boundingBox();
    const 화면 = page.viewportSize();
    if (상자 === null || 화면 === null) throw new Error('「맨 위로」 버튼이나 화면 크기를 읽지 못했다');
    const 보임 = await verify('「맨 위로」 버튼이 보인다', await 바닥.맨위로.isVisible(), true);
    const 오른쪽 = await verify('「맨 위로」 버튼이 화면 오른쪽에 있다', 상자.x + 상자.width / 2 > 화면.width / 2, true);
    const 아래 = await verify('「맨 위로」 버튼이 화면 아래쪽에 있다', 상자.y + 상자.height / 2 > 화면.height / 2, true);
    await verify('한 화면 이상 내리면 오른쪽 아래에 「맨 위로」 버튼이 보인다', 보임 && 오른쪽 && 아래, true);
  });

  await test.step('「맨 위로」를 누른다', async () => {
    await 바닥.맨위로.click();
    await 스크롤멈출때까지(page);
    await verify('「맨 위로」를 누르면 화면이 맨 위로 올라간다', await page.evaluate(() => window.scrollY), 0);
  });
});

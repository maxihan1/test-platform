import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 방해막기 } from './helpers/account.helper.js';
import { 글목록500걸기 } from './helpers/board.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-043',
  name: '게시글 목록 응답이 500 이면 게시판 목록 화면이 깨지지 않고 오류 안내가 보인다',
  platforms: ['desktop'],
  precondition: ['게시글 목록 응답은 500 가짜 응답(모킹)이다'],
  techniques: ['오류 추정'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);
  const 머리 = new 머리글(page);
  let 풀기: (() => Promise<void>) | undefined;

  try {
    await test.step('게시글 목록 응답을 500 으로 주고 게시판 목록 화면을 연다', async () => {
      await 방해막기(page);
      풀기 = await 글목록500걸기(page.context());
      await page.goto(게시판목록화면.주소);
      await 목록.오류안내.waitFor();
      await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
      await verify(
        '게시글 목록 응답이 500 이면 게시판 목록 화면이 깨지지 않고 오류 안내가 보인다',
        { 화면제목: await 목록.제목.isVisible(), 분류탭: await 목록.탭들.count(), 오류안내: (await 목록.보이는오류안내()).length > 0 },
        { 화면제목: true, 분류탭: 4, 오류안내: true },
      );
    });
  } finally {
    if (풀기 !== undefined) await 풀기();
  }
});

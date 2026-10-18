import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-524',
  name: '게시글 목록 응답이 서버 오류면 게시판 화면이 깨지지 않고 오류 안내가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['게시글 목록 응답은 가짜 500 응답(모킹)이다'],
  techniques: ['오류 추정'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);
  const 목록주소 = /\/api\/posts\?/;

  try {
    await test.step('게시글 목록 응답을 가짜 500 응답으로 바꾼다', async () => {
      await page.context().route(목록주소, (경로) =>
        경로.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ code: 'INTERNAL', message: '서버 오류가 발생했습니다' }) }),
      );
      await 방해창막기(page);
    });

    await test.step('게시판 목록 화면을 연다', async () => {
      await 목록.열기();
      await verify('게시판 화면 제목 「커뮤니티」가 보인다', await 목록.제목.isVisible(), true, { blocker: true });
      await verify('게시글 목록 응답이 서버 오류면 게시판 화면이 깨지지 않고 오류 안내가 보인다', [await 목록.제목.isVisible(), await 목록.빈상태.isVisible()], [true, true]);
    });
  } finally {
    await page.context().unroute(목록주소);
  }
});

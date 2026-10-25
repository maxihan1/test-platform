import { defineCase, test, verify } from '@platform/kit';

import { 로그인상태인가 } from './helpers/board-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-502',
  name: '게시글 목록 응답이 서버 오류면 화면이 깨지지 않고 오류 안내가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다', '게시글 목록 응답은 가짜 응답(모킹)이다'],
  params: null,
  expected: null,
  techniques: ['오류 추정'],
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);
  const 대상 = (주소: URL): boolean => 주소.pathname === '/api/posts';
  const 서버오류 = async (경로: import('@playwright/test').Route): Promise<void> => {
    if (경로.request().method() !== 'GET') {
      await 경로.fallback();
      return;
    }
    await 경로.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ code: 'INTERNAL', message: '잠시 후 다시 시도해 주세요' }) });
  };

  try {
    await test.step('게시글 목록 응답을 서버 오류로 바꿔 둔다', async () => {
      await page.context().route(대상, 서버오류);
      await 안내창막기(page);
    });

    await test.step('게시글 목록 응답을 서버 오류로 둔 채 게시판 목록을 연다', async () => {
      await 목록.열기();
      await verify('비회원이다', await 로그인상태인가(page, '비회원'), true, { blocker: true });
      const 제목 = await verify('게시판 목록 화면 제목 「커뮤니티」가 보인다', await 목록.큰제목.isVisible(), true);
      const 표없음 = await verify('게시글 표가 보이지 않는다', await 목록.표.count(), 0);
      const 안내글 = (await 목록.본문영역.innerText()).trim();
      const 안내 = await verify('오류 안내 글이 보인다', 안내글.length > 0, true);
      await verify('게시글 목록 응답이 서버 오류면 화면이 깨지지 않고 오류 안내가 보인다', 제목 && 표없음 && 안내, true);
    });
  } finally {
    await page.context().unroute(대상, 서버오류);
  }
});

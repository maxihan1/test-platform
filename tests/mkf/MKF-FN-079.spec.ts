import { defineCase, test, verify } from '@platform/kit';

import { 게시글목록실패모킹, 목록응답이실패로오나 } from './helpers/board-mock.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-079',
  name: '게시글 목록 응답이 서버 오류면 「잠시 후 다시 시도해 주세요」가 보인다',
  precondition: ['게시글 목록 응답은 서버 오류 500 가짜 응답(모킹)이다'],
  techniques: ['오류 추정'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);
  let 모킹풀기: (() => Promise<void>) | undefined;

  await 방해막기(page);
  try {
    await test.step('게시글 목록 응답을 가짜로 바꾼다', async () => {
      모킹풀기 = await 게시글목록실패모킹(page);
    });

    await test.step('게시글 목록 응답이 가짜인지 확인한다', async () => {
      await verify('게시글 목록 응답은 서버 오류 500 가짜 응답(모킹)이다', await 목록응답이실패로오나(page), true, { blocker: true });
    });

    await test.step('게시판 목록을 연다', async () => {
      await 목록.열기();
      await 목록.표자리안내.first().waitFor();
      await verify('게시글 목록 응답이 서버 오류면 「잠시 후 다시 시도해 주세요」가 보인다', await 목록.실패안내.isVisible(), true);
    });
  } finally {
    await 모킹풀기?.();
  }
});

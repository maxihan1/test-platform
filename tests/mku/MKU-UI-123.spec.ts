import { defineCase, test, verify } from '@platform/kit';

import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKU-UI-123',
  name: '오늘 전에 쓴 글은 목록 작성일에 「2026-09-20」처럼 날짜만 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);
  await 방해막기(page);

  await test.step('게시판 목록을 연다', async () => {
    await 목록.열기();
    await 목록.그려질때까지();
    const 공지들 = await 목록.공지행들();
    await verify('오늘 전에 쓴 글은 목록 작성일에 「2026-09-20」처럼 날짜만 보인다', 공지들.length > 0 && 공지들.every((행) => /^\d{4}-\d{2}-\d{2}$/.test(행.작성일)), true);
  });
});

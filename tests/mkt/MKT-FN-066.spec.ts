import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 게시판목록 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-066',
  name: '게시판 첫 페이지 표에는 일반 글 10건과 공지 2건을 합친 열두 줄이 보인다',
  platforms: ['desktop'],
  unconfirmed: '기획서와 다름 — 차이 D9: 기획서는 한 페이지에 10개씩이라고 하는데 화면은 일반 글 10건에 공지 2건을 더해 12줄을 보여 준다 (작성 요청 5873)',
  precondition: ['비회원이다', '게시판 목록의 첫 페이지다'],
  params: z.object({}),
  expected: z.object({
    rows: z.number().describe('첫 페이지 표의 줄 수').default(12),
  }),
});

test(spec, async ({ page, expected }) => {
  const 목록 = new 게시판목록(page);

  await test.step('게시판 목록 화면을 연다', async () => {
    await page.context().addInitScript(() => localStorage.setItem('dm_cookie_ok', '1'));
    await 목록.열기();
    await 목록.줄이뜰때까지();
  });

  await test.step('표의 줄 수를 센다', async () => {
    await verify('게시판 첫 페이지 표에는 일반 글 10건과 공지 2건을 합친 열두 줄이 보인다', await 목록.모든줄.count(), expected.rows);
  });
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 게시판목록화면 } from './pages/common-board.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-019',
  name: '게시판 목록에서 검색어 한 글자로 검색하면 처리 결과 토스트가 화면 아래 가운데에 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: z.object({
    검색어: z.string().describe('검색어').default('가'),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 게시판 = new 게시판목록화면(page);

  await test.step('게시판 목록 화면을 연다', async () => {
    await 안내창끄기(page);
    await 게시판.열기();
    await verify('비회원이다', await 게시판.머리글.로그인링크.isVisible(), true, { blocker: true });
  });

  await test.step('게시판 목록에서 검색어 「가」로 검색한다', async () => {
    await 게시판.검색하기(params.검색어);
    await 게시판.토스트.전부.first().waitFor();
    await verify(
      '게시판 목록에서 검색어 한 글자로 검색하면 처리 결과 토스트가 화면 아래 가운데에 보인다',
      { 보임: await 게시판.토스트.전부.first().isVisible(), ...(await 게시판.토스트위치()) },
      { 보임: true, 가운데: true, 아래: true },
    );
  });

  await test.step('토스트가 뜬 뒤 3초를 기다린다', async () => {
    await page.waitForTimeout(3200);
    await verify('3초가 지나면 토스트가 사라진다', await 게시판.토스트.전부.count(), 0);
  });
});

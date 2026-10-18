import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-128',
  name: '작성자 「김데모」로 검색하면 작성자가 모두 「김데모」인 글만 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: z.object({
    author: z.string().describe('검색할 작성자 — 목록에 글이 있는 회원 이름').default('김데모'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 목록 = new 게시판목록화면(page);

  await test.step('게시판 목록 화면을 연다', async () => {
    await 방해창막기(page);
    await 목록.열기();
    await verify('비회원이라 머리글에 「로그아웃」이 없다', await 목록.머리글.로그아웃버튼.count(), 0, { blocker: true });
    await verify('게시판 목록 제목 「커뮤니티」가 보인다', await 목록.제목.isVisible(), true, { blocker: true });
  });

  await test.step('검색 조건 「작성자」를 고르고 「김데모」로 검색한다', async () => {
    await 목록.조건으로검색하기('작성자', params.author);
    const 작성자들 = (await 목록.일반행글자들()).map((칸) => 칸[3]);
    await verify('작성자 「김데모」로 검색하면 작성자가 모두 「김데모」인 글만 보인다', [...new Set(작성자들)].join(', '), params.author);
  });
});

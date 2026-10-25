import { defineCase, test, verify } from '@platform/kit';

import { 로그인상태인가 } from './helpers/board-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-133',
  name: '분류와 쪽을 바꾼 목록에서 글을 열고 「목록」을 누르면 그 목록으로 돌아간다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);
  const 상세 = new 게시글상세화면(page);

  await test.step('게시판 목록 화면을 연다', async () => {
    await 안내창막기(page);
    await 목록.열기();
    await verify('비회원이다', await 로그인상태인가(page, '비회원'), true, { blocker: true });
    await verify('게시판 목록 화면 제목 「커뮤니티」가 보인다', await 목록.큰제목.isVisible(), true, { blocker: true });
  });

  await test.step('「질문」 탭 2쪽에서 글을 열고 「목록」을 누른다', async () => {
    await 목록.탭누르기('질문');
    await 목록.쪽누르기(2);
    const 제목 = (await 목록.일반행들())[0]?.제목 ?? '';
    await 목록.제목링크(제목).click();
    await 상세.그려질때까지();
    await 상세.목록.click();
    await 목록.그려질때까지();
    await 목록.쪽번호가될때까지(2);
    const 탭 = await verify('「질문」 탭이 선택돼 있다', await 목록.선택된탭(), '질문');
    const 쪽 = await verify('2쪽이 열려 있다', await 목록.현재쪽(), '2');
    const 분류들 = await verify('공지 말고는 분류가 「질문」인 글만 보인다', [...new Set((await 목록.일반행들()).map((행) => 행.분류))], ['질문']);
    await verify('분류와 쪽을 바꾼 목록에서 글을 열고 「목록」을 누르면 그 목록으로 돌아간다', 탭 && 쪽 && 분류들, true);
  });
});

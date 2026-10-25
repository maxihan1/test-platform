import { defineCase, test, verify } from '@platform/kit';

import { 화면제목 } from './components/page-heading.component.js';
import { 로그인상태인가 } from './helpers/board-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-348',
  name: '게시판 목록 버튼 반응',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);
  const 상세 = new 게시글상세화면(page);
  const 제목 = new 화면제목(page);

  await test.step('게시판 목록 화면을 연다', async () => {
    await 안내창막기(page);
    await 목록.열기();
    await verify('비회원이다', await 로그인상태인가(page, '비회원'), true, { blocker: true });
    await verify('게시판 목록 화면 제목 「커뮤니티」가 보인다', await 목록.큰제목.isVisible(), true, { blocker: true });
  });

  await test.step('게시판 목록의 「글쓰기」를 누른다', async () => {
    await 목록.글쓰기.click();
    await 제목.글('로그인').waitFor();
    await verify('게시판 목록에서 비회원이 「글쓰기」를 누르면 로그인 화면이 보인다', await 제목.글('로그인').isVisible(), true);
  });

  await test.step('게시판 목록 페이지 「2」를 누른다', async () => {
    await 목록.열기();
    await 목록.쪽(2).click();
    await 목록.그려질때까지();
    await verify('게시판 목록에서 페이지 「2」를 누르면 2쪽 목록이 보인다', await 목록.현재쪽(), '2');
  });

  await test.step('게시판 목록의 글 제목을 누른다', async () => {
    await 목록.열기();
    const 글제목 = (await 목록.일반행들())[0]?.제목 ?? '';
    await 목록.제목링크(글제목).first().click();
    await 상세.그려질때까지();
    await verify('게시판 목록에서 글 제목을 누르면 그 게시글 상세가 보인다', await 상세.제목.innerText(), 글제목);
  });
});

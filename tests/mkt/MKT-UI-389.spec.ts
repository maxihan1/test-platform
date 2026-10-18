import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 로그인요청 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 게시글화면 } from './pages/post.page.js';
import { 게시판목록화면 } from './pages/board-list.page.js';
import { 글쓰기화면 } from './pages/write.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-389',
  name: '게시판 목록에서 「자유」를 누르면 「자유」 탭이 골라진다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다', '회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 목록 = new 게시판목록화면(page);
  const 글 = new 게시글화면(page);
  const 쓰기 = new 글쓰기화면(page);

  await test.step('게시판 목록 화면을 연다', async () => {
    await 방해창막기(page);
    await 목록.열기();
    await verify('비회원이라 머리글에 「로그아웃」이 없다', await 목록.머리글.로그아웃버튼.count(), 0, { blocker: true });
    await verify('게시판 목록 제목 「커뮤니티」가 보인다', await 목록.제목.isVisible(), true, { blocker: true });
  });

  await test.step('게시판 목록에서 「자유」를 누른다', async () => {
    await 목록.탭누르기('자유');
    await verify('게시판 목록에서 「자유」를 누르면 「자유」 탭이 골라진다', await 목록.탭('자유').getAttribute('aria-selected'), 'true');
  });

  await test.step('게시판 목록에서 「첫 글 제목」을 누른다', async () => {
    const 첫글링크 = 목록.글링크들.first();
    const 첫글제목 = await 첫글링크.innerText();
    await 첫글링크.click();
    await 글.댓글불러올때까지();
    await verify('게시판 목록에서 「첫 글 제목」을 누르면 그 글의 게시글 상세가 보인다', await 글.제목.innerText(), 첫글제목);
    await 목록.열기();
  });

  await test.step('게시판 목록에서 「2」를 누른다', async () => {
    await 목록.쪽누르기(2);
    await verify('게시판 목록에서 「2」를 누르면 2쪽 목록이 보인다', await 목록.현재쪽.innerText(), '2');
  });

  await test.step('게시판 목록에서 「검색」을 누른다', async () => {
    await verify('게시판 목록에서 「검색」을 누르면 버튼이 보이고 누를 수 있다', (await 목록.검색버튼.isVisible()) && (await 목록.검색버튼.isEnabled()), true);
  });

  await test.step('회원으로 로그인하고 게시판 목록 화면을 다시 연다', async () => {
    await 로그인요청(page.request, params.loginId ?? '', params.loginPassword ?? '');
    await 목록.열기();
    await 목록.머리글.로그인꼴일때까지();
    await verify('회원으로 로그인해 머리글에 「로그아웃」이 있다', await 목록.머리글.로그아웃버튼.count(), 1, { blocker: true });
  });

  await test.step('게시판 목록에서 「글쓰기」를 누른다', async () => {
    await 목록.글쓰기링크.click();
    await 쓰기.그려질때까지();
    await verify('게시판 목록에서 「글쓰기」를 누르면 글쓰기 화면이 보인다', await 쓰기.글쓰기제목.isVisible(), true);
  });
});

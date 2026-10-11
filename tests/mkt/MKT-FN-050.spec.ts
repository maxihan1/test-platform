import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 고유제목, 글머리 } from './helpers/board.helper.js';
import { 글만들기, 글지우기, 지난글치우기 } from './helpers/post.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-050',
  name: '게시글 상세를 다시 열면 조회수가 1 오른다',
  platforms: ['desktop'],
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 게시글상세화면(page);
  const 목록 = new 게시판목록화면(page);
  const 머리 = new 머리글(page);
  const 제목 = 고유제목(spec.tcId, '상세 조작');
  let 글번호 = 0;
  let 처음조회수 = 0;
  let 처음좋아요 = 0;

  try {
    await test.step('회원으로 로그인해 글을 하나 만든다', async () => {
      await 방해막기(page);
      await 화면로그인(page, params.loginId ?? '', params.password ?? '');
      await 지난글치우기(page.request, 글머리(spec.tcId));
      글번호 = await 글만들기(page.request, { title: 제목 });
      await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
    });

    await test.step('게시글 상세를 연다', async () => {
      await 상세.열기(글번호);
      처음조회수 = await 상세.조회수읽기();
      처음좋아요 = await 상세.좋아요수읽기();
      await verify('게시글 상세 제목이 방금 만든 글의 제목이다', await 상세.제목.innerText(), 제목, { blocker: true });
    });

    await test.step('같은 게시글 상세를 다시 연다', async () => {
      await 상세.열기(글번호);
      await verify('게시글 상세를 다시 열면 조회수가 1 오른다', (await 상세.조회수읽기()) - 처음조회수, 1);
    });

    await test.step('게시글 상세에서 「좋아요」 를 누른다', async () => {
      await 상세.좋아요누르고기다리기(true);
      await verify('「좋아요」 를 누르면 좋아요 수가 1 오른다', (await 상세.좋아요수읽기()) - 처음좋아요, 1);
      await verify('「좋아요」 를 누르면 버튼이 채워진 하트로 바뀐다', (await 상세.좋아요글자()).startsWith('♥'), true);
    });

    await test.step('좋아요를 누른 상세를 새로 고친다', async () => {
      await page.reload();
      await 상세.좋아요버튼.waitFor();
      await verify(
        '좋아요를 누르고 새로 고치면 버튼은 눌린 채이고 좋아요 수는 1만 올라 있다',
        { 눌림: await 상세.좋아요버튼.getAttribute('aria-pressed'), 수: await 상세.좋아요수읽기() },
        { 눌림: 'true', 수: 처음좋아요 + 1 },
      );
    });

    await test.step('「좋아요」 를 다시 누른다', async () => {
      await 상세.좋아요누르고기다리기(false);
      await verify('좋아요를 다시 누르면 좋아요 수가 누르기 전으로 돌아온다', await 상세.좋아요수읽기(), 처음좋아요);
    });

    await test.step('목록에서 분류와 페이지를 바꾸고 들어온 상세에서 「목록」 을 누른다', async () => {
      await 목록.열기();
      await 목록.탭누르기('질문');
      await 목록.쪽누르기(2);
      const 들어온주소 = page.url();
      await 목록.표.getByRole('link').last().click();
      await 상세.목록링크.waitFor();
      await 상세.목록링크.click();
      await 목록.불러오기기다리기();
      await verify(
        '상세에서 「목록」 을 누르면 들어오기 전 분류 · 페이지의 목록으로 돌아간다',
        { 주소: page.url(), 선택된탭: await 목록.선택된탭('질문').count(), 현재쪽: await 목록.현재쪽.innerText() },
        { 주소: 들어온주소, 선택된탭: 1, 현재쪽: '2' },
      );
    });
  } finally {
    if (글번호 !== 0) await 글지우기(page.request, 글번호);
    await 지난글치우기(page.request, 글머리(spec.tcId));
  }
});

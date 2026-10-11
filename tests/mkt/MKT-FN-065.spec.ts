import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 고유제목, 글머리, 제목으로찾은글수 } from './helpers/board.helper.js';
import { 지난글치우기 } from './helpers/post.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';
import { 글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-065',
  name: '글 「등록」 을 빠르게 두 번 눌러도 글은 하나만 생긴다',
  platforms: ['desktop'],
  precondition: ['회원으로 글쓰기 화면을 열었다'],
  techniques: ['오류 추정'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 글쓰기 = new 글쓰기화면(page);
  const 상세 = new 게시글상세화면(page);
  const 머리 = new 머리글(page);
  const 제목 = 고유제목(spec.tcId, '두 번');

  try {
    await test.step('회원으로 로그인해 글쓰기 화면을 연다', async () => {
      await 방해막기(page);
      await 화면로그인(page, params.loginId ?? '', params.password ?? '');
      await 지난글치우기(page.request, 글머리(spec.tcId));
      await 글쓰기.열기();
      await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
      await verify('글쓰기 화면 제목이 「글쓰기」 이다', await 글쓰기.화면제목.innerText(), '글쓰기', { blocker: true });
    });

    await test.step('글을 채우고 「등록」 을 빠르게 두 번 누른다', async () => {
      await 글쓰기.채우기({ 분류: '자유', 제목, 본문: '등록을 두 번 눌러 보는 글의 본문입니다.' });
      await 글쓰기.등록두번누르기();
      await 상세.좋아요버튼.waitFor();
      await page.waitForLoadState('networkidle');
      await verify('글 「등록」 을 빠르게 두 번 눌러도 글은 하나만 생긴다', await 제목으로찾은글수(page.request, 제목), 1);
    });
  } finally {
    await 지난글치우기(page.request, 글머리(spec.tcId));
  }
});

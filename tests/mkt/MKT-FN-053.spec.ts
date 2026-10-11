import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 관리자세션걸기, 남의시드글 } from './helpers/board.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-053',
  name: '관리자 세션으로 남의 글 상세를 열면 「삭제」 만 보이고 「수정」 은 보이지 않는다',
  platforms: ['desktop'],
  precondition: ['로그인 회원 응답은 관리자로 바꾼 가짜 응답(모킹)이다'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 게시글상세화면(page);
  const 머리 = new 머리글(page);
  let 풀기: (() => Promise<void>) | undefined;

  try {
    await test.step('회원으로 로그인한다', async () => {
      await 방해막기(page);
      await 화면로그인(page, params.loginId ?? '', params.password ?? '');
      await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
    });

    await test.step('관리자 세션 응답으로 남의 글 상세를 연다', async () => {
      풀기 = await 관리자세션걸기(page.context());
      await 상세.열기(남의시드글);
      await 상세.댓글불러오기기다리기();
      await verify(
        '관리자 세션으로 남의 글 상세를 열면 「삭제」 만 보이고 「수정」 은 보이지 않는다',
        { 삭제: await 상세.삭제버튼.isVisible(), 수정: await 상세.수정링크.isVisible() },
        { 삭제: true, 수정: false },
      );
    });
  } finally {
    if (풀기 !== undefined) await 풀기();
  }
});

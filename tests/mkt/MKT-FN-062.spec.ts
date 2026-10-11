import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 고유제목, 글머리, 둘째회원문맥 } from './helpers/board.helper.js';
import { 글만들기, 글지우기, 댓글달기, 지난글치우기 } from './helpers/post.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-062',
  name: '남이 내 글에 댓글을 달면 내 알림 목록에 그 알림이 보인다',
  platforms: ['desktop'],
  precondition: ['회원이 직접 쓴 글이 하나 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 머리 = new 머리글(page);
  const 제목 = 고유제목(spec.tcId, '알림');
  let 글번호 = 0;

  try {
    await test.step('회원으로 로그인해 글을 하나 만든다', async () => {
      await 방해막기(page);
      await 화면로그인(page, params.loginId ?? '', params.password ?? '');
      await 지난글치우기(page.request, 글머리(spec.tcId));
      글번호 = await 글만들기(page.request, { title: 제목 });
      await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
    });

    await test.step('두 번째 회원이 내 글에 댓글을 단 뒤 알림 종을 누른다', async () => {
      const 둘째 = await 둘째회원문맥(params.password ?? '');
      try {
        await 댓글달기(둘째, 글번호, '둘째 회원이 단 댓글');
      } finally {
        await 둘째.dispose();
      }
      await page.goto('/');
      await 머리.알림종.click();
      await 머리.알림목록.getByRole('link').first().waitFor();
      await verify('남이 내 글에 댓글을 달면 내 알림 목록에 그 알림이 보인다', await 머리.알림목록.getByRole('link').filter({ hasText: 제목 }).count(), 1);
    });
  } finally {
    if (글번호 !== 0) await 글지우기(page.request, 글번호);
    await 지난글치우기(page.request, 글머리(spec.tcId));
  }
});

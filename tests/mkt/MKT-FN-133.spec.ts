import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인, 임시회원가입, 임시회원정보, 임시회원지우기 } from './components/account.component.js';
import { 모달 } from './components/feedback.component.js';
import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';

export const spec = defineCase({
  tcId: 'MKT-FN-133',
  name: '「로그아웃」을 누르면 확인 창 「로그아웃 하시겠습니까?」가 뜬다',
  precondition: ['새로 만든 회원으로 로그인해 있다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 헤더 = new 머리글(page);
  const 창 = new 모달(page);
  const 회원 = 임시회원정보();

  try {
    await test.step('로그인 요청으로 새 회원을 만들어 로그인한다', async () => {
      await 임시회원가입(page.request, 회원);
      await API로그인(page.request, 회원.loginId, 회원.password);
    });

    await test.step('새로 만든 회원으로 로그인해 있는지 확인한다', async () => {
      await 안내창끄기(page);
      await page.goto('/');
      await 헤더.로그아웃버튼.waitFor();
      await verify('로그인한 머리글에 인사말이 보인다', await 헤더.인사.isVisible(), true, { blocker: true });
    });

    await test.step('쇼핑 화면 머리글의 「로그아웃」을 누른다', async () => {
      await page.goto('/shop');
      await 헤더.로그아웃버튼.click();
      await 창.열림기다리기();
      await verify(
        '「로그아웃」을 누르면 확인 창 「로그아웃 하시겠습니까?」가 뜬다',
        await 창.창.filter({ hasText: '로그아웃 하시겠습니까?' }).isVisible(),
        true,
      );
    });

    await test.step('확인 창의 「확인」을 누른다', async () => {
      await 창.버튼('확인').click();
      await 헤더.로그인링크.waitFor();
      await verify(
        '로그아웃되어 홈 화면으로 가고 머리글에 「로그인」이 보인다',
        { 경로: new URL(page.url()).pathname, 로그인보임: await 헤더.로그인링크.isVisible() },
        { 경로: '/', 로그인보임: true },
      );
    });
  } finally {
    await 임시회원지우기(page.request, 회원);
  }
});

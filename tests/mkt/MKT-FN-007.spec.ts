import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 임시회원가입, 임시회원지우기, type 임시회원 } from './components/account.component.js';
import { 있어야한다 } from './components/site-extra.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 로그인화면 } from './pages/common-login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-007',
  name: '회원으로 로그인하면 머리글에 「{이름}님」 · 「마이페이지」 · 「로그아웃」이 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 로그인 = new 로그인화면(page);
  let 회원 = undefined as 임시회원 | undefined;

  try {
    await test.step('새로 만든 회원을 가입시킨다', async () => {
      회원 = await 임시회원가입(page.request);
    });

    await test.step('로그인 화면을 연다', async () => {
      await 안내창끄기(page);
      await 로그인.열기();
      await verify('비회원이다', await 로그인.머리글.로그인링크.isVisible(), true, { blocker: true });
    });

    await test.step('로그인 화면에서 새로 만든 회원으로 로그인한다', async () => {
      const 나 = 있어야한다(회원, '새로 만든 회원');
      await 로그인.로그인하기(나.loginId, 나.password);
      await 로그인.머리글.로그인됐나기다리기();
      await verify(
        '회원으로 로그인하면 머리글에 「{이름}님」 · 「마이페이지」 · 「로그아웃」이 보인다',
        [await 로그인.머리글.인사.innerText(), await 로그인.머리글.마이페이지링크.isVisible(), await 로그인.머리글.로그아웃버튼.isVisible()],
        [`${나.name}님`, true, true],
      );
      await verify('회원 머리글에는 「관리자」 링크가 보이지 않는다', await 로그인.머리글.관리자링크.isVisible(), false);
    });
  } finally {
    if (회원) await 임시회원지우기(page.request, 회원);
  }
});

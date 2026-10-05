import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 임시회원정보 } from './components/account.component.js';
import { 늦춘응답 } from './components/site-extra.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 로그인화면 } from './pages/common-login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-022',
  name: '로그인 응답을 기다리는 동안 「로그인」 버튼이 눌리지 않는다',
  platforms: ['desktop'],
  precondition: ['비회원이다', '로그인 응답은 늦춘 응답이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 로그인 = new 로그인화면(page);
  const 늦춘 = new 늦춘응답(page, '**/api/auth/login');

  try {
    await test.step('로그인 응답을 붙잡아 둔다', async () => {
      await 늦춘.걸기();
    });

    await test.step('로그인 화면을 연다', async () => {
      await 안내창끄기(page);
      await 로그인.열기();
      await verify('비회원이다', await 로그인.머리글.로그인링크.isVisible(), true, { blocker: true });
    });

    await test.step('로그인 화면에서 없는 아이디와 비밀번호를 적고 「로그인」을 누른다', async () => {
      const 없는회원 = 임시회원정보();
      await 로그인.로그인하기(없는회원.loginId, 없는회원.password);
      await 늦춘.도착기다리기();
      await verify('로그인 응답은 늦춘 응답이다', 늦춘.붙잡혔나(), true, { blocker: true });
      await verify('로그인 응답을 기다리는 동안 「로그인」 버튼이 눌리지 않는다', await 로그인.로그인버튼.isDisabled(), true);
      await verify(
        '버튼 글자 「로그인」 대신 로딩 표시가 보인다',
        { 로딩표시: await 로그인.로딩표시.isVisible(), 로그인글자: (await 로그인.로그인버튼.innerText()).includes('로그인') },
        { 로딩표시: true, 로그인글자: false },
      );
    });
  } finally {
    await 늦춘.걷기();
  }
});

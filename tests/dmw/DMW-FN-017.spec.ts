import { defineCase, test, verify } from '@platform/kit';

import { 일회용회원만들기 } from './helpers/account.helper.js';
import { 응답붙잡기 } from './helpers/member-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-017',
  name: '응답을 기다리는 동안 「로그인」 버튼이 눌리지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 로그인 = new 로그인화면(page);
  const 회원 = await 일회용회원만들기(request);
  await 안내창막기(page);

  const 붙잡음 = await 응답붙잡기(page, '**/api/auth/login');
  try {
    await test.step('로그인 화면을 연다', async () => {
      await 로그인.열기();
      await verify('비회원이다', await 로그인.머리.로그인.isVisible(), true, { blocker: true });
      await verify('로그인 화면이 보인다', await 로그인.큰제목.isVisible(), true, { blocker: true });
    });

    await test.step('로그인 응답을 늦춘 채 「로그인」을 누른다', async () => {
      await 로그인.적기(회원.loginId, 회원.password);
      await 로그인.로그인누르기();
      await 로그인.로딩표시.waitFor();
      await verify('응답을 기다리는 동안 「로그인」 버튼이 눌리지 않는다', await 로그인.로그인버튼.isEnabled(), false);
    });

    await test.step('로그인 응답을 늦춘 채 「로그인」 버튼 글자를 확인한다', async () => {
      const 글자 = await verify('「로그인」 버튼 글자가 보이지 않는다', (await 로그인.로그인버튼.innerText()).includes('로그인'), false);
      const 로딩 = await verify('로딩 표시가 보인다', await 로그인.로딩표시.isVisible(), true);
      await verify('응답을 기다리는 동안 「로그인」 버튼 글자 대신 로딩 표시가 보인다', 글자 && 로딩, true);
    });
  } finally {
    await 붙잡음.놓기();
  }
});

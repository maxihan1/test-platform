import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 새회원정보, 회원가입 } from './helpers/account.helper.js';
import { 가입자정리하기, 브라우저닫았다다시열기, 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-078',
  name: '「로그인 상태 유지」를 끄고 로그인하면 브라우저를 다시 열었을 때 머리글에 「로그인」이 보인다',
  precondition: ['새로 가입한 회원이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 계정 = 새회원정보();
  const 로그인 = new 로그인화면(page);
  const 머리 = new 머리글(page);

  try {
    await test.step('새로 가입한 회원을 만든다', async () => {
      await 회원가입(page.request, 계정);
    });

    await test.step('새 회원이 있는지 확인한다', async () => {
      const 응답 = await page.request.get(`/api/auth/check-id?loginId=${계정.loginId}`);
      const 본문 = (await 응답.json()) as { available: boolean };
      await verify('새 회원의 아이디가 이미 쓰이고 있다', 본문.available, false, { blocker: true });
    });

    await test.step('비회원인지 확인한다', async () => {
      await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
    });

    await test.step('「로그인 상태 유지」를 끄고 로그인한 뒤 브라우저를 닫았다 연다', async () => {
      await 방해막기(page);
      await 로그인.열기();
      await 로그인.제목.waitFor();
      await 로그인.로그인하기(계정.loginId, 계정.password);
      await 머리.로그아웃.waitFor();
      const 다시 = await 브라우저닫았다다시열기(page);
      try {
        await 방해막기(다시.새쪽);
        await 다시.새쪽.goto('/');
        const 새머리 = new 머리글(다시.새쪽);
        await 새머리.로고.waitFor();
        await verify('「로그인 상태 유지」를 끄고 로그인하면 브라우저를 다시 열었을 때 머리글에 「로그인」이 보인다', await 새머리.로그인.isVisible(), true);
      } finally {
        await 다시.닫기();
      }
    });
  } finally {
    await 가입자정리하기(page.request, 계정);
  }
});

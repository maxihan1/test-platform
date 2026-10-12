import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 새회원정보, 회원가입 } from './helpers/account.helper.js';
import { 가입자정리하기, 브라우저닫았다다시열기, 세션아이디 } from './helpers/common-tools.helper.js';
import { 아이디쓰이나 } from './helpers/member-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-071',
  name: '「로그인 상태 유지」를 끄고 로그인하면 브라우저를 닫았다 열었을 때 로그아웃되어 있다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 로그인 = new 로그인화면(page);
  const 머리 = new 머리글(page);
  const 정보 = 새회원정보();

  try {
    await test.step('새로 가입한 회원을 만든다', async () => {
      await 회원가입(page.request, 정보);
    });

    await test.step('새로 가입한 회원이 있는지 확인한다', async () => {
      await verify('새로 가입한 회원의 아이디가 이미 쓰이고 있다', await 아이디쓰이나(page.request, 정보.loginId), true, { blocker: true });
    });

    await test.step('비회원인지 확인한다', async () => {
      await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
    });

    await test.step('「로그인 상태 유지」를 끈 채 로그인하고 브라우저를 닫았다 연다', async () => {
      await 방해막기(page);
      await 로그인.열기();
      await 로그인.제목.waitFor();
      await verify('「로그인 상태 유지」가 꺼져 있다', await 로그인.상태유지.isChecked(), false, { blocker: true });
      await 로그인.로그인하기(정보.loginId, 정보.password);
      await 머리.로그아웃.waitFor();
      const 다시 = await 브라우저닫았다다시열기(page);
      try {
        await 방해막기(다시.새쪽);
        await 다시.새쪽.goto('/');
        const 새머리 = new 머리글(다시.새쪽);
        await 새머리.로고.waitFor();
        await verify(
          '「로그인 상태 유지」를 끄고 로그인하면 브라우저를 닫았다 열었을 때 로그아웃되어 있다',
          { 로그인링크: await 새머리.로그인.isVisible(), 로그아웃버튼: await 새머리.로그아웃.isVisible() },
          { 로그인링크: true, 로그아웃버튼: false },
        );
      } finally {
        await 다시.닫기();
      }
    });
  } finally {
    await 가입자정리하기(page.request, 정보);
  }
});

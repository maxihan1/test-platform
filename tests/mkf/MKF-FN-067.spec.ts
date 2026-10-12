import { defineCase, test, verify } from '@platform/kit';

import { 새회원정보, 회원가입 } from './helpers/account.helper.js';
import { 가입자정리하기, 보이는글, 세션아이디 } from './helpers/common-tools.helper.js';
import { 아이디쓰이나 } from './helpers/member-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-067',
  name: '틀린 비밀번호로 로그인하면 「아이디 또는 비밀번호가 올바르지 않습니다」가 보인다',
  precondition: ['새로 가입한 회원이 있다', '비회원이다'],
  params: null,
  expected: null,
  techniques: ['동등 분할'],
});

test(spec, async ({ page }) => {
  const 로그인 = new 로그인화면(page);
  const 정보 = 새회원정보();
  const 없는아이디 = 새회원정보().loginId;

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

    await test.step('그 회원의 아이디와 틀린 비밀번호로 로그인한다', async () => {
      await 방해막기(page);
      await 로그인.열기();
      await 로그인.제목.waitFor();
      await 로그인.틀리게로그인하고오류기다리기(정보.loginId, 'Wrong1234!');
      await verify('틀린 비밀번호로 로그인하면 「아이디 또는 비밀번호가 올바르지 않습니다」가 보인다', await 보이는글(로그인.오류), '아이디 또는 비밀번호가 올바르지 않습니다');
    });

    await test.step('가입하지 않은 아이디로 로그인한다', async () => {
      await 로그인.열기();
      await 로그인.제목.waitFor();
      await 로그인.틀리게로그인하고오류기다리기(없는아이디, 'Wrong1234!');
      await verify('없는 아이디로 로그인하면 「아이디 또는 비밀번호가 올바르지 않습니다」가 보인다', await 보이는글(로그인.오류), '아이디 또는 비밀번호가 올바르지 않습니다');
    });
  } finally {
    await 가입자정리하기(page.request, 정보);
  }
});

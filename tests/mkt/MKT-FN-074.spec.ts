import { defineCase, test, verify } from '@platform/kit';

import { 새회원정보, 회원가입 } from './helpers/account.helper.js';
import { 가입자정리하기, 보이는글 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-074',
  name: '아이디가 틀릴 때와 비밀번호가 틀릴 때 보이는 오류 문구가 같다',
  precondition: ['같은 아이디로 비밀번호를 틀린 적이 없는 새 회원이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 로그인 = new 로그인화면(page);
  const 정보 = 새회원정보();
  const 없는아이디 = 새회원정보().loginId;

  try {
    await test.step('같은 아이디로 비밀번호를 틀린 적이 없는 새 회원을 만든다', async () => {
      await 회원가입(page.request, 정보);
    });

    await test.step('새 회원이 있는지 확인한다', async () => {
      const 응답 = await page.request.get(`/api/auth/check-id?loginId=${정보.loginId}`);
      const 본문 = (await 응답.json()) as { available: boolean };
      await verify('새 회원의 아이디가 이미 쓰이고 있다', 본문.available, false, { blocker: true });
    });

    await test.step('없는 아이디로 한 번, 맞는 아이디와 틀린 비밀번호로 한 번 로그인한다', async () => {
      await 방해막기(page);
      await 로그인.열기();
      await 로그인.제목.waitFor();
      await 로그인.틀리게로그인하고오류기다리기(없는아이디, 'Wrong1234!');
      const 아이디틀림 = await 보이는글(로그인.오류);
      await 로그인.틀리게로그인하고오류기다리기(정보.loginId, 'Wrong1234!');
      const 비밀번호틀림 = await 보이는글(로그인.오류);
      await verify(
        '아이디가 틀릴 때와 비밀번호가 틀릴 때 보이는 오류 문구가 같다',
        { 같은문구: 아이디틀림 === 비밀번호틀림, 문구있음: 아이디틀림 !== '' },
        { 같은문구: true, 문구있음: true },
      );
    });
  } finally {
    await 가입자정리하기(page.request, 정보);
  }
});

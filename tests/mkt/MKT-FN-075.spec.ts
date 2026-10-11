import { defineCase, test, verify } from '@platform/kit';

import { API로그아웃, 새회원정보, 회원가입 } from './helpers/account.helper.js';
import { 가입자정리하기, 보이는글, 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 머리글 } from './components/header.component.js';

export const spec = defineCase({
  tcId: 'MKT-FN-075',
  name: '비밀번호를 4번 연속 틀린 뒤 맞는 비밀번호로 로그인하면 로그인된다',
  precondition: ['같은 아이디로 비밀번호를 틀린 적이 없는 새 회원이 있다'],
  params: null,
  expected: null,
  techniques: ['경계값 분석'],
});

test(spec, async ({ page }) => {
  const 로그인 = new 로그인화면(page);
  const 머리 = new 머리글(page);
  const 정보 = 새회원정보();

  try {
    await test.step('같은 아이디로 비밀번호를 틀린 적이 없는 새 회원을 만든다', async () => {
      await 회원가입(page.request, 정보);
    });

    await test.step('새 회원이 있는지 확인한다', async () => {
      const 응답 = await page.request.get(`/api/auth/check-id?loginId=${정보.loginId}`);
      const 본문 = (await 응답.json()) as { available: boolean };
      await verify('새 회원의 아이디가 이미 쓰이고 있다', 본문.available, false, { blocker: true });
    });

    await test.step('비밀번호를 4번 연속 틀린 뒤 맞는 비밀번호로 로그인한다', async () => {
      await 방해막기(page);
      await 로그인.열기();
      await 로그인.제목.waitFor();
      for (let 번째 = 0; 번째 < 4; 번째 += 1) {
        await 로그인.틀리게로그인하고오류기다리기(정보.loginId, 'Wrong1234!');
      }
      await 로그인.로그인하기(정보.loginId, 정보.password);
      await 머리.로그아웃.waitFor();
      await verify('비밀번호를 4번 연속 틀린 뒤 맞는 비밀번호로 로그인하면 로그인된다', (await 세션아이디(page)) === 정보.loginId, true);
    });

    await test.step('로그아웃해 실패 횟수를 새로 세게 한다', async () => {
      await API로그아웃(page.request);
    });

    await test.step('비밀번호를 5번 연속 틀린다', async () => {
      await 로그인.열기();
      await 로그인.제목.waitFor();
      for (let 번째 = 0; 번째 < 5; 번째 += 1) {
        await 로그인.틀리게로그인하고오류기다리기(정보.loginId, 'Wrong1234!');
      }
      await verify(
        '비밀번호를 5번 연속 틀리면 「로그인 5회 실패로 10분간 로그인할 수 없습니다」가 보인다',
        await 보이는글(로그인.오류),
        '로그인 5회 실패로 10분간 로그인할 수 없습니다',
      );
    });
  } finally {
    await 가입자정리하기(page.request, 정보);
  }
});

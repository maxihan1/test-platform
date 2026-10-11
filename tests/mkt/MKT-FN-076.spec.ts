import { defineCase, test, verify } from '@platform/kit';

import { 새회원정보, 회원가입 } from './helpers/account.helper.js';
import { 가입자정리하기, 보이는글 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-076',
  name: '5번 연속 틀려 잠긴 뒤에는 맞는 비밀번호로 로그인해도 「로그인 5회 실패로 10분간 로그인할 수 없습니다」가 보인다',
  precondition: ['같은 아이디로 비밀번호를 틀린 적이 없는 새 회원이 있다'],
  params: null,
  expected: null,
  techniques: ['동등 분할', '상태 전이'],
});

test(spec, async ({ page }) => {
  const 로그인 = new 로그인화면(page);
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

    await test.step('비밀번호를 5번 연속 틀린 뒤 맞는 비밀번호로 로그인한다', async () => {
      await 방해막기(page);
      await 로그인.열기();
      await 로그인.제목.waitFor();
      for (let 번째 = 0; 번째 < 5; 번째 += 1) {
        await 로그인.틀리게로그인하고오류기다리기(정보.loginId, 'Wrong1234!');
      }
      await 로그인.틀리게로그인하고오류기다리기(정보.loginId, 정보.password);
      await verify(
        '5번 연속 틀려 잠긴 뒤에는 맞는 비밀번호로 로그인해도 「로그인 5회 실패로 10분간 로그인할 수 없습니다」가 보인다',
        await 보이는글(로그인.오류),
        '로그인 5회 실패로 10분간 로그인할 수 없습니다',
      );
    });
  } finally {
    await 가입자정리하기(page.request, 정보);
  }
});

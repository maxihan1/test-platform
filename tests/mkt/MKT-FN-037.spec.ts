import { defineCase, test, verify } from '@platform/kit';

import { 방해막기, 새계정가입 } from './helpers/account.helper.js';
import { 새계정치우기, 틀린비밀번호 } from './helpers/member.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-037',
  name: '비밀번호를 4번 연속 틀리면 「아이디 또는 비밀번호가 올바르지 않습니다」 가 보이고 아직 잠기지 않는다',
  platforms: ['desktop'],
  precondition: [
    '새 아이디로 가입한 계정을 쓴다',
  ],
  techniques: ['경계값 분석'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 로그인 = new 로그인화면(page);
  let 계정: Awaited<ReturnType<typeof 새계정가입>> | undefined;

  try {
    await 방해막기(page);

    await test.step('새 아이디로 계정을 가입한다', async () => {
      계정 = await 새계정가입(request);
      const 응답 = await request.get(`/api/auth/check-id?loginId=${계정.loginId}`);
      const 본문 = (await 응답.json()) as { available: boolean };
      await verify('새 계정 아이디가 이미 쓰이고 있다', 본문.available, false, { blocker: true });
    });

    await test.step('새 계정으로 비밀번호를 4번 연속 틀린다', async () => {
      if (계정 === undefined) throw new Error('새 계정이 만들어지지 않았다');
      await 로그인.열기();
      await 로그인.입력하기(계정.loginId, 틀린비밀번호);
      for (let 번 = 0; 번 < 4; 번 += 1) await 로그인.응답받으며누르기();
      await 로그인.오류문구.filter({ hasText: /\S/ }).waitFor();
      await verify('비밀번호를 4번 연속 틀리면 「아이디 또는 비밀번호가 올바르지 않습니다」 가 보이고 아직 잠기지 않는다', await 로그인.오류문구.innerText(), '아이디 또는 비밀번호가 올바르지 않습니다');
    });

    await test.step('같은 계정으로 비밀번호를 한 번 더 틀린다', async () => {
      await 로그인.응답받으며누르기();
      await 로그인.오류문구.filter({ hasText: /\S/ }).waitFor();
      await verify('비밀번호를 5번 연속 틀리면 「로그인 5회 실패로 10분간 로그인할 수 없습니다」 가 보인다', await 로그인.오류문구.innerText(), '로그인 5회 실패로 10분간 로그인할 수 없습니다');
    });
  } finally {
    if (계정 !== undefined) await 새계정치우기(request, { loginId: 계정.loginId, password: 계정.password });
  }
});

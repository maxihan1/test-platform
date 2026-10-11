import { defineCase, test, verify } from '@platform/kit';

import { 방해막기, 새계정가입 } from './helpers/account.helper.js';
import { 새계정치우기 } from './helpers/member.helper.js';
import { 비밀번호찾기화면 } from './pages/find-password.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-040',
  name: '아이디와 이메일이 일치하면 「가입하신 이메일로 임시 비밀번호를 보냈습니다」 가 보인다',
  platforms: ['desktop'],
  precondition: [
    '새 아이디로 가입한 계정을 쓴다',
  ],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 찾기 = new 비밀번호찾기화면(page);
  let 계정: Awaited<ReturnType<typeof 새계정가입>> | undefined;

  try {
    await 방해막기(page);

    await test.step('새 아이디로 계정을 가입한다', async () => {
      계정 = await 새계정가입(request);
      const 응답 = await request.get(`/api/auth/check-id?loginId=${계정.loginId}`);
      const 본문 = (await 응답.json()) as { available: boolean };
      await verify('새 계정 아이디가 이미 쓰이고 있다', 본문.available, false, { blocker: true });
    });

    await test.step('새 계정의 아이디와 이메일로 「임시 비밀번호 받기」 를 누른다', async () => {
      if (계정 === undefined) throw new Error('새 계정이 만들어지지 않았다');
      await 찾기.열기();
      await 찾기.입력하기(계정.loginId, 계정.email);
      await 찾기.누르고결과기다리기();
      await verify('아이디와 이메일이 일치하면 「가입하신 이메일로 임시 비밀번호를 보냈습니다」 가 보인다', await 찾기.결과문구.innerText(), '가입하신 이메일로 임시 비밀번호를 보냈습니다');
    });
  } finally {
    if (계정 !== undefined) await 새계정치우기(request, { loginId: 계정.loginId, password: 계정.password });
  }
});

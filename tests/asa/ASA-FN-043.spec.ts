import type { APIResponse } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';

import { 가입, 로그인, 본문, 새비밀번호, 새아이디, 칸이름들 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-043',
  name: '로그인하면 응답 칸 이름이 「accessToken」 · 「expiresInSeconds」 · 「refreshToken」이다',
  apiDoc: 1,
  precondition: ['가입한 아이디가 하나 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  const 아이디 = 새아이디();
  const 비밀번호 = 새비밀번호();
  let 가입응답!: APIResponse;

  await test.step('새 아이디로 가입한다', async () => {
    가입응답 = await 가입(request, 아이디, 비밀번호);
  });

  await test.step('가입 결과를 확인한다', async () => {
    await verify('새 아이디 가입 응답에 「accountId」가 있다', (await 본문(가입응답)).accountId !== undefined, true, { blocker: true });
  });

  await test.step('로그인해 응답 칸 이름을 읽는다', async () => {
    const 응답 = await 로그인(request, 아이디, 비밀번호);
    await verify('로그인하면 응답 칸 이름이 「accessToken」 · 「expiresInSeconds」 · 「refreshToken」이다', await 칸이름들(응답), 'accessToken, expiresInSeconds, refreshToken');
  });
});

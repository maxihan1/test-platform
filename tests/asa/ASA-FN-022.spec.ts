import type { APIResponse } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';

import { 가입, 갱신, 글칸, 로그인, 본문, 새비밀번호, 새아이디 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-022',
  name: '리프레시 토큰으로 갱신하면 200 과 새 「refreshToken」이 돌아온다',
  apiDoc: 1,
  smoke: true,
  precondition: ['로그인해 받은 리프레시 토큰이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  const 아이디 = 새아이디();
  const 비밀번호 = 새비밀번호();
  let 가입응답!: APIResponse;
  let 로그인응답!: APIResponse;

  await test.step('새 아이디로 가입한다', async () => {
    가입응답 = await 가입(request, 아이디, 비밀번호);
  });

  await test.step('가입 결과를 확인한다', async () => {
    await verify('새 아이디 가입 응답에 「accountId」가 있다', (await 본문(가입응답)).accountId !== undefined, true, { blocker: true });
  });

  await test.step('가입한 아이디로 로그인한다', async () => {
    로그인응답 = await 로그인(request, 아이디, 비밀번호);
  });

  await test.step('로그인 결과를 확인한다', async () => {
    await verify('로그인 응답에 「refreshToken」이 있다', (await 글칸(로그인응답, 'refreshToken')) !== '', true, { blocker: true });
  });

  await test.step('리프레시 토큰으로 갱신한다', async () => {
    const 앞토큰 = await 글칸(로그인응답, 'refreshToken');
    const 응답 = await 갱신(request, 앞토큰);
    const 코드 = await verify('갱신 응답 코드가 200 이다', 응답.status(), 200);
    const 새것 = await verify('갱신 응답의 「refreshToken」이 앞 토큰과 다르다', (await 글칸(응답, 'refreshToken')) !== 앞토큰, true);
    await verify('리프레시 토큰으로 갱신하면 200 과 새 「refreshToken」이 돌아온다', 코드 && 새것, true);
  });
});

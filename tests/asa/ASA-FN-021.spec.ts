import type { APIResponse } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';

import { 가입, 로그인, 본문, 새비밀번호, 새아이디, 오류코드 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-021',
  name: '가입하지 않은 아이디로 로그인하면 401 「INVALID_CREDENTIALS」로 막힌다',
  apiDoc: 1,
  techniques: ['동등 분할'],
  precondition: ['가입하지 않은 아이디다', '가입한 아이디가 하나 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('가입하지 않은 아이디로 로그인한다', async () => {
    const 응답 = await 로그인(request, 새아이디(), 새비밀번호());
    const 코드 = await verify('가입하지 않은 아이디 로그인 응답 코드가 401 이다', 응답.status(), 401);
    const 오류 = await verify('가입하지 않은 아이디 로그인 오류 코드가 「INVALID_CREDENTIALS」다', await 오류코드(응답), 'INVALID_CREDENTIALS');
    await verify('가입하지 않은 아이디로 로그인하면 401 「INVALID_CREDENTIALS」로 막힌다', 코드 && 오류, true);
  });

  const 아이디 = 새아이디();
  const 비밀번호 = 새비밀번호();
  let 가입응답!: APIResponse;

  await test.step('새 아이디로 가입한다', async () => {
    가입응답 = await 가입(request, 아이디, 비밀번호);
  });

  await test.step('가입 결과를 확인한다', async () => {
    await verify('새 아이디 가입 응답에 「accountId」가 있다', (await 본문(가입응답)).accountId !== undefined, true, { blocker: true });
  });

  await test.step('가입한 아이디에 틀린 비밀번호로 로그인한다', async () => {
    const 응답 = await 로그인(request, 아이디, `${비밀번호}x`);
    const 코드 = await verify('틀린 비밀번호 로그인 응답 코드가 401 이다', 응답.status(), 401);
    const 오류 = await verify('틀린 비밀번호 로그인 오류 코드가 「INVALID_CREDENTIALS」다', await 오류코드(응답), 'INVALID_CREDENTIALS');
    await verify('틀린 비밀번호로 로그인하면 401 「INVALID_CREDENTIALS」로 막힌다', 코드 && 오류, true);
  });
});

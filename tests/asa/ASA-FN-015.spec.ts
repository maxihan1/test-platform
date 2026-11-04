import type { APIResponse } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';

import { 가입, 본문, 새비밀번호, 새아이디, 오류코드 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-015',
  name: '이미 있는 아이디로 다시 가입하면 409 「USERNAME_TAKEN」으로 막힌다',
  apiDoc: 2,
  techniques: ['동등 분할'],
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

  await test.step('같은 아이디로 다시 가입한다', async () => {
    const 응답 = await 가입(request, 아이디, 새비밀번호());
    const 코드 = await verify('같은 아이디 다시 가입 응답 코드가 409 이다', 응답.status(), 409);
    const 오류 = await verify('같은 아이디 다시 가입 오류 코드가 「USERNAME_TAKEN」이다', await 오류코드(응답), 'USERNAME_TAKEN');
    await verify('이미 있는 아이디로 다시 가입하면 409 「USERNAME_TAKEN」으로 막힌다', 코드 && 오류, true);
  });
});

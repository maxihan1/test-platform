import { defineCase, test, verify } from '@platform/kit';

import { 가입, 무작위글자, 새비밀번호, 오류코드 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-006',
  name: '아이디에 영문 대문자를 넣어 가입하면 400 「VALIDATION_FAILED」로 막힌다',
  apiDoc: 1,
  precondition: ['가입하지 않은 새 아이디다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('아이디에 영문 대문자를 넣어 가입한다', async () => {
    const 응답 = await 가입(request, `Asat${무작위글자(8)}`, 새비밀번호());
    const 코드 = await verify('대문자 아이디 가입 응답 코드가 400 이다', 응답.status(), 400);
    const 오류 = await verify('대문자 아이디 가입 오류 코드가 「VALIDATION_FAILED」다', await 오류코드(응답), 'VALIDATION_FAILED');
    await verify('아이디에 영문 대문자를 넣어 가입하면 400 「VALIDATION_FAILED」로 막힌다', 코드 && 오류, true);
  });
});

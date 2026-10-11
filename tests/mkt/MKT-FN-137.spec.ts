import { defineCase, test, verify } from '@platform/kit';

import { 둘째아이디, 새계정비밀번호, 새아이디 } from './helpers/account.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-137',
  name: '이미 있는 아이디로 가입을 요청하면 409 로 응답한다',
  platforms: ['desktop'],
  precondition: [
    '대상 서버 API 에 접근할 수 있다',
  ],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('이미 있는 아이디로 회원가입 API 를 요청한다', async () => {
    const 응답 = await request.post('/api/auth/signup', {
      data: {
        loginId: 둘째아이디,
        password: 새계정비밀번호,
        passwordConfirm: 새계정비밀번호,
        name: '테스트회원',
        email: `${새아이디()}@example.com`,
        phone: '',
        birth: '',
        gender: '선택 안 함',
        interests: [],
        terms: true,
        privacy: true,
        marketing: false,
      },
    });
    await verify('이미 있는 아이디로 가입을 요청하면 409 로 응답한다', 응답.status(), 409);
  });
});

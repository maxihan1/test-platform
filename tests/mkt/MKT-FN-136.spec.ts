import { defineCase, test, verify } from '@platform/kit';

import { 새가입값, 새계정치우기 } from './helpers/member.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-136',
  name: '새 아이디로 가입을 요청하면 201 로 응답한다',
  platforms: ['desktop'],
  precondition: [
    '대상 서버 API 에 접근할 수 있다',
  ],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  const 값 = 새가입값();

  try {
    await test.step('새 아이디로 회원가입 API 를 요청한다', async () => {
      const 응답 = await request.post('/api/auth/signup', {
        data: {
          loginId: 값.아이디,
          password: 값.비밀번호,
          passwordConfirm: 값.비밀번호,
          name: 값.이름,
          email: 값.이메일,
          phone: '',
          birth: '',
          gender: '선택 안 함',
          interests: [],
          terms: true,
          privacy: true,
          marketing: false,
        },
      });
      await verify('새 아이디로 가입을 요청하면 201 로 응답한다', 응답.status(), 201);
    });
  } finally {
    await 새계정치우기(request, { loginId: 값.아이디, password: 값.비밀번호 });
  }
});

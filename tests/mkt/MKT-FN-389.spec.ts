import { defineCase, test, verify } from '@platform/kit';
import { 새회원만들기, 새회원정보, 회원정리, type 회원정보 } from './helpers/account.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-389',
  name: '아이디와 이메일이 맞으면 비밀번호 찾기 요청이 성공으로 응답한다',
  platforms: ['desktop', 'mobile'],
  precondition: ['새로 가입한 회원이 있다', '비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  const 준비: { 회원?: 회원정보 } = {};

  try {
    await test.step('새로 가입한 회원을 만든다', async () => {
      준비.회원 = await 새회원만들기(request);
    });

    await test.step('가입한 회원이 있는지 확인한다', async () => {
      const 응답 = await request.get('/api/auth/check-id', { params: { loginId: 준비.회원?.loginId ?? '' } });
      await verify('가입한 아이디는 사용할 수 없다', ((await 응답.json()) as { available: boolean }).available, false, { blocker: true });
    });

    await test.step('그 회원의 아이디 · 이메일로 POST /api/auth/find-password 를 부른다', async () => {
      const 응답 = await request.post('/api/auth/find-password', { data: { loginId: 준비.회원?.loginId, email: 준비.회원?.email } });
      await verify('아이디와 이메일이 맞으면 비밀번호 찾기 요청이 성공으로 응답한다', 응답.ok(), true);
    });

    await test.step('맞지 않는 아이디 · 이메일로 비밀번호 찾기 요청을 보낸다', async () => {
      const 없는회원 = 새회원정보();
      const 응답 = await request.post('/api/auth/find-password', { data: { loginId: 없는회원.loginId, email: 없는회원.email } });
      await verify('아이디와 이메일이 맞지 않으면 비밀번호 찾기 요청이 실패로 응답한다', 응답.ok(), false);
    });
  } finally {
    if (준비.회원) await 회원정리(request, 준비.회원);
  }
});

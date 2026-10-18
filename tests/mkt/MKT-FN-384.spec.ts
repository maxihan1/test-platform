import { defineCase, test, verify } from '@platform/kit';
import { 로그인요청, 새회원만들기, 회원정리, type 회원정보 } from './helpers/account.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-384',
  name: '틀린 비밀번호 로그인 요청은 401 로 응답한다',
  platforms: ['desktop', 'mobile'],
  precondition: ['새로 가입한 회원이 있다'],
  params: null,
  expected: null,
  techniques: ['동등 분할', '상태 전이'],
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

    await test.step('틀린 비밀번호로 로그인 요청을 보낸다', async () => {
      await verify('틀린 비밀번호 로그인 요청은 401 로 응답한다', await 로그인요청(request, 준비.회원?.loginId ?? '', '틀린비밀번호!1'), 401);
    });

    await test.step('5번 틀린 뒤 맞는 비밀번호로 로그인 요청을 보낸다', async () => {
      for (let i = 0; i < 5; i++) await 로그인요청(request, 준비.회원?.loginId ?? '', '틀린비밀번호!1');
      const 응답 = await request.post('/api/auth/login', { data: { loginId: 준비.회원?.loginId, password: 준비.회원?.password, remember: false } });
      const 본문 = (await 응답.json()) as { code?: string };
      await verify('잠긴 계정의 로그인 요청은 423 과 code 「LOCKED」로 응답한다', { 상태: 응답.status(), code: 본문.code }, { 상태: 423, code: 'LOCKED' });
    });
  } finally {
    if (준비.회원) await 회원정리(request, 준비.회원);
  }
});

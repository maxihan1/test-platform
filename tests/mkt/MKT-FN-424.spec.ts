import { defineCase, test, verify } from '@platform/kit';
import { 새회원으로로그인, 세션회원있는가, 회원정리, type 회원정보 } from './helpers/account.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-424',
  name: '비밀번호 재확인 · 회원정보 수정 · 탈퇴 요청이 모두 성공한다',
  platforms: ['desktop', 'mobile'],
  precondition: ['새로 가입한 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  const 준비: { 회원?: 회원정보 } = {};

  try {
    await test.step('새로 가입한 회원으로 로그인한다', async () => {
      준비.회원 = await 새회원으로로그인(request);
    });

    await test.step('로그인한 상태를 확인한다', async () => {
      await verify('세션에 회원이 있다', await 세션회원있는가(request), true, { blocker: true });
    });

    await test.step('비밀번호 재확인 · 회원정보 수정 · 탈퇴를 차례로 부른다', async () => {
      const 재확인 = await request.post('/api/me/verify-password', { data: { password: 준비.회원?.password } });
      const 수정 = await request.put('/api/me', { data: { name: '고친이름', email: 준비.회원?.email, phone: '', interests: [], avatar: null } });
      const 탈퇴 = await request.delete('/api/me', { data: { password: 준비.회원?.password } });
      await verify(
        '비밀번호 재확인 · 회원정보 수정 · 탈퇴 요청이 모두 성공한다',
        { 재확인: 재확인.ok(), 수정: 수정.ok(), 탈퇴: 탈퇴.ok() },
        { 재확인: true, 수정: true, 탈퇴: true },
      );
    });
  } finally {
    if (준비.회원) await 회원정리(request, 준비.회원);
  }
});

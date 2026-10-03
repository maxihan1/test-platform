import { defineCase, test, verify } from '@platform/kit';

type 회원본문 = { name: string };

export const spec = defineCase({
  tcId: 'MKT-FN-093',
  name: '비밀번호 찾기 · 재확인 · 회원정보 수정 · 탈퇴 API 가 가입한 회원에게 맞게 응답한다',
  precondition: ['새로 가입한 회원이다', '새로 가입한 회원이 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 아이디 = `mk${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`.slice(0, 12);
  const 비밀번호 = `Mk!${Date.now().toString(36)}9`;
  const 이메일 = `${아이디}@demo.market`;
  await page.request.post('/api/auth/signup', {
    data: { loginId: 아이디, password: 비밀번호, passwordConfirm: 비밀번호, name: '임시회원', email: 이메일, phone: '', birth: '', gender: '선택 안 함', interests: [], terms: true, privacy: true, marketing: false },
  });
  await page.request.post('/api/auth/login', { data: { loginId: 아이디, password: 비밀번호 } });

  try {
    await test.step('아이디와 이메일로 비밀번호 찾기 API 를 부른다', async () => {
      const 일치 = await request.post('/api/auth/find-password', { data: { loginId: 아이디, email: 이메일 } });
      const 불일치 = await request.post('/api/auth/find-password', { data: { loginId: 아이디, email: `x${이메일}` } });
      await verify('비밀번호 찾기 API 는 아이디와 이메일이 일치하는지 알려 준다', [일치.ok(), 불일치.ok()], [true, false], { blocker: true });
    });

    await test.step('비밀번호 재확인 API 를 맞는 비밀번호로 부른다', async () => {
      const 응답 = await page.request.post('/api/me/verify-password', { data: { password: 비밀번호 } });
      await verify('비밀번호 재확인 API 가 맞는 비밀번호에 성공한다', 응답.ok(), true);
    });

    await test.step('회원정보 수정 API 로 이름을 바꾼다', async () => {
      const 응답 = await page.request.put('/api/me', { data: { name: '바꾼이름', email: 이메일, phone: '', interests: [], avatar: null } });
      await verify('회원정보 수정 API 가 바꾼 이름을 돌려준다', [응답.status(), ((await 응답.json()) as 회원본문).name], [200, '바꾼이름']);
    });

    await test.step('탈퇴 API 를 부른다', async () => {
      const 탈퇴 = await page.request.delete('/api/me');
      const 다시 = await request.post('/api/auth/login', { data: { loginId: 아이디, password: 비밀번호 } });
      await verify('탈퇴 API 가 성공하면 그 아이디로는 로그인할 수 없다', [탈퇴.ok(), 다시.status()], [true, 401]);
    });
  } finally {
    await page.request.delete('/api/me');
  }
});

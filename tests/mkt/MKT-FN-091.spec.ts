import { defineCase, test, verify } from '@platform/kit';

type 확인본문 = { available: boolean };

export const spec = defineCase({
  tcId: 'MKT-FN-091',
  name: '가입 API 는 새 아이디에 201 · 중복에 409 로 응답하고 check-id 는 available 로 알려 준다',
  precondition: ['비회원이다', '방금 가입한 아이디가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 아이디 = `mk${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`.slice(0, 12);
  const 없는아이디 = `zz${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`.slice(0, 12);
  const 비밀번호 = `Mk!${Date.now().toString(36)}9`;
  const 가입본문 = { loginId: 아이디, password: 비밀번호, passwordConfirm: 비밀번호, name: '임시회원', email: `${아이디}@demo.market`, phone: '', birth: '', gender: '선택 안 함', interests: [], terms: true, privacy: true, marketing: false };

  try {
    await test.step('새 아이디로 가입 API 를 부른다', async () => {
      const 응답 = await request.post('/api/auth/signup', { data: 가입본문 });
      await verify('가입 API 는 201 로 응답한다', 응답.status(), 201, { blocker: true });
    });

    await test.step('같은 아이디로 가입 API 를 다시 부른다', async () => {
      const 응답 = await request.post('/api/auth/signup', { data: 가입본문 });
      await verify('아이디가 중복이면 409 로 응답한다', 응답.status(), 409);
    });

    await test.step('「GET /api/auth/check-id」를 쓰는 아이디와 없는 아이디로 부른다', async () => {
      const 쓰는 = (await (await request.get(`/api/auth/check-id?loginId=${encodeURIComponent(아이디)}`)).json()) as 확인본문;
      const 없는 = (await (await request.get(`/api/auth/check-id?loginId=${encodeURIComponent(없는아이디)}`)).json()) as 확인본문;
      await verify('이미 있는 아이디는 available 이 false 이고 없는 아이디는 true 다', [쓰는.available, 없는.available], [false, true]);
    });
  } finally {
    await page.request.post('/api/auth/login', { data: { loginId: 아이디, password: 비밀번호 } });
    await page.request.delete('/api/me');
  }
});

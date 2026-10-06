import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인, 임시회원가입, 임시회원정보, 임시회원지우기, 새이름 } from './components/account.component.js';

export const spec = defineCase({
  tcId: 'MKT-FN-490',
  name: '맞는 비밀번호로 재확인하면 200 으로 응답한다',
  precondition: ['새로 만든 회원으로 로그인해 있다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ request }) => {
  const 회원 = 임시회원정보();
  const 고친이름 = 새이름();

  try {
    await test.step('로그인 요청으로 새 회원을 만들어 로그인한다', async () => {
      await 임시회원가입(request, 회원);
      await API로그인(request, 회원.loginId, 회원.password);
    });

    await test.step('새로 만든 회원으로 로그인해 있는지 확인한다', async () => {
      const 응답 = await request.get('/api/auth/me');
      await verify('로그인한 채 현재 회원 조회를 부르면 200 으로 응답한다', 응답.status(), 200, { blocker: true });
    });

    await test.step('비밀번호 재확인 POST /api/me/verify-password 를 맞는 비밀번호로 보낸다', async () => {
      const 응답 = await request.post('/api/me/verify-password', { data: { password: 회원.password } });
      await verify('맞는 비밀번호로 재확인하면 200 으로 응답한다', 응답.status(), 200);
    });

    await test.step('회원정보 수정 PUT /api/me 로 이름을 바꾼다', async () => {
      const 응답 = await request.put('/api/me', { data: { name: 고친이름, email: 회원.email, phone: '', interests: [], avatar: null } });
      const 본문 = (await 응답.json()) as { name?: string };
      await verify('회원정보 수정 요청은 200 이고 이름이 바뀐다', { 상태: 응답.status(), 이름: 본문.name }, { 상태: 200, 이름: 고친이름 });
    });

    await test.step('탈퇴 DELETE /api/me 를 보낸다', async () => {
      const 응답 = await request.delete('/api/me');
      await verify('탈퇴 요청은 204 로 응답한다', 응답.status(), 204);
    });
  } finally {
    await 임시회원지우기(request, 회원);
  }
});

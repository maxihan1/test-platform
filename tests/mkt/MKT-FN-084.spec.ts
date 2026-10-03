import type { APIRequestContext } from '@playwright/test';
import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';


const 새회원비밀번호 = 'Mkt!2026pw';

async function 가입한다(request: APIRequestContext): Promise<string> {
  const 아이디 = `mk${Date.now().toString(36).slice(-6)}${Math.random().toString(36).slice(2, 5)}`;
  const res = await request.post('/api/auth/signup', {
    data: {
      loginId: 아이디,
      password: 새회원비밀번호,
      passwordConfirm: 새회원비밀번호,
      name: '시험회원',
      email: `${아이디}@example.com`,
      phone: '',
      birth: '',
      gender: '선택 안 함',
      interests: [],
      terms: true,
      privacy: true,
      marketing: false,
    },
  });
  if (res.status() !== 201) throw new Error(`가입 응답이 ${res.status()}이다`);
  return 아이디;
}

async function 로그인한다(request: APIRequestContext, 아이디: string): Promise<void> {
  const res = await request.post('/api/auth/login', { data: { loginId: 아이디, password: 새회원비밀번호 } });
  if (res.status() !== 200) throw new Error(`로그인 응답이 ${res.status()}이다`);
}

export const spec = defineCase({
  tcId: 'MKT-FN-084',
  name: 'POST /api/reset 은 204 로 응답하고 이번 실행에서 가입한 회원은 로그인할 수 없다',
  platforms: ['desktop'],
  precondition: ['이번 실행에서 가입한 회원이 있다'],
  params: z.object({}),
  expected: z.object({
    resetStatus: z.number().describe('초기화 응답 코드').default(204),
    loginStatus: z.number().describe('초기화 뒤 로그인 응답 코드').default(401),
  }),
});

test(spec, async ({ request, expected }) => {
  const 아이디 = await 가입한다(request);

  await test.step('이번 실행에서 쓸 회원을 로그인시킨다', async () => {
    await 로그인한다(request, 아이디);
  });

  await test.step('가입한 회원을 확인한다', async () => {
    const 세션 = (await (await request.get('/api/session')).json()) as { user: { loginId: string } | null };
    await verify('이번 실행에서 가입한 회원이 있다', 세션.user?.loginId, 아이디, { blocker: true });
  });

  await test.step('POST /api/reset 을 부른다', async () => {
    const res = await request.post('/api/reset');
    await verify('POST /api/reset 은 204 로 응답한다', res.status(), expected.resetStatus);
  });

  await test.step('POST /api/reset 을 부른 뒤 그 회원으로 로그인한다', async () => {
    await request.post('/api/reset');
    const res = await request.post('/api/auth/login', { data: { loginId: 아이디, password: 새회원비밀번호 } });
    await verify('POST /api/reset 으로 모든 데이터가 초기 상태로 돌아가 이번 실행에서 가입한 회원은 로그인할 수 없다', res.status(), expected.loginStatus);
  });
});

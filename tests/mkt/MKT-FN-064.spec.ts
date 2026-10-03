import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import type { APIRequestContext } from '@playwright/test';

const 예시비밀번호 = 'Mkt!2026pw';

function 새아이디(): string {
  return `mk${Date.now().toString(36).slice(-5)}${Math.random().toString(36).slice(2, 5)}`;
}

function 가입본문(아이디: string, 이름: string) {
  return {
    loginId: 아이디,
    password: 예시비밀번호,
    passwordConfirm: 예시비밀번호,
    name: 이름,
    email: `${아이디}@example.com`,
    phone: '',
    birth: '',
    gender: '선택 안 함',
    interests: [],
    terms: true,
    privacy: true,
    marketing: false,
  };
}

async function 탈퇴로치운다(request: APIRequestContext, 아이디: string): Promise<void> {
  const 로그인 = await request.post('/api/auth/login', { data: { loginId: 아이디, password: 예시비밀번호, remember: false } });
  if (로그인.ok()) await request.delete('/api/me');
}

export const spec = defineCase({
  tcId: 'MKT-FN-064',
  name: '내 정보 API 로 이름을 고치고 비밀번호를 확인하고 탈퇴하면 기획서의 결과가 나온다',
  precondition: ['이번 실행에서 가입한 회원이 로그인해 있다'],
  params: z.object({
    newName: z.string().min(2).describe('고칠 이름').default('바뀐이름'),
  }),
  expected: z.object({
    ready: z.string().describe('가입과 로그인 응답 코드').default('201, 200'),
    verifyStatus: z.number().describe('비밀번호 확인 응답 코드').default(200),
    afterWithdraw: z.number().describe('탈퇴한 아이디로 로그인한 응답 코드').default(401),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 아이디 = 새아이디();

  try {
    await test.step('이번 실행에서 가입한 회원으로 로그인한다', async () => {
      const 가입 = await request.post('/api/auth/signup', { data: 가입본문(아이디, '마켓회원') });
      const 로그인 = await request.post('/api/auth/login', { data: { loginId: 아이디, password: 예시비밀번호, remember: false } });
      await verify('이번 실행에서 가입한 회원이 로그인해 있다', `${가입.status()}, ${로그인.status()}`, expected.ready, { blocker: true });
    });

    await test.step('PUT /api/me 로 이름을 고친다', async () => {
      await request.put('/api/me', { data: { name: params.newName, email: `${아이디}@example.com`, phone: '', interests: [], avatar: null } });
      const 내정보 = await request.get('/api/auth/me');
      const 본문 = (await 내정보.json()) as { name?: string };
      await verify('PUT /api/me 로 회원정보를 고치면 고친 값이 GET /api/auth/me 에 나온다', 본문.name, params.newName);
    });

    await test.step('POST /api/me/verify-password 에 맞는 비밀번호를 보낸다', async () => {
      const 응답 = await request.post('/api/me/verify-password', { data: { password: 예시비밀번호 } });
      await verify('POST /api/me/verify-password 에 맞는 비밀번호를 보내면 성공한다', 응답.status(), expected.verifyStatus);
    });

    await test.step('DELETE /api/me 를 부른다', async () => {
      await request.delete('/api/me');
      const 로그인 = await request.post('/api/auth/login', { data: { loginId: 아이디, password: 예시비밀번호, remember: false } });
      await verify('DELETE /api/me 로 탈퇴하면 그 아이디로 다시 로그인할 수 없다', 로그인.status(), expected.afterWithdraw);
    });
  } finally {
    await 탈퇴로치운다(request, 아이디);
  }
});

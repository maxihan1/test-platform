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

async function 잠금을푼다(관리자: APIRequestContext, 아이디: string): Promise<void> {
  const 목록 = await 관리자.get('/api/admin/users');
  const { items } = (await 목록.json()) as { items: { id: number; loginId: string }[] };
  const 대상 = items.find((회원) => 회원.loginId === 아이디);
  if (대상) await 관리자.post(`/api/admin/users/${대상.id}/unlock`);
}

export const spec = defineCase({
  tcId: 'MKT-FN-062',
  name: '틀린 비밀번호를 5번 보낸 계정은 423 으로 잠기고 비밀번호 찾기는 일치 여부를 알려 준다',
  precondition: ['이번 실행에서 가입한 회원이 있다', '비회원이다'],
  params: z.object({
    adminId: z.string().min(1).describe('관리자 아이디').default('admin'),
    adminPassword: z.string().min(1).describe('관리자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    created: z.string().describe('가입 응답 코드 둘').default('201, 201'),
    locked: z.string().describe('잠긴 계정 응답 코드와 코드명').default('423 LOCKED'),
    found: z.string().describe('일치할 때 응답 문구').default('가입하신 이메일로 임시 비밀번호를 보냈습니다'),
    notFound: z.string().describe('일치하지 않을 때 응답 문구').default('일치하는 회원 정보가 없습니다'),
  }),
});

test(spec, async ({ page, request, params, expected }) => {
  const 잠글회원 = 새아이디();
  const 찾을회원 = 새아이디();
  const 없는아이디 = 새아이디();
  const 브라우저 = page.context().browser();
  if (!브라우저) throw new Error('브라우저를 얻지 못했습니다');
  const 관리자문맥 = await 브라우저.newContext({ baseURL: process.env.PLATFORM_BASE_URL });

  try {
    await test.step('이번 실행에서 가입한 회원을 만든다', async () => {
      const 가입들 = [
        await request.post('/api/auth/signup', { data: 가입본문(잠글회원, '마켓회원') }),
        await request.post('/api/auth/signup', { data: 가입본문(찾을회원, '마켓회원') }),
      ];
      await verify('이번 실행에서 가입한 회원이 있다', 가입들.map((응답) => 응답.status()).join(', '), expected.created, { blocker: true });
    });

    await test.step('POST /api/auth/login 으로 틀린 비밀번호를 5번 보낸 뒤 한 번 더 보낸다', async () => {
      for (let 번 = 0; 번 < 5; 번 += 1) {
        await request.post('/api/auth/login', { data: { loginId: 잠글회원, password: '틀린!Pw1234', remember: false } });
      }
      const 응답 = await request.post('/api/auth/login', { data: { loginId: 잠글회원, password: '틀린!Pw1234', remember: false } });
      const 본문 = (await 응답.json()) as { code?: string };
      await verify('틀린 비밀번호를 5번 보낸 계정으로 로그인하면 423 LOCKED 가 온다', `${응답.status()} ${본문.code}`, expected.locked);
    });

    await test.step('POST /api/auth/find-password 에 맞는 아이디와 이메일을 보낸다', async () => {
      const 응답 = await request.post('/api/auth/find-password', { data: { loginId: 찾을회원, email: `${찾을회원}@example.com` } });
      const 본문 = (await 응답.json()) as { message?: string };
      await verify('POST /api/auth/find-password 에 맞는 아이디와 이메일을 보내면 일치한다고 응답한다', 본문.message, expected.found);
    });

    await test.step('POST /api/auth/find-password 에 없는 아이디와 이메일을 보낸다', async () => {
      const 응답 = await request.post('/api/auth/find-password', { data: { loginId: 없는아이디, email: `${없는아이디}@example.com` } });
      const 본문 = (await 응답.json()) as { message?: string };
      await verify('POST /api/auth/find-password 에 없는 아이디와 이메일을 보내면 일치하지 않는다고 응답한다', 본문.message, expected.notFound);
    });
  } finally {
    await 관리자문맥.request.post('/api/auth/login', { data: { loginId: params.adminId, password: params.adminPassword ?? '', remember: false } });
    await 잠금을푼다(관리자문맥.request, 잠글회원);
    await 탈퇴로치운다(request, 잠글회원);
    await 탈퇴로치운다(request, 찾을회원);
    await 관리자문맥.close();
  }
});

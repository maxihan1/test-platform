import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 둘째아이디, 잠긴아이디, API로그인 } from './helpers/account.helper.js';
import { 틀린비밀번호, 아이디가있는가 } from './helpers/member.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-139',
  name: '틀린 비밀번호로 로그인을 요청하면 401 로 응답한다',
  platforms: ['desktop'],
  precondition: [
    '두 번째 회원 계정을 쓴다',
    '잠긴 회원 계정을 쓴다',
    '대상 서버 API 에 접근할 수 있다',
  ],
  techniques: ['동등 분할', '상태 전이'],
  params: z.object({
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 비밀번호 = params.password ?? '';

  try {
    await test.step('로그인 API 를 두 번째 회원과 틀린 비밀번호로 요청한다', async () => {
      await verify('두 번째 회원 아이디가 있다', await 아이디가있는가(request, 둘째아이디), true, { blocker: true });
      const 상태 = await API로그인(request, 둘째아이디, 틀린비밀번호);
      await verify('틀린 비밀번호로 로그인을 요청하면 401 로 응답한다', 상태, 401);
    });

    await test.step('로그인 API 를 잠긴 회원 계정으로 요청한다', async () => {
      await verify('잠긴 회원 아이디가 있다', await 아이디가있는가(request, 잠긴아이디), true, { blocker: true });
      const 응답 = await request.post('/api/auth/login', { data: { loginId: 잠긴아이디, password: 비밀번호, remember: false } });
      const 본문 = (await 응답.json()) as { code?: string };
      await verify('잠긴 계정으로 로그인을 요청하면 423 · 「LOCKED」 로 응답한다', { 상태: 응답.status(), 코드: 본문.code }, { 상태: 423, 코드: 'LOCKED' });
    });

    await test.step('로그인 없이 로그아웃 API 를 요청한다', async () => {
      const 응답 = await request.post('/api/auth/logout');
      await verify('로그인 없이 로그아웃을 요청하면 401 로 응답한다', 응답.status(), 401);
    });

    await test.step('로그인 없이 내 정보 API 를 요청한다', async () => {
      const 응답 = await request.get('/api/auth/me');
      await verify('로그인 없이 내 정보를 요청하면 401 로 응답한다', 응답.status(), 401);
    });

    await test.step('로그인 없이 세션 API 를 요청한다', async () => {
      const 응답 = await request.get('/api/session');
      const 본문 = (await 응답.json()) as { user?: unknown };
      await verify('로그인 없이 세션을 요청하면 401 이 아니라 user 가 null 인 응답이 온다', { 상태401: 응답.status() === 401, user: 본문.user }, { 상태401: false, user: null });
    });

    await test.step('로그인 없이 문의 등록 API 를 요청한다', async () => {
      const 응답 = await request.post('/api/inquiries', { data: { category: '기타', title: '로그인 없는 문의', content: '로그인 없이 보낸 문의' } });
      await verify('로그인 없이 문의 등록을 요청하면 401 로 응답한다', 응답.status(), 401);
    });

    await test.step('로그인 없이 알림 목록 API 를 요청한다', async () => {
      const 응답 = await request.get('/api/notifications');
      await verify('로그인 없이 알림 목록을 요청하면 401 로 응답한다', 응답.status(), 401);
    });

    await test.step('로그인 없이 회원정보 수정 API 를 요청한다', async () => {
      const 응답 = await request.put('/api/me', { data: { name: '테스트회원', email: 'nomatch@example.com', phone: '', interests: [], avatar: null } });
      await verify('로그인 없이 회원정보 수정을 요청하면 401 로 응답한다', 응답.status(), 401);
    });
  } finally {
    await API로그인(page.request, 둘째아이디, 비밀번호);
  }
});

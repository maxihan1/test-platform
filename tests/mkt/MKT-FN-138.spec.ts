import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 새아이디, API로그인 } from './helpers/account.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-138',
  name: '새 아이디로 사용 가능 여부를 요청하면 available 이 true 다',
  platforms: ['desktop'],
  precondition: [
    '대상 서버 API 에 접근할 수 있다',
    '회원으로 로그인해 있다',
  ],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ request, params }) => {
  await test.step('아이디 사용 가능 여부 API 를 새 아이디로 요청한다', async () => {
    const 응답 = await request.get(`/api/auth/check-id?loginId=${새아이디()}`);
    await verify('아이디 사용 가능 여부 요청에 서버가 200 으로 응답한다', 응답.status(), 200, { blocker: true });
    const 본문 = (await 응답.json()) as { available?: boolean };
    await verify('새 아이디로 사용 가능 여부를 요청하면 available 이 true 다', 본문.available, true);
  });

  await test.step('로그인 API 를 맞는 계정으로 요청한다', async () => {
    const 상태 = await API로그인(request, params.loginId ?? '', params.password ?? '');
    await verify('맞는 계정으로 로그인을 요청하면 200 으로 응답한다', 상태, 200, { blocker: true });
  });

  await test.step('로그아웃 API 를 요청한다', async () => {
    const 응답 = await request.post('/api/auth/logout');
    await verify('로그인한 채 로그아웃을 요청하면 204 로 응답한다', 응답.status(), 204);
  });

  await test.step('내 정보 API 를 요청한다', async () => {
    const 상태 = await API로그인(request, params.loginId ?? '', params.password ?? '');
    await verify('로그인 요청이 200 으로 응답한다', 상태, 200, { blocker: true });
    const 응답 = await request.get('/api/auth/me');
    const 본문 = (await 응답.json()) as { loginId?: string };
    await verify('로그인한 채 내 정보를 요청하면 내 아이디가 든 응답이 온다', 본문.loginId, params.loginId);
  });

  await test.step('비밀번호 찾기 API 를 맞지 않는 아이디와 이메일로 요청한다', async () => {
    const 응답 = await request.post('/api/auth/find-password', { data: { loginId: params.loginId ?? '', email: 'nomatch@example.com' } });
    const 본문 = (await 응답.json()) as { message?: string };
    await verify('맞지 않는 아이디와 이메일로 비밀번호 찾기를 요청하면 일치하지 않는다는 응답이 온다', { 성공: 응답.ok(), 안내: 본문.message }, { 성공: false, 안내: '일치하는 회원 정보가 없습니다' });
  });

  await test.step('세션 API 를 요청한다', async () => {
    const 응답 = await request.get('/api/session');
    const 본문 = (await 응답.json()) as { user?: { loginId?: string } | null };
    await verify('로그인한 채 세션을 요청하면 user 에 내 정보가 든다', 본문.user?.loginId, params.loginId);
  });

  await test.step('FAQ 와 내 문의 목록 API 를 요청한다', async () => {
    const 질문 = (await (await request.get('/api/faq')).json()) as { items?: unknown };
    const 문의 = (await (await request.get('/api/inquiries')).json()) as { items?: unknown };
    await verify('FAQ 와 내 문의 목록을 요청하면 목록이 든 응답이 온다', { FAQ: Array.isArray(질문.items), 내문의: Array.isArray(문의.items) }, { FAQ: true, 내문의: true });
  });

  await test.step('알림 목록 API 를 요청한다', async () => {
    const 본문 = (await (await request.get('/api/notifications')).json()) as { items?: unknown; unread?: unknown };
    await verify('알림 목록을 요청하면 읽지 않은 수가 든 응답이 온다', { 읽지않은수: typeof 본문.unread, 목록: Array.isArray(본문.items) }, { 읽지않은수: 'number', 목록: true });
  });

  await test.step('비밀번호 재확인 API 를 맞는 비밀번호로 요청한다', async () => {
    const 응답 = await request.post('/api/me/verify-password', { data: { password: params.password ?? '' } });
    await verify('맞는 비밀번호로 비밀번호 재확인을 요청하면 성공으로 응답한다', 응답.ok(), true);
  });
});

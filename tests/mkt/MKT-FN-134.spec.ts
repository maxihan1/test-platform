import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인 } from './helpers/account.helper.js';
import { 내주문들읽기 } from './helpers/home.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-134',
  name: '로그인 없이 쿠폰 목록을 요청하면 401 로 응답하고 code 가 「UNAUTHORIZED」 다',
  platforms: ['desktop'],
  precondition: ['대상 서버 API 에 접근할 수 있다', '회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  techniques: ['동등 분할'],
});

test(spec, async ({ request, params }) => {
  await test.step('로그인 없이 쿠폰 목록 API 를 요청한다', async () => {
    const 응답 = await request.get('/api/coupons');
    const 본문 = (await 응답.json()) as { code?: string };
    await verify(
      '로그인 없이 쿠폰 목록을 요청하면 401 로 응답하고 code 가 「UNAUTHORIZED」 다',
      { 상태: 응답.status(), code: 본문.code },
      { 상태: 401, code: 'UNAUTHORIZED' },
    );
  });

  await test.step('없는 게시글 번호로 게시글 상세 API 를 요청한다', async () => {
    const 응답 = await request.get('/api/posts/99999999');
    const 본문 = (await 응답.json()) as { code?: string; message?: string };
    await verify(
      '없는 게시글을 요청하면 404 로 응답하고 code 가 「NOT_FOUND」 다',
      { 상태: 응답.status(), code: 본문.code },
      { 상태: 404, code: 'NOT_FOUND' },
    );
    await verify(
      '실패 응답 본문에 code 와 한국어 message 가 들어 있다',
      { code있음: typeof 본문.code === 'string' && 본문.code.length > 0, 한국어message: /[가-힣]/.test(본문.message ?? '') },
      { code있음: true, 한국어message: true },
    );
  });

  await test.step('주소 검색 API 를 한 글자로 요청한다', async () => {
    const 응답 = await request.get(`/api/address?q=${encodeURIComponent('가')}`);
    const 본문 = (await 응답.json()) as { code?: string };
    await verify(
      '주소 검색을 한 글자로 요청하면 400 으로 응답하고 code 가 「VALIDATION」 이다',
      { 상태: 응답.status(), code: 본문.code },
      { 상태: 400, code: 'VALIDATION' },
    );
  });

  await test.step('회원으로 로그인한다', async () => {
    await verify('로그인 요청이 200 으로 응답한다', await API로그인(request, params.loginId ?? '', params.password ?? ''), 200, { blocker: true });
  });

  await test.step('일반 회원으로 관리자 회원 목록 API 를 요청한다', async () => {
    const 응답 = await request.get('/api/admin/users');
    const 본문 = (await 응답.json()) as { code?: string };
    await verify(
      '일반 회원이 관리자 회원 목록을 요청하면 403 으로 응답하고 code 가 「FORBIDDEN」 이다',
      { 상태: 응답.status(), code: 본문.code },
      { 상태: 403, code: 'FORBIDDEN' },
    );
  });

  await test.step('배송중인 내 주문의 취소 API 를 요청한다', async () => {
    const 주문 = (await 내주문들읽기(request)).find((건) => 건.status === '배송중');
    await verify('내 주문에 배송중인 주문이 있다', 주문 !== undefined, true, { blocker: true });
    const 응답 = await request.post(`/api/orders/${encodeURIComponent(주문?.id ?? '')}/cancel`, { data: { reason: '단순 변심', detail: '' } });
    const 본문 = (await 응답.json()) as { code?: string };
    await verify(
      '배송중인 주문의 취소를 요청하면 409 로 응답하고 code 가 「CONFLICT」 다',
      { 상태: 응답.status(), code: 본문.code },
      { 상태: 409, code: 'CONFLICT' },
    );
  });
});

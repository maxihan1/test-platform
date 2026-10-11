import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인 } from './helpers/account.helper.js';
import { 장바구니되돌리기, 장바구니읽기 } from './helpers/cart.helper.js';
import { 옵션없는상품번호 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-133',
  name: '게시글 목록을 요청하면 응답 본문이 JSON 이다',
  platforms: ['desktop'],
  precondition: ['대상 서버 API 에 접근할 수 있다', '회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ request, params }) => {
  await test.step('게시글 목록 API 를 요청한다', async () => {
    const 응답 = await request.get('/api/posts');
    await verify('응답 코드가 200 이다', 응답.status(), 200, { blocker: true });
    const 본문 = await 응답.json().then(
      (값: unknown) => 값,
      () => undefined,
    );
    await verify(
      '게시글 목록을 요청하면 응답 본문이 JSON 이다',
      { 형식: (응답.headers()['content-type'] ?? '').includes('application/json'), 읽힘: 본문 !== undefined },
      { 형식: true, 읽힘: true },
    );
  });

  await test.step('게시글 목록 API 를 page=1 · size=5 로 요청한다', async () => {
    const 응답 = await request.get('/api/posts?page=1&size=5');
    const 본문 = (await 응답.json()) as { items?: unknown; total?: unknown; page?: unknown; size?: unknown };
    await verify(
      '게시글 목록을 page=1 · size=5 로 요청하면 items · total · page · size 가 든 응답이 온다',
      { items: Array.isArray(본문.items), total: typeof 본문.total === 'number', page: 본문.page, size: 본문.size },
      { items: true, total: true, page: 1, size: 5 },
    );
  });

  await test.step('회원으로 로그인한다', async () => {
    await verify('로그인 요청이 200 으로 응답한다', await API로그인(request, params.loginId ?? '', params.password ?? ''), 200, { blocker: true });
  });

  await test.step('장바구니 담기와 그 줄 지우기 API 를 차례로 요청한다', async () => {
    const 처음 = await 장바구니읽기(request);
    try {
      const 담기 = await request.post('/api/cart', { data: { productId: 옵션없는상품번호, color: '', size: '', qty: 1 } });
      const 줄 = (await 담기.json().catch(() => ({}))) as { id?: number };
      const 지우기 = await request.delete(`/api/cart/${줄.id ?? 0}`);
      await verify(
        '장바구니 담기를 요청하면 201, 그 줄 지우기를 요청하면 204 로 응답한다',
        { 담기: 담기.status(), 지우기: 지우기.status() },
        { 담기: 201, 지우기: 204 },
      );
    } finally {
      await 장바구니되돌리기(request, 처음);
    }
  });
});

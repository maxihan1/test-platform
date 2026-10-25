import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 몸읽기 } from './helpers/my-admin-tools.helper.js';
import { 로그인한아이디 } from './helpers/my-admin-tools.helper.js';

export const spec = defineCase({
  tcId: 'DMW-FN-342',
  name: '목록 조회는 items · total · page · size 를 담아 응답한다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: z.object({
    쪽: z.number().int().min(1).describe('요청할 page — 1 이상').default(2),
    크기: z.number().int().min(1).max(100).describe('요청할 size — 1~100').default(5),
  }),
  expected: null,
});

test(spec, async ({ request, params }) => {
  let 몸: { items?: unknown; total?: unknown; page?: unknown; size?: unknown } = {};

  await test.step('비회원임을 확인한다', async () => {
    await verify('비회원이다', await 로그인한아이디(request), null, { blocker: true });
  });

  await test.step('GET /api/posts?page=2&size=5 를 부른다', async () => {
    const 응답 = await request.get(`/api/posts?page=${params.쪽}&size=${params.크기}`);
    몸 = await 몸읽기<typeof 몸>(응답);
    const 목록 = await verify('items 가 목록이다', Array.isArray(몸.items), true);
    const 전체 = await verify('total 이 숫자다', typeof 몸.total, 'number');
    const 쪽 = await verify('page 가 숫자다', typeof 몸.page, 'number');
    const 크기 = await verify('size 가 숫자다', typeof 몸.size, 'number');
    await verify('목록 조회는 items · total · page · size 를 담아 응답한다', 목록 && 전체 && 쪽 && 크기, true);
  });

  await test.step('page=2&size=5 응답의 page · size 를 확인한다', async () => {
    const 쪽 = await verify('응답의 page 는 요청한 값이다', 몸.page, params.쪽);
    const 크기 = await verify('응답의 size 는 요청한 값이다', 몸.size, params.크기);
    await verify('목록 조회 응답의 page · size 는 요청한 값이다', 쪽 && 크기, true);
  });
});

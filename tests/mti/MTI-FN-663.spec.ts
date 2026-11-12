import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 건드리지않은글낱말 } from './helpers/social.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-663',
  name: '상호작용하지 않은 글의 낱말로 글을 검색하면 statuses 가 비어 있다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다', '일반 회원이 상호작용하지 않은 hana_photo 글이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    글수: z.number().describe('검색 결과의 글 수').default(0),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 낱말 = await 건드리지않은글낱말(request, 토큰, 'hana_photo');
  await test.step('검색할 낱말을 확인한다', async () => {
    await verify('일반 회원이 상호작용하지 않은 hana_photo 글이 있다', 낱말 !== '', true, { blocker: true });
  });
  await test.step('일반 회원 토큰으로 hana_photo 글의 낱말로 type=statuses 검색을 부른다', async () => {
    const 응답 = await request.get(`/api/v2/search?q=${encodeURIComponent(낱말)}&type=statuses`, { headers: 머리(토큰) });
    await verify('검색 응답 코드가 200 이다', 응답.status(), 200, { blocker: true });
    const 몸 = (await 응답.json()) as { statuses?: unknown[] };
    await verify('상호작용하지 않은 글의 낱말로 글을 검색하면 statuses 가 비어 있다', (몸.statuses ?? []).length, expected.글수);
  });
});

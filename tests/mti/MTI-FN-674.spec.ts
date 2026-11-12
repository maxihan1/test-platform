import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 이름으로번호 } from './helpers/resource.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-674',
  name: '남의 리스트를 부르면 응답 코드가 404 다',
  apiDoc: 1,
  precondition: ['일반 회원의 리스트 「개발 소식」이 있다', '일반 회원의 필터 「스포일러」가 있다', '두 번째 사용자 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
    user2Password: z.string().describe('두 번째 사용자 토큰').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(404),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 남토큰 = params.user2Password ?? '';
  const 리스트 = await 이름으로번호(request, 토큰, '/api/v1/lists', '개발 소식');
  const 필터 = await 이름으로번호(request, 토큰, '/api/v2/filters', '스포일러');
  await test.step('남의 리스트와 필터를 확인한다', async () => {
    await verify('일반 회원의 리스트 「개발 소식」이 있다', 리스트 !== '', true, { blocker: true });
    await verify('일반 회원의 필터 「스포일러」가 있다', 필터 !== '', true, { blocker: true });
  });
  await test.step('두 번째 사용자 토큰으로 일반 회원의 리스트를 GET /api/v1/lists/{id} 로 부른다', async () => {
    const 응답 = await request.get(`/api/v1/lists/${리스트}`, { headers: 머리(남토큰) });
    await verify('남의 리스트를 부르면 응답 코드가 404 다', 응답.status(), expected.응답코드);
  });
  await test.step('두 번째 사용자 토큰으로 일반 회원의 필터를 GET /api/v2/filters/{id} 로 부른다', async () => {
    const 응답 = await request.get(`/api/v2/filters/${필터}`, { headers: 머리(남토큰) });
    await verify('남의 필터 조회의 응답 코드가 404 다', 응답.status(), expected.응답코드);
  });
});

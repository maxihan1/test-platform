import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 컬렉션계정채우기, 컬렉션항목넣기 } from './helpers/collection.helper.js';
import { 컬렉션만들기, 컬렉션지우기 } from './helpers/resource.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-714',
  name: '컬렉션에 계정 26개째를 더하면 응답 코드가 422 다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다', '컬렉션에 넣을 계정이 26개 있다', '일반 회원이 만든 컬렉션에 계정이 24개 들어 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    안쪽응답코드: z.number().describe('25개째를 더할 때 응답 코드').default(200),
    바깥쪽응답코드: z.number().describe('26개째를 더할 때 응답 코드').default(422),
  }),
  techniques: ['경계값 분석'],
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  let 컬렉션 = '';
  try {
    컬렉션 = await 컬렉션만들기(request, 토큰);
    const 채움 = 컬렉션 === '' ? { 넣은수: 0, 남은후보: [] as string[] } : await 컬렉션계정채우기(request, 토큰, 컬렉션, 24);
    await test.step('준비한 컬렉션을 확인한다', async () => {
      await verify('일반 회원이 만든 컬렉션에 계정이 24개 들어 있다', 채움.넣은수, 24, { blocker: true });
    });
    await test.step('컬렉션에 25번째 계정을 더한다', async () => {
      const 응답 = await 컬렉션항목넣기(request, 토큰, 컬렉션, 채움.남은후보[0] ?? '');
      await verify('계정 25개째까지는 응답 코드가 200 이다', 응답.status(), expected.안쪽응답코드);
    });
    await test.step('컬렉션에 26번째 계정을 더한다', async () => {
      const 응답 = await 컬렉션항목넣기(request, 토큰, 컬렉션, 채움.남은후보[1] ?? '');
      await verify('컬렉션에 계정 26개째를 더하면 응답 코드가 422 다', 응답.status(), expected.바깥쪽응답코드);
    });
  } finally {
    await 컬렉션지우기(request, 토큰, 컬렉션);
  }
});

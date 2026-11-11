import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글들지우기, 글올리기, 응답번호 } from './helpers/post.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-615',
  name: '설문 항목 1개로 글을 쓰면 응답 코드가 422 다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    바깥쪽응답코드: z.number().describe('항목이 모자랄 때 응답 코드').default(422),
    안쪽응답코드: z.number().describe('항목 수가 허용 범위 안일 때 응답 코드').default(200),
    넘칠때응답코드: z.number().describe('항목이 넘칠 때 응답 코드').default(422),
  }),
  techniques: ['경계값 분석'],
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 만든: string[] = [];
  try {
    await test.step('항목 1개로 설문 글을 쓴다', async () => {
      const 응답 = await 글올리기(request, 토큰, { poll: { options: ['사과'], expires_in: 3600 } });
      만든.push(await 응답번호(응답));
      await verify('설문 항목 1개로 글을 쓰면 응답 코드가 422 다', 응답.status(), expected.바깥쪽응답코드);
    });
    await test.step('항목 2개로 설문 글을 쓴다', async () => {
      const 응답 = await 글올리기(request, 토큰, { poll: { options: ['사과', '배'], expires_in: 3600 } });
      만든.push(await 응답번호(응답));
      await verify('설문 항목 2개 글의 응답 코드가 200 이다', 응답.status(), expected.안쪽응답코드);
    });
    await test.step('항목 4개로 설문 글을 쓴다', async () => {
      const 응답 = await 글올리기(request, 토큰, { poll: { options: ['사과', '배', '귤', '감'], expires_in: 3600 } });
      만든.push(await 응답번호(응답));
      await verify('설문 항목 4개 글의 응답 코드가 200 이다', 응답.status(), expected.안쪽응답코드);
    });
    await test.step('항목 5개로 설문 글을 쓴다', async () => {
      const 응답 = await 글올리기(request, 토큰, { poll: { options: ['사과', '배', '귤', '감', '포도'], expires_in: 3600 } });
      만든.push(await 응답번호(응답));
      await verify('설문 항목 5개 글의 응답 코드가 422 다', 응답.status(), expected.넘칠때응답코드);
    });
  } finally {
    await 글들지우기(request, 토큰, 만든);
  }
});

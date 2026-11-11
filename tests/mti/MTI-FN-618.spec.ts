import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글들지우기, 글올리기, 응답번호 } from './helpers/post.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-618',
  name: '설문 마감 299초로 글을 쓰면 응답 코드가 422 다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    바깥쪽응답코드: z.number().describe('마감이 허용 범위 밖일 때 응답 코드').default(422),
    안쪽응답코드: z.number().describe('마감이 허용 범위 안일 때 응답 코드').default(200),
  }),
  techniques: ['경계값 분석'],
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 만든: string[] = [];
  try {
    await test.step('poll[expires_in]=299 로 설문 글을 쓴다', async () => {
      const 응답 = await 글올리기(request, 토큰, { poll: { options: ['사과', '배'], expires_in: 299 } });
      만든.push(await 응답번호(응답));
      await verify('설문 마감 299초로 글을 쓰면 응답 코드가 422 다', 응답.status(), expected.바깥쪽응답코드);
    });
    await test.step('poll[expires_in]=300 으로 설문 글을 쓴다', async () => {
      const 응답 = await 글올리기(request, 토큰, { poll: { options: ['사과', '배'], expires_in: 300 } });
      만든.push(await 응답번호(응답));
      await verify('설문 마감 300초 글의 응답 코드가 200 이다', 응답.status(), expected.안쪽응답코드);
    });
    await test.step('poll[expires_in]=2629746 으로 설문 글을 쓴다', async () => {
      const 응답 = await 글올리기(request, 토큰, { poll: { options: ['사과', '배'], expires_in: 2629746 } });
      만든.push(await 응답번호(응답));
      await verify('설문 마감 2,629,746초 글의 응답 코드가 200 이다', 응답.status(), expected.안쪽응답코드);
    });
    await test.step('poll[expires_in]=2629747 로 설문 글을 쓴다', async () => {
      const 응답 = await 글올리기(request, 토큰, { poll: { options: ['사과', '배'], expires_in: 2629747 } });
      만든.push(await 응답번호(응답));
      await verify('설문 마감 2,629,747초 글의 응답 코드가 422 다', 응답.status(), expected.바깥쪽응답코드);
    });
  } finally {
    await 글들지우기(request, 토큰, 만든);
  }
});

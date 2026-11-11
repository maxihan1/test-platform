import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글올리기, 예약글들지우기, 예약글여럿만들기, 예약시각, 응답번호 } from './helpers/post.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-623',
  name: '같은 날 예약 글 25개째를 쓰면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다', '같은 날 예약 글이 24개 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    안쪽응답코드: z.number().describe('25개째 예약 글의 응답 코드').default(200),
    바깥쪽응답코드: z.number().describe('26개째 예약 글의 응답 코드').default(422),
    미리만든수: z.number().describe('같은 날 미리 만든 예약 글 수').default(24),
  }),
  techniques: ['경계값 분석'],
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 만든 = await 예약글여럿만들기(request, 토큰, 24, 70);
  try {
    await test.step('같은 날 만든 예약 글 개수를 확인한다', async () => {
      await verify('같은 날 예약 글이 24개 있다', 만든.filter((번호) => 번호 !== '').length, expected.미리만든수, { blocker: true });
    });
    await test.step('같은 날 예약 글을 25개째 쓴다', async () => {
      const 응답 = await 글올리기(request, 토큰, { visibility: 'direct', scheduled_at: 예약시각(70, 40) });
      만든.push(await 응답번호(응답));
      await verify('같은 날 예약 글 25개째를 쓰면 응답 코드가 200 이다', 응답.status(), expected.안쪽응답코드);
    });
    await test.step('같은 날 예약 글을 26개째 쓴다', async () => {
      const 응답 = await 글올리기(request, 토큰, { visibility: 'direct', scheduled_at: 예약시각(70, 41) });
      만든.push(await 응답번호(응답));
      await verify('같은 날 예약 글 26개째의 응답 코드가 422 다', 응답.status(), expected.바깥쪽응답코드);
    });
  } finally {
    await 예약글들지우기(request, 토큰, 만든);
  }
});

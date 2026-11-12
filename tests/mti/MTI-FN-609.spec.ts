import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글과미디어지우기, 글올리기, 미디어들지우기, 미디어여럿올리기, 응답번호 } from './helpers/post.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-609',
  name: '미디어 4개를 붙여 글을 쓰면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다', '일반 회원이 올린 미디어 아홉 개가 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    안쪽응답코드: z.number().describe('미디어 4개 글의 응답 코드').default(200),
    바깥쪽응답코드: z.number().describe('미디어 5개 글의 응답 코드').default(422),
    올린미디어수: z.number().describe('준비한 미디어 수').default(9),
  }),
  techniques: ['경계값 분석'],
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 미디어들 = await 미디어여럿올리기(request, 토큰, 9);
  const 만든: string[] = [];
  try {
    await test.step('올린 미디어 개수를 확인한다', async () => {
      await verify('일반 회원이 올린 미디어 아홉 개가 있다', 미디어들.filter((번호) => 번호 !== '').length, expected.올린미디어수, { blocker: true });
    });
    await test.step('미디어 4개를 붙여 글을 쓴다', async () => {
      const 응답 = await 글올리기(request, 토큰, { media_ids: 미디어들.slice(0, 4) });
      만든.push(await 응답번호(응답));
      await verify('미디어 4개를 붙여 글을 쓰면 응답 코드가 200 이다', 응답.status(), expected.안쪽응답코드);
    });
    await test.step('미디어 5개를 붙여 글을 쓴다', async () => {
      const 응답 = await 글올리기(request, 토큰, { media_ids: 미디어들.slice(4, 9) });
      만든.push(await 응답번호(응답));
      await verify('미디어 5개 글의 응답 코드가 422 다', 응답.status(), expected.바깥쪽응답코드);
    });
  } finally {
    for (const 번호 of 만든) await 글과미디어지우기(request, 토큰, 번호);
    await 미디어들지우기(request, 토큰, 미디어들);
  }
});

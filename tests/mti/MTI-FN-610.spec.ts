import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글과미디어지우기, 글올리기, 미디어들지우기, 미디어여럿올리기, 응답번호 } from './helpers/post.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-610',
  name: '미디어 5개를 붙여 쓰면 오류 문구가 「최대 4개까지 첨부할 수 있습니다」 다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다', '일반 회원이 올린 미디어 다섯 개가 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    오류문구: z.string().describe('미디어가 너무 많을 때 오류 문구').default('최대 4개까지 첨부할 수 있습니다'),
    올린미디어수: z.number().describe('준비한 미디어 수').default(5),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 미디어들 = await 미디어여럿올리기(request, 토큰, 5);
  const 만든: string[] = [];
  try {
    await test.step('올린 미디어 개수를 확인한다', async () => {
      await verify('일반 회원이 올린 미디어 다섯 개가 있다', 미디어들.filter((번호) => 번호 !== '').length, expected.올린미디어수, { blocker: true });
    });
    await test.step('미디어 5개를 붙여 POST /api/v1/statuses 를 부른다', async () => {
      const 응답 = await 글올리기(request, 토큰, { media_ids: 미디어들 });
      만든.push(await 응답번호(응답));
      const 몸 = (await 응답.json()) as { error?: string };
      await verify('미디어 5개를 붙여 쓰면 오류 문구가 「최대 4개까지 첨부할 수 있습니다」 다', 몸.error, expected.오류문구);
    });
  } finally {
    for (const 번호 of 만든) await 글과미디어지우기(request, 토큰, 번호);
    await 미디어들지우기(request, 토큰, 미디어들);
  }
});

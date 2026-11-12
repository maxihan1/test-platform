import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 파일올리기, 한도넘는동영상파일 } from './helpers/media.helper.js';
import { 미디어지우기 } from './helpers/resource.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-711',
  name: '99 MiB 를 넘는 동영상을 올리면 응답 코드가 200 이 아니다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    성공응답코드: z.number().describe('거절되면 나오면 안 되는 응답 코드').default(200),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  let 번호 = '';
  try {
    await test.step('99 MiB 를 넘는 동영상을 올린다', async () => {
      const 올림 = await 파일올리기(request, 토큰, 한도넘는동영상파일());
      번호 = 올림.번호;
      await verify('99 MiB 를 넘는 동영상을 올리면 응답 코드가 200 이 아니다', 올림.응답코드 !== expected.성공응답코드, true);
    });
  } finally {
    await 미디어지우기(request, 토큰, 번호);
  }
});

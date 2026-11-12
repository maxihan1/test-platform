import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글들지우기, 글올리기, 응답번호 } from './helpers/post.helper.js';
import { 첫공개글 } from './helpers/status.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-606',
  name: '멘션하지 않은 사용자의 글을 direct 로 인용하면 응답 코드가 200 이 아니다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다', '시드 계정 hana_photo 의 공개 글이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    성공응답코드: z.number().describe('인용이 막히면 나오면 안 되는 응답 코드').default(200),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 대상글 = await 첫공개글(request, 'hana_photo');
  const 만든: string[] = [];
  try {
    await test.step('시드 계정 hana_photo 의 공개 글을 확인한다', async () => {
      await verify('시드 계정 hana_photo 의 공개 글이 있다', 대상글 !== '', true, { blocker: true });
    });
    await test.step('멘션하지 않은 hana_photo 의 글을 visibility=direct 로 인용해 쓴다', async () => {
      const 응답 = await 글올리기(request, 토큰, { visibility: 'direct', quoted_status_id: 대상글 });
      만든.push(await 응답번호(응답));
      await verify('멘션하지 않은 사용자의 글을 direct 로 인용하면 응답 코드가 200 이 아니다', 응답.status() !== expected.성공응답코드, true);
    });
  } finally {
    await 글들지우기(request, 토큰, 만든);
  }
});

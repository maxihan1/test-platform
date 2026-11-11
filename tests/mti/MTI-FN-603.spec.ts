import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 제한됨, 제한풀기, 제한하기 } from './helpers/post.helper.js';
import { 글지우기 } from './helpers/status.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-603',
  name: '제한된 계정이 public 글을 쓰면 visibility 가 unlisted 다',
  apiDoc: 1,
  precondition: ['두 번째 사용자를 관리 API 로 제한해 두었다'],
  params: z.object({
    user2Password: z.string().describe('두 번째 사용자 토큰').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: z.object({
    공개범위: z.string().describe('제한된 계정이 쓴 글의 공개 범위').default('unlisted'),
  }),
});

test(spec, async ({ request, admin, params, expected }) => {
  const 토큰2 = params.user2Password ?? '';
  let 번호 = '';
  try {
    await 제한하기(admin, 'qa_user2');
    const 제한 = await 제한됨(admin, 'qa_user2');
    await test.step('두 번째 사용자의 제한 상태를 확인한다', async () => {
      await verify('두 번째 사용자를 관리 API 로 제한해 두었다', 제한, true, { blocker: true });
    });
    await test.step('제한된 두 번째 사용자가 visibility=public 으로 글을 쓴다', async () => {
      const 응답 = await request.post('/api/v1/statuses', { headers: 머리(토큰2), data: { status: 'MTI 제한 시험 글', visibility: 'public' } });
      const 몸 = (await 응답.json()) as { id?: string; visibility?: string };
      번호 = 몸.id ?? '';
      await verify('제한된 계정이 public 글을 쓰면 visibility 가 unlisted 다', 몸.visibility, expected.공개범위);
    });
  } finally {
    await 글지우기(request, 토큰2, 번호);
    await 제한풀기(admin, 'qa_user2');
  }
});

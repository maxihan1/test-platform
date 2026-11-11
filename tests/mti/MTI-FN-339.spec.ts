import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 공지반응달기, 공지반응빼기 } from './helpers/social.helper.js';
import { 첫번호 } from './helpers/status.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-339',
  name: 'DELETE /api/v1/announcements/{id}/reactions/{name} 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다', '공지가 있다', '일반 회원이 공지에 이모지 반응을 달아 두었다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 이모지 = '🎉';
  const 공지 = await 첫번호(request, 토큰, '/api/v1/announcements');
  try {
    const 달음 = await 공지반응달기(request, 토큰, 공지, 이모지);
    await test.step('준비한 공지 반응을 확인한다', async () => {
      await verify('공지가 있다', 공지 !== '', true, { blocker: true });
      await verify('일반 회원이 공지에 이모지 반응을 달아 두었다', 달음 === 200, true, { blocker: true });
    });
    await test.step('DELETE /api/v1/announcements/{id}/reactions/{name} 를 일반 회원 토큰으로 부른다', async () => {
      const 응답 = await request.delete(`/api/v1/announcements/${공지}/reactions/${encodeURIComponent(이모지)}`, { headers: 머리(토큰) });
      await verify('DELETE /api/v1/announcements/{id}/reactions/{name} 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
    });
  } finally {
    await 공지반응빼기(request, 토큰, 공지, 이모지);
  }
});

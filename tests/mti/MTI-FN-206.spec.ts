import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 읽은위치읽기, 읽은위치돌리기 } from './helpers/social.helper.js';
import { 첫번호 } from './helpers/status.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-206',
  name: 'POST /api/v1/markers 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다', '일반 회원의 홈 타임라인에 글이 있다', '일반 회원에게 알림이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  let 처음 = { home: '', notifications: '' };
  try {
    처음 = await 읽은위치읽기(request, 토큰);
    const 홈글 = await 첫번호(request, 토큰, '/api/v1/timelines/home');
    const 알림 = await 첫번호(request, 토큰, '/api/v1/notifications');
    await test.step('저장할 읽은 위치를 확인한다', async () => {
      await verify('일반 회원의 홈 타임라인에 글이 있다', 홈글 !== '', true, { blocker: true });
      await verify('일반 회원에게 알림이 있다', 알림 !== '', true, { blocker: true });
    });
    await test.step('POST /api/v1/markers 를 일반 회원 토큰으로 부른다', async () => {
      const 응답 = await request.post('/api/v1/markers', {
        headers: 머리(토큰),
        data: { home: { last_read_id: 홈글 }, notifications: { last_read_id: 알림 } },
      });
      await verify('POST /api/v1/markers 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다', 응답.status(), expected.응답코드);
      const 몸 = (await 응답.json()) as { home?: { last_read_id?: string } };
      await verify('응답의 home last_read_id 가 보낸 값과 같다', 몸.home?.last_read_id, 홈글);
    });
  } finally {
    await 읽은위치돌리기(request, 토큰, 처음);
  }
});

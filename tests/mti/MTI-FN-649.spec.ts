import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';
import { 읽은위치읽기, 읽은위치돌리기 } from './helpers/social.helper.js';
import { 첫번호 } from './helpers/status.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-649',
  name: '마커 저장이 충돌하면 응답 코드가 409 다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다', '일반 회원의 홈 타임라인에 글이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(409),
  }),
  techniques: ['동등 분할'],
  held: '보류 — 마커 저장 충돌을 일부러 낼 길이 없다',
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  let 처음 = { home: '', notifications: '' };
  try {
    처음 = await 읽은위치읽기(request, 토큰);
    const 홈글 = await 첫번호(request, 토큰, '/api/v1/timelines/home');
    await test.step('저장할 읽은 위치를 확인한다', async () => {
      await verify('일반 회원의 홈 타임라인에 글이 있다', 홈글 !== '', true, { blocker: true });
    });
    await test.step('같은 마커를 동시에 두 번 저장한다', async () => {
      const 응답들 = await Promise.all([
        request.post('/api/v1/markers', { headers: 머리(토큰), data: { home: { last_read_id: 홈글 } } }),
        request.post('/api/v1/markers', { headers: 머리(토큰), data: { home: { last_read_id: 홈글 } } }),
      ]);
      await verify('마커 저장이 충돌하면 응답 코드가 409 다', Math.max(응답들[0].status(), 응답들[1].status()), expected.응답코드);
    });
  } finally {
    await 읽은위치돌리기(request, 토큰, 처음);
  }
});

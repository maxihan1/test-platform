import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리 } from './helpers/auth.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-651',
  name: '알림 목록을 부르면 모든 알림의 type 이 정해진 종류 가운데 하나다',
  apiDoc: 1,
  precondition: ['일반 회원 토큰이 있다'],
  params: z.object({
    userPassword: z.string().describe('일반 회원 토큰').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    벗어난종류: z.string().describe('정해진 종류에 없는 알림 type').default(''),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.userPassword ?? '';
  const 정해진종류 = [
    'mention', 'status', 'reblog', 'follow', 'follow_request', 'favourite', 'poll', 'update', 'severed_relationships',
    'moderation_warning', 'annual_report', 'admin.sign_up', 'admin.report', 'quote', 'quoted_update', 'added_to_collection', 'collection_update',
  ];
  await test.step('일반 회원 토큰으로 GET /api/v1/notifications?limit=80 을 부른다', async () => {
    const 응답 = await request.get('/api/v1/notifications?limit=80', { headers: 머리(토큰) });
    await verify('알림 목록 응답 코드가 200 이다', 응답.status(), 200, { blocker: true });
    const 줄들 = (await 응답.json()) as { type?: string }[];
    const 벗어난 = 줄들.map((줄) => 줄.type ?? '').filter((종류) => !정해진종류.includes(종류));
    await verify('알림 목록을 부르면 모든 알림의 type 이 정해진 종류 가운데 하나다', 벗어난.join(', '), expected.벗어난종류);
  });
});

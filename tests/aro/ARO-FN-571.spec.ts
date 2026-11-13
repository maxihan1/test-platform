import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 서버상태 } from './helpers/ops-api.helper.js';

export const spec = defineCase({
  tcId: 'ARO-FN-571',
  name: '/api/serverstatus 를 읽으면 maintenance.active · message · startsAt · endsAt 와 serverTime 이 있다',
  precondition: ['로그인하지 않았다'],
  params: z.object({
    API서버: z.string().url().describe('게임 API 서버 주소 — 운영툴과 같은 서버를 쓰는 API 서버').default('https://bossroom-api.maxihan.com'),
  }),
  expected: null,
});

test(spec, async ({ request, params }) => {
  await test.step('/api/serverstatus 를 읽는다', async () => {
    const 상태 = await 서버상태(request, params.API서버);
    const 점검칸 = await verify('maintenance 에 active · message · startsAt · endsAt 가 있다', Object.keys(상태.maintenance).sort().join(', '), 'active, endsAt, message, startsAt');
    const 시각 = await verify('serverTime 이 있다', typeof 상태.serverTime === 'string' && 상태.serverTime !== '', true);
    await verify('/api/serverstatus 를 읽으면 maintenance.active · message · startsAt · endsAt 와 serverTime 이 있다', 점검칸 && 시각, true);
  });
});

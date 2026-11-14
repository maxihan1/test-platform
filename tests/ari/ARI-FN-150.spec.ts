import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 시각 } from './helpers/api.helper.js';
import { 점검켜고서버상태읽기 } from './helpers/notice.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-150',
  name: '점검을 켜고 지금이 시작과 끝 사이면 maintenance.active 가 참이다',
  apiDoc: 2,
  precondition: ['대상 서버 줄에 고정 운영 키가 있다'],
  params: null,
  expected: z.object({
    점검중: z.boolean().describe('maintenance.active').default(true),
  }),
});

test(spec, async ({ request, admin, expected }) => {
  await test.step('시작을 1분 전 · 끝을 10분 뒤로 점검을 켠 뒤 GET /api/serverstatus 를 부른다', async () => {
    const { 켜기코드, 상태 } = await 점검켜고서버상태읽기(request, admin, {
      enabled: true,
      message: '[QA] ARI-FN-150 점검 시험',
      startsAt: 시각(-1),
      endsAt: 시각(10),
      allowedAccountIds: [],
    });
    await verify('점검이 켜졌다', 켜기코드, 200, { blocker: true });
    await verify('점검을 켜고 지금이 시작과 끝 사이면 maintenance.active 가 참이다', 상태?.maintenance.active, expected.점검중);
  });
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호 } from './helpers/account.helper.js';
import { 머리 } from './helpers/auth.helper.js';
import { 계정동작 } from './helpers/profile.helper.js';

export const spec = defineCase({
  tcId: 'MTI-FN-589',
  name: 'duration=0 으로 뮤트하면 뮤트 목록의 mute_expires_at 이 null 이다',
  apiDoc: 1,
  precondition: ['두 번째 사용자 토큰이 있다', '시드 계정 noisy_cho 가 있다'],
  params: z.object({
    user2Password: z.string().describe('두 번째 사용자 토큰').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: z.object({
    무기한: z.boolean().describe('뮤트 만료 시각이 비어 있는지').default(true),
  }),
});

test(spec, async ({ request, params, expected }) => {
  const 토큰 = params.user2Password ?? '';
  const 번호 = await 계정번호(request, 'noisy_cho');
  try {
    await test.step('준비한 번호를 확인한다', async () => {
      await verify('시드 계정 noisy_cho 가 있다', 번호 !== '', true, { blocker: true });
    });
    await test.step('duration=0 으로 두 번째 사용자가 noisy_cho 를 뮤트한다', async () => {
      await request.post(`/api/v1/accounts/${번호}/mute`, { headers: 머리(토큰), data: { duration: 0 } });
      const 응답 = await request.get('/api/v1/mutes', { headers: 머리(토큰) });
      const 줄들 = (await 응답.json()) as { id?: string; mute_expires_at?: string | null }[];
      const 줄 = 줄들.find((x) => x.id === 번호);
      await verify('duration=0 으로 뮤트하면 뮤트 목록의 mute_expires_at 이 null 이다', 줄 !== undefined && 줄.mute_expires_at === null, expected.무기한);
    });
  } finally {
    await 계정동작(request, 토큰, 번호, 'unmute');
  }
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'ARI-FN-171',
  name: '고정 운영 키로 GET /opsapi/summary 를 부르면 대시보드 숫자 여덟 칸이 돌아온다',
  apiDoc: 2,
  precondition: ['대상 서버 줄에 고정 운영 키가 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ admin, expected }) => {
  await test.step('고정 운영 키로 GET /opsapi/summary 를 불러 숫자 칸을 읽는다', async () => {
    const 응답 = await admin.get('/opsapi/summary');
    const 몸 = (await 응답.json().catch(() => ({}))) as Record<string, unknown>;
    const 코드 = await verify('GET /opsapi/summary 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 칸 = await verify(
      '응답 칸 이름이 여덟 개 대시보드 숫자와 같다',
      Object.keys(몸).sort().join(', '),
      ['characters', 'chatMuted', 'grantsToday', 'maintenance', 'noticesShowing', 'suspended', 'unclaimedGrantMails', 'users'].join(', '),
    );
    await verify('고정 운영 키로 GET /opsapi/summary 를 부르면 대시보드 숫자 여덟 칸이 돌아온다', 코드 && 칸, true);
  });
});

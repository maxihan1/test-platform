import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'ARI-FN-149',
  name: '인증 없이 GET /api/serverstatus 를 부르면 200 과 maintenance · notices · serverTime 이 돌아온다',
  apiDoc: 2,
  precondition: ['대상 서버에 접근할 수 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ request, expected }) => {
  await test.step('인증 없이 GET /api/serverstatus 를 부른다', async () => {
    const 응답 = await request.get('/api/serverstatus');
    const 몸 = (await 응답.json().catch(() => ({}))) as { maintenance?: unknown; notices?: unknown; serverTime?: unknown };
    const 코드 = await verify('응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 점검 = await verify('응답에 maintenance 가 있다', typeof 몸.maintenance === 'object' && 몸.maintenance !== null, true);
    const 공지 = await verify('응답의 notices 가 배열이다', Array.isArray(몸.notices), true);
    const 시각 = await verify('응답에 serverTime 이 있다', typeof 몸.serverTime === 'string', true);
    await verify('인증 없이 GET /api/serverstatus 를 부르면 200 과 maintenance · notices · serverTime 이 돌아온다', 코드 && 점검 && 공지 && 시각, true);
  });
});

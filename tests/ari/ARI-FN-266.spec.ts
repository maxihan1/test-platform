import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'ARI-FN-266',
  name: 'GET /opsapi/logs/audit 를 부르면 at 이 늦은 것부터 보인다',
  apiDoc: 2,
  precondition: ['대상 서버 줄에 고정 운영 키가 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ admin, expected }) => {
  await test.step('고정 운영 키로 GET /opsapi/logs/audit 를 부른다', async () => {
    const 응답 = await admin.get('/opsapi/logs/audit');
    const 몸 = (await 응답.json().catch(() => ({}))) as { items?: { at: string }[] };
    const 시각들 = (몸.items ?? []).map((r) => Date.parse(r.at));
    const 코드 = await verify('GET /opsapi/logs/audit 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    await verify('기록이 두 건 이상 있다', 시각들.length >= 2, true, { blocker: true });
    const 뒤집힘 = 시각들.slice(1).filter((t, i) => t > (시각들[i] ?? t) + 1000).length;
    const 순서 = await verify('앞 기록보다 1초 넘게 늦은 기록 수가 0 이다', 뒤집힘, 0);
    await verify('GET /opsapi/logs/audit 를 부르면 at 이 늦은 것부터 보인다', 코드 && 순서, true);
  });
});

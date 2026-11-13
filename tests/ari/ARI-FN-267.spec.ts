import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'ARI-FN-267',
  name: 'GET /opsapi/logs/audit 를 부르면 모든 기록의 area 가 AUTH · SANCTION · GRANT · NOTICE · MAINTENANCE 가운데 하나다',
  apiDoc: 2,
  precondition: ['대상 서버 줄에 고정 운영 키가 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ admin, expected }) => {
  await test.step('고정 운영 키로 GET /opsapi/logs/audit 를 불러 area 를 읽는다', async () => {
    const 응답 = await admin.get('/opsapi/logs/audit', { params: { size: 200 } });
    const 몸 = (await 응답.json().catch(() => ({}))) as { items?: { area: string }[] };
    const 영역들 = (몸.items ?? []).map((r) => r.area);
    const 코드 = await verify('GET /opsapi/logs/audit 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    await verify('기록이 한 건 이상 있다', 영역들.length >= 1, true, { blocker: true });
    const 허용 = ['AUTH', 'SANCTION', 'GRANT', 'NOTICE', 'MAINTENANCE'];
    const 벗어남 = await verify('허용한 다섯 영역 밖의 area 가 없다', 영역들.filter((a) => !허용.includes(a)).join(', '), '');
    await verify('GET /opsapi/logs/audit 를 부르면 모든 기록의 area 가 AUTH · SANCTION · GRANT · NOTICE · MAINTENANCE 가운데 하나다', 코드 && 벗어남, true);
  });
});

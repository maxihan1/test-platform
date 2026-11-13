import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'ARI-FN-271',
  name: 'GET /opsapi/logs/items 를 부르면 모든 기록의 kind 가 GRANTED · TAKEN · RECALLED 가운데 하나다',
  apiDoc: 2,
  precondition: ['대상 서버 줄에 고정 운영 키가 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ admin, expected }) => {
  await test.step('고정 운영 키로 GET /opsapi/logs/items 를 불러 kind 를 읽는다', async () => {
    const 응답 = await admin.get('/opsapi/logs/items', { params: { size: 200 } });
    const 몸 = (await 응답.json().catch(() => ({}))) as { items?: { kind: string }[] };
    const 종류들 = (몸.items ?? []).map((r) => r.kind);
    const 코드 = await verify('GET /opsapi/logs/items 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    await verify('아이템 기록이 한 건 이상 있다', 종류들.length >= 1, true, { blocker: true });
    const 허용 = ['GRANTED', 'TAKEN', 'RECALLED'];
    const 벗어남 = await verify('허용한 세 종류 밖의 kind 가 없다', 종류들.filter((k) => !허용.includes(k)).join(', '), '');
    await verify('GET /opsapi/logs/items 를 부르면 모든 기록의 kind 가 GRANTED · TAKEN · RECALLED 가운데 하나다', 코드 && 벗어남, true);
  });
});

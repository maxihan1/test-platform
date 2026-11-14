import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'ARI-FN-195',
  name: 'q 를 비워 GET /opsapi/characters 를 부르면 이름 순으로 보인다',
  apiDoc: 2,
  precondition: ['대상 서버 줄에 고정 운영 키가 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ admin, expected }) => {
  await test.step('q 를 비워 GET /opsapi/characters 를 부른다', async () => {
    const 응답 = await admin.get('/opsapi/characters', { params: { q: '' } });
    const 몸 = (await 응답.json().catch(() => [])) as { name?: string }[];
    const 이름들 = (Array.isArray(몸) ? 몸 : []).map((c) => c.name ?? '');
    const 코드 = await verify('GET /opsapi/characters 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    await verify('캐릭터가 두 명 이상 보인다', 이름들.length >= 2, true, { blocker: true });
    const 순서 = await verify('캐릭터 이름이 이름 순이다', 이름들.join(', '), [...이름들].sort().join(', '));
    await verify('q 를 비워 GET /opsapi/characters 를 부르면 이름 순으로 보인다', 코드 && 순서, true);
  });
});

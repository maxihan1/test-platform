import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'ARI-FN-198',
  name: 'GET /opsapi/items/known 을 부르면 문자열 배열이 돌아온다',
  apiDoc: 2,
  precondition: ['대상 서버 줄에 고정 운영 키가 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
  }),
});

test(spec, async ({ admin, expected }) => {
  await test.step('고정 운영 키로 GET /opsapi/items/known 을 부른다', async () => {
    const 응답 = await admin.get('/opsapi/items/known');
    const 몸 = (await 응답.json().catch(() => null)) as unknown;
    const 코드 = await verify('GET /opsapi/items/known 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 배열 = await verify('응답 본문이 배열이다', Array.isArray(몸), true);
    const 글자들 = await verify('응답 배열의 모든 값이 문자열이다', Array.isArray(몸) && 몸.every((값) => typeof 값 === 'string'), true);
    await verify('GET /opsapi/items/known 을 부르면 문자열 배열이 돌아온다', 코드 && 배열 && 글자들, true);
  });
});

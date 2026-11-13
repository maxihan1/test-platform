import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'ARI-FN-507',
  name: '아이템이 5,000건을 넘을 때 GET /opsapi/items/known 을 부르면 최근 5,000건의 이름만 보인다',
  apiDoc: 2,
  held: '보류 — 아이템이 5,000건을 넘는 서버 상태',
  precondition: ['대상 서버 줄에 고정 운영 키가 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
    최대건수: z.number().int().describe('이름을 뽑는 최근 아이템 최대 건수').default(5000),
  }),
  techniques: ['경계값 분석'],
});

test(spec, async ({ admin, expected }) => {
  await test.step('아이템이 5,000건을 넘을 때 GET /opsapi/items/known 을 부른다', async () => {
    const 응답 = await admin.get('/opsapi/items/known');
    const 몸 = (await 응답.json().catch(() => [])) as unknown[];
    const 코드 = await verify('GET /opsapi/items/known 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 건수 = await verify('응답 이름 수가 최대 건수 이하다', Array.isArray(몸) && 몸.length <= expected.최대건수, true);
    await verify('아이템이 5,000건을 넘을 때 GET /opsapi/items/known 을 부르면 최근 5,000건의 이름만 보인다', 코드 && 건수, true);
  });
});

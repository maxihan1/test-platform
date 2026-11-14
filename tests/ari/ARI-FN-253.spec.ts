import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'ARI-FN-253',
  name: 'GET /opsapi/maintenance 를 부르면 id 1 인 점검 설정이 돌아온다',
  apiDoc: 2,
  precondition: ['대상 서버 줄에 고정 운영 키가 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
    설정번호: z.number().describe('점검 설정 id').default(1),
  }),
});

test(spec, async ({ admin, expected }) => {
  await test.step('고정 운영 키로 GET /opsapi/maintenance 를 부른다', async () => {
    const 응답 = await admin.get('/opsapi/maintenance');
    const 몸 = (await 응답.json().catch(() => ({}))) as { id?: number };
    const 코드 = await verify('응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 번호 = await verify('응답 id 가 기대 결과와 같다', 몸.id, expected.설정번호);
    await verify('GET /opsapi/maintenance 를 부르면 id 1 인 점검 설정이 돌아온다', 코드 && 번호, true);
  });
});

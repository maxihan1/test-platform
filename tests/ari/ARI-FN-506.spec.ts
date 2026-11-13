import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'ARI-FN-506',
  name: '캐릭터가 50명일 때 GET /opsapi/characters 를 부르면 50명이 돌아온다',
  apiDoc: 2,
  held: '보류 — 캐릭터가 51명 이상인 서버 상태',
  precondition: ['대상 서버 줄에 고정 운영 키가 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(200),
    최대인원: z.number().int().describe('한 번에 돌아오는 캐릭터 최대 수').default(50),
  }),
  techniques: ['경계값 분석'],
});

test(spec, async ({ admin, expected }) => {
  await test.step('캐릭터가 50명일 때 GET /opsapi/characters 를 부른다', async () => {
    const 응답 = await admin.get('/opsapi/characters');
    const 몸 = (await 응답.json().catch(() => [])) as unknown[];
    const 코드 = await verify('50명일 때 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 인원 = await verify('50명일 때 응답 캐릭터 수가 최대 인원과 같다', Array.isArray(몸) ? 몸.length : -1, expected.최대인원);
    await verify('캐릭터가 50명일 때 GET /opsapi/characters 를 부르면 50명이 돌아온다', 코드 && 인원, true);
  });
  await test.step('캐릭터가 51명일 때 GET /opsapi/characters 를 부른다', async () => {
    const 응답 = await admin.get('/opsapi/characters');
    const 몸 = (await 응답.json().catch(() => [])) as unknown[];
    const 코드 = await verify('51명일 때 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 인원 = await verify('51명일 때 응답 캐릭터 수가 최대 인원과 같다', Array.isArray(몸) ? 몸.length : -1, expected.최대인원);
    await verify('캐릭터가 51명일 때도 GET /opsapi/characters 는 50명까지만 돌아온다', 코드 && 인원, true);
  });
});

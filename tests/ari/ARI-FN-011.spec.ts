import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';


export const spec = defineCase({
  tcId: 'ARI-FN-011',
  name: '고정 운영 키로 /api 데이터 API 를 부르면 401 이다',
  apiDoc: 2,
  precondition: ['대상 서버 줄에 고정 운영 키가 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(401),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ admin, expected }) => {
  await test.step('고정 운영 키로 POST /api/getallplayercharacters 를 부른다', async () => {
    const 응답 = await admin.post('/api/getallplayercharacters', { data: {} });
    await verify('고정 운영 키로 /api 데이터 API 를 부르면 401 이다', 응답.status(), expected.응답코드);
  });
});

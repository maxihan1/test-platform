import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 본문글 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-501',
  name: '토큰 없이 GET /opsapi/notices 를 부르면 401 이고 본문이 비어 있다',
  apiDoc: 2,
  precondition: ['대상 서버에 접근할 수 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(401),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, expected }) => {
  await test.step('토큰 없이 GET /opsapi/notices 를 부른다', async () => {
    const 응답 = await request.get('/opsapi/notices');
    const 코드 = await verify('GET /opsapi/notices 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('GET /opsapi/notices 응답 본문이 비어 있다', (await 본문글(응답)).trim(), '');
    await verify('토큰 없이 GET /opsapi/notices 를 부르면 401 이고 본문이 비어 있다', 코드 && 본문, true);
  });
  await test.step('토큰 없이 POST /opsapi/notices 를 부른다', async () => {
    const 응답 = await request.post('/opsapi/notices', { data: {} });
    const 코드 = await verify('POST /opsapi/notices 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('POST /opsapi/notices 응답 본문이 비어 있다', (await 본문글(응답)).trim(), '');
    await verify('토큰 없이 부른 POST /opsapi/notices 응답은 401 이고 본문이 비어 있다', 코드 && 본문, true);
  });
  await test.step('토큰 없이 PUT /opsapi/notices/{id} 를 부른다', async () => {
    const 응답 = await request.put('/opsapi/notices/1', { data: {} });
    const 코드 = await verify('PUT /opsapi/notices/{id} 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('PUT /opsapi/notices/{id} 응답 본문이 비어 있다', (await 본문글(응답)).trim(), '');
    await verify('토큰 없이 부른 PUT /opsapi/notices/{id} 응답은 401 이고 본문이 비어 있다', 코드 && 본문, true);
  });
  await test.step('토큰 없이 DELETE /opsapi/notices/{id} 를 부른다', async () => {
    const 응답 = await request.delete('/opsapi/notices/1');
    const 코드 = await verify('DELETE /opsapi/notices/{id} 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('DELETE /opsapi/notices/{id} 응답 본문이 비어 있다', (await 본문글(응답)).trim(), '');
    await verify('토큰 없이 부른 DELETE /opsapi/notices/{id} 응답은 401 이고 본문이 비어 있다', 코드 && 본문, true);
  });
  await test.step('토큰 없이 GET /opsapi/maintenance 를 부른다', async () => {
    const 응답 = await request.get('/opsapi/maintenance');
    const 코드 = await verify('GET /opsapi/maintenance 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('GET /opsapi/maintenance 응답 본문이 비어 있다', (await 본문글(응답)).trim(), '');
    await verify('토큰 없이 부른 GET /opsapi/maintenance 응답은 401 이고 본문이 비어 있다', 코드 && 본문, true);
  });
  await test.step('토큰 없이 PUT /opsapi/maintenance 를 부른다', async () => {
    const 응답 = await request.put('/opsapi/maintenance', { data: {} });
    const 코드 = await verify('PUT /opsapi/maintenance 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('PUT /opsapi/maintenance 응답 본문이 비어 있다', (await 본문글(응답)).trim(), '');
    await verify('토큰 없이 부른 PUT /opsapi/maintenance 응답은 401 이고 본문이 비어 있다', 코드 && 본문, true);
  });
  await test.step('토큰 없이 GET /opsapi/logs/audit 를 부른다', async () => {
    const 응답 = await request.get('/opsapi/logs/audit');
    const 코드 = await verify('GET /opsapi/logs/audit 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('GET /opsapi/logs/audit 응답 본문이 비어 있다', (await 본문글(응답)).trim(), '');
    await verify('토큰 없이 부른 GET /opsapi/logs/audit 응답은 401 이고 본문이 비어 있다', 코드 && 본문, true);
  });
  await test.step('토큰 없이 GET /opsapi/logs/items 를 부른다', async () => {
    const 응답 = await request.get('/opsapi/logs/items');
    const 코드 = await verify('GET /opsapi/logs/items 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('GET /opsapi/logs/items 응답 본문이 비어 있다', (await 본문글(응답)).trim(), '');
    await verify('토큰 없이 부른 GET /opsapi/logs/items 응답은 401 이고 본문이 비어 있다', 코드 && 본문, true);
  });
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 본문글 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-166',
  name: '토큰 없이 GET /opsapi/summary 를 부르면 401 이고 본문이 비어 있다',
  apiDoc: 2,
  precondition: ['대상 서버에 접근할 수 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(401),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, expected }) => {
  await test.step('토큰 없이 GET /opsapi/summary 를 부른다', async () => {
    const 응답 = await request.get('/opsapi/summary');
    const 코드 = await verify('GET /opsapi/summary 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('GET /opsapi/summary 응답 본문이 비어 있다', (await 본문글(응답)).trim(), '');
    await verify('토큰 없이 GET /opsapi/summary 를 부르면 401 이고 본문이 비어 있다', 코드 && 본문, true);
  });
  await test.step('토큰 없이 GET /opsapi/users 를 부른다', async () => {
    const 응답 = await request.get('/opsapi/users');
    const 코드 = await verify('GET /opsapi/users 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('GET /opsapi/users 응답 본문이 비어 있다', (await 본문글(응답)).trim(), '');
    await verify('토큰 없이 부른 GET /opsapi/users 응답은 401 이고 본문이 비어 있다', 코드 && 본문, true);
  });
  await test.step('토큰 없이 GET /opsapi/users/{id} 를 부른다', async () => {
    const 응답 = await request.get('/opsapi/users/1');
    const 코드 = await verify('GET /opsapi/users/{id} 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('GET /opsapi/users/{id} 응답 본문이 비어 있다', (await 본문글(응답)).trim(), '');
    await verify('토큰 없이 부른 GET /opsapi/users/{id} 응답은 401 이고 본문이 비어 있다', 코드 && 본문, true);
  });
  await test.step('토큰 없이 POST /opsapi/users/{id}/sanctions 를 부른다', async () => {
    const 응답 = await request.post('/opsapi/users/1/sanctions', { data: {} });
    const 코드 = await verify('POST /opsapi/users/{id}/sanctions 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('POST /opsapi/users/{id}/sanctions 응답 본문이 비어 있다', (await 본문글(응답)).trim(), '');
    await verify('토큰 없이 부른 POST /opsapi/users/{id}/sanctions 응답은 401 이고 본문이 비어 있다', 코드 && 본문, true);
  });
  await test.step('토큰 없이 POST /opsapi/sanctions/{id}/release 를 부른다', async () => {
    const 응답 = await request.post('/opsapi/sanctions/1/release', { data: {} });
    const 코드 = await verify('POST /opsapi/sanctions/{id}/release 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('POST /opsapi/sanctions/{id}/release 응답 본문이 비어 있다', (await 본문글(응답)).trim(), '');
    await verify('토큰 없이 부른 POST /opsapi/sanctions/{id}/release 응답은 401 이고 본문이 비어 있다', 코드 && 본문, true);
  });
  await test.step('토큰 없이 GET /opsapi/characters 를 부른다', async () => {
    const 응답 = await request.get('/opsapi/characters');
    const 코드 = await verify('GET /opsapi/characters 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('GET /opsapi/characters 응답 본문이 비어 있다', (await 본문글(응답)).trim(), '');
    await verify('토큰 없이 부른 GET /opsapi/characters 응답은 401 이고 본문이 비어 있다', 코드 && 본문, true);
  });
  await test.step('토큰 없이 GET /opsapi/items/known 를 부른다', async () => {
    const 응답 = await request.get('/opsapi/items/known');
    const 코드 = await verify('GET /opsapi/items/known 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('GET /opsapi/items/known 응답 본문이 비어 있다', (await 본문글(응답)).trim(), '');
    await verify('토큰 없이 부른 GET /opsapi/items/known 응답은 401 이고 본문이 비어 있다', 코드 && 본문, true);
  });
  await test.step('토큰 없이 GET /opsapi/grants 를 부른다', async () => {
    const 응답 = await request.get('/opsapi/grants');
    const 코드 = await verify('GET /opsapi/grants 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('GET /opsapi/grants 응답 본문이 비어 있다', (await 본문글(응답)).trim(), '');
    await verify('토큰 없이 부른 GET /opsapi/grants 응답은 401 이고 본문이 비어 있다', 코드 && 본문, true);
  });
  await test.step('토큰 없이 POST /opsapi/grants 를 부른다', async () => {
    const 응답 = await request.post('/opsapi/grants', { data: {} });
    const 코드 = await verify('POST /opsapi/grants 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('POST /opsapi/grants 응답 본문이 비어 있다', (await 본문글(응답)).trim(), '');
    await verify('토큰 없이 부른 POST /opsapi/grants 응답은 401 이고 본문이 비어 있다', 코드 && 본문, true);
  });
  await test.step('토큰 없이 POST /opsapi/grants/{id}/recall 를 부른다', async () => {
    const 응답 = await request.post('/opsapi/grants/1/recall', { data: {} });
    const 코드 = await verify('POST /opsapi/grants/{id}/recall 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('POST /opsapi/grants/{id}/recall 응답 본문이 비어 있다', (await 본문글(응답)).trim(), '');
    await verify('토큰 없이 부른 POST /opsapi/grants/{id}/recall 응답은 401 이고 본문이 비어 있다', 코드 && 본문, true);
  });
});

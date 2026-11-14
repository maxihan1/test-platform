import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 본문글 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-495',
  name: '토큰 없이 POST /api/savemailmessage 를 부르면 401 이고 본문이 비어 있다',
  apiDoc: 2,
  precondition: ['대상 서버에 접근할 수 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(401),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, expected }) => {
  await test.step('토큰 없이 POST /api/savemailmessage 를 부른다', async () => {
    const 응답 = await request.post('/api/savemailmessage', { data: {} });
    const 코드 = await verify('POST /api/savemailmessage 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('POST /api/savemailmessage 응답 본문이 비어 있다', (await 본문글(응답)).trim(), '');
    await verify('토큰 없이 POST /api/savemailmessage 를 부르면 401 이고 본문이 비어 있다', 코드 && 본문, true);
  });
  await test.step('토큰 없이 POST /api/getiteminstances 를 부른다', async () => {
    const 응답 = await request.post('/api/getiteminstances', { data: {} });
    const 코드 = await verify('POST /api/getiteminstances 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('POST /api/getiteminstances 응답 본문이 비어 있다', (await 본문글(응답)).trim(), '');
    await verify('토큰 없이 부른 POST /api/getiteminstances 응답은 401 이고 본문이 비어 있다', 코드 && 본문, true);
  });
  await test.step('토큰 없이 POST /api/saveiteminstance 를 부른다', async () => {
    const 응답 = await request.post('/api/saveiteminstance', { data: {} });
    const 코드 = await verify('POST /api/saveiteminstance 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('POST /api/saveiteminstance 응답 본문이 비어 있다', (await 본문글(응답)).trim(), '');
    await verify('토큰 없이 부른 POST /api/saveiteminstance 응답은 401 이고 본문이 비어 있다', 코드 && 본문, true);
  });
  await test.step('토큰 없이 POST /api/createauctionitem 를 부른다', async () => {
    const 응답 = await request.post('/api/createauctionitem', { data: {} });
    const 코드 = await verify('POST /api/createauctionitem 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('POST /api/createauctionitem 응답 본문이 비어 있다', (await 본문글(응답)).trim(), '');
    await verify('토큰 없이 부른 POST /api/createauctionitem 응답은 401 이고 본문이 비어 있다', 코드 && 본문, true);
  });
  await test.step('토큰 없이 POST /api/createmailmessage 를 부른다', async () => {
    const 응답 = await request.post('/api/createmailmessage', { data: {} });
    const 코드 = await verify('POST /api/createmailmessage 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('POST /api/createmailmessage 응답 본문이 비어 있다', (await 본문글(응답)).trim(), '');
    await verify('토큰 없이 부른 POST /api/createmailmessage 응답은 401 이고 본문이 비어 있다', 코드 && 본문, true);
  });
  await test.step('토큰 없이 POST /api/deleteauctionitem 를 부른다', async () => {
    const 응답 = await request.post('/api/deleteauctionitem', { data: {} });
    const 코드 = await verify('POST /api/deleteauctionitem 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('POST /api/deleteauctionitem 응답 본문이 비어 있다', (await 본문글(응답)).trim(), '');
    await verify('토큰 없이 부른 POST /api/deleteauctionitem 응답은 401 이고 본문이 비어 있다', 코드 && 본문, true);
  });
  await test.step('토큰 없이 POST /api/deletemailmessage 를 부른다', async () => {
    const 응답 = await request.post('/api/deletemailmessage', { data: {} });
    const 코드 = await verify('POST /api/deletemailmessage 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('POST /api/deletemailmessage 응답 본문이 비어 있다', (await 본문글(응답)).trim(), '');
    await verify('토큰 없이 부른 POST /api/deletemailmessage 응답은 401 이고 본문이 비어 있다', 코드 && 본문, true);
  });
  await test.step('토큰 없이 POST /api/createiteminstance 를 부른다', async () => {
    const 응답 = await request.post('/api/createiteminstance', { data: {} });
    const 코드 = await verify('POST /api/createiteminstance 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('POST /api/createiteminstance 응답 본문이 비어 있다', (await 본문글(응답)).trim(), '');
    await verify('토큰 없이 부른 POST /api/createiteminstance 응답은 401 이고 본문이 비어 있다', 코드 && 본문, true);
  });
  await test.step('토큰 없이 POST /api/deleteiteminstance 를 부른다', async () => {
    const 응답 = await request.post('/api/deleteiteminstance', { data: {} });
    const 코드 = await verify('POST /api/deleteiteminstance 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('POST /api/deleteiteminstance 응답 본문이 비어 있다', (await 본문글(응답)).trim(), '');
    await verify('토큰 없이 부른 POST /api/deleteiteminstance 응답은 401 이고 본문이 비어 있다', 코드 && 본문, true);
  });
  await test.step('토큰 없이 POST /api/getplayercharacters 를 부른다', async () => {
    const 응답 = await request.post('/api/getplayercharacters', { data: {} });
    const 코드 = await verify('POST /api/getplayercharacters 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('POST /api/getplayercharacters 응답 본문이 비어 있다', (await 본문글(응답)).trim(), '');
    await verify('토큰 없이 부른 POST /api/getplayercharacters 응답은 401 이고 본문이 비어 있다', 코드 && 본문, true);
  });
});

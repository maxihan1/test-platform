import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 본문글 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-496',
  name: '토큰 없이 POST /api/saveplayercharacter 를 부르면 401 이고 본문이 비어 있다',
  apiDoc: 2,
  precondition: ['대상 서버에 접근할 수 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(401),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, expected }) => {
  await test.step('토큰 없이 POST /api/saveplayercharacter 를 부른다', async () => {
    const 응답 = await request.post('/api/saveplayercharacter', { data: {} });
    const 코드 = await verify('POST /api/saveplayercharacter 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('POST /api/saveplayercharacter 응답 본문이 비어 있다', (await 본문글(응답)).trim(), '');
    await verify('토큰 없이 POST /api/saveplayercharacter 를 부르면 401 이고 본문이 비어 있다', 코드 && 본문, true);
  });
  await test.step('토큰 없이 POST /api/createplayercharacter 를 부른다', async () => {
    const 응답 = await request.post('/api/createplayercharacter', { data: {} });
    const 코드 = await verify('POST /api/createplayercharacter 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('POST /api/createplayercharacter 응답 본문이 비어 있다', (await 본문글(응답)).trim(), '');
    await verify('토큰 없이 부른 POST /api/createplayercharacter 응답은 401 이고 본문이 비어 있다', 코드 && 본문, true);
  });
  await test.step('토큰 없이 POST /api/deleteplayercharacter 를 부른다', async () => {
    const 응답 = await request.post('/api/deleteplayercharacter', { data: {} });
    const 코드 = await verify('POST /api/deleteplayercharacter 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('POST /api/deleteplayercharacter 응답 본문이 비어 있다', (await 본문글(응답)).trim(), '');
    await verify('토큰 없이 부른 POST /api/deleteplayercharacter 응답은 401 이고 본문이 비어 있다', 코드 && 본문, true);
  });
  await test.step('토큰 없이 POST /api/getallplayercharacters 를 부른다', async () => {
    const 응답 = await request.post('/api/getallplayercharacters', { data: {} });
    const 코드 = await verify('POST /api/getallplayercharacters 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('POST /api/getallplayercharacters 응답 본문이 비어 있다', (await 본문글(응답)).trim(), '');
    await verify('토큰 없이 부른 POST /api/getallplayercharacters 응답은 401 이고 본문이 비어 있다', 코드 && 본문, true);
  });
});

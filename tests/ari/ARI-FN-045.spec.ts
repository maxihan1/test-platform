import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 본문글 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-045',
  name: '토큰 없이 POST /api/getguilds 를 부르면 401 이고 본문이 비어 있다',
  apiDoc: 2,
  precondition: ['대상 서버에 접근할 수 있다'],
  params: null,
  expected: z.object({
    응답코드: z.number().describe('응답 코드').default(401),
  }),
  techniques: ['동등 분할'],
});

test(spec, async ({ request, expected }) => {
  await test.step('토큰 없이 POST /api/getguilds 를 부른다', async () => {
    const 응답 = await request.post('/api/getguilds', { data: {} });
    const 코드 = await verify('POST /api/getguilds 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('POST /api/getguilds 응답 본문이 비어 있다', (await 본문글(응답)).trim(), '');
    await verify('토큰 없이 POST /api/getguilds 를 부르면 401 이고 본문이 비어 있다', 코드 && 본문, true);
  });
  await test.step('토큰 없이 POST /api/saveguild 를 부른다', async () => {
    const 응답 = await request.post('/api/saveguild', { data: {} });
    const 코드 = await verify('POST /api/saveguild 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('POST /api/saveguild 응답 본문이 비어 있다', (await 본문글(응답)).trim(), '');
    await verify('토큰 없이 부른 POST /api/saveguild 응답은 401 이고 본문이 비어 있다', 코드 && 본문, true);
  });
  await test.step('토큰 없이 POST /api/createguild 를 부른다', async () => {
    const 응답 = await request.post('/api/createguild', { data: {} });
    const 코드 = await verify('POST /api/createguild 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('POST /api/createguild 응답 본문이 비어 있다', (await 본문글(응답)).trim(), '');
    await verify('토큰 없이 부른 POST /api/createguild 응답은 401 이고 본문이 비어 있다', 코드 && 본문, true);
  });
  await test.step('토큰 없이 POST /api/deleteguild 를 부른다', async () => {
    const 응답 = await request.post('/api/deleteguild', { data: {} });
    const 코드 = await verify('POST /api/deleteguild 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('POST /api/deleteguild 응답 본문이 비어 있다', (await 본문글(응답)).trim(), '');
    await verify('토큰 없이 부른 POST /api/deleteguild 응답은 401 이고 본문이 비어 있다', 코드 && 본문, true);
  });
  await test.step('토큰 없이 POST /api/getfriendlists 를 부른다', async () => {
    const 응답 = await request.post('/api/getfriendlists', { data: {} });
    const 코드 = await verify('POST /api/getfriendlists 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('POST /api/getfriendlists 응답 본문이 비어 있다', (await 본문글(응답)).trim(), '');
    await verify('토큰 없이 부른 POST /api/getfriendlists 응답은 401 이고 본문이 비어 있다', 코드 && 본문, true);
  });
  await test.step('토큰 없이 POST /api/getmailmessage 를 부른다', async () => {
    const 응답 = await request.post('/api/getmailmessage', { data: {} });
    const 코드 = await verify('POST /api/getmailmessage 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('POST /api/getmailmessage 응답 본문이 비어 있다', (await 본문글(응답)).trim(), '');
    await verify('토큰 없이 부른 POST /api/getmailmessage 응답은 401 이고 본문이 비어 있다', 코드 && 본문, true);
  });
  await test.step('토큰 없이 POST /api/savefriendlist 를 부른다', async () => {
    const 응답 = await request.post('/api/savefriendlist', { data: {} });
    const 코드 = await verify('POST /api/savefriendlist 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('POST /api/savefriendlist 응답 본문이 비어 있다', (await 본문글(응답)).trim(), '');
    await verify('토큰 없이 부른 POST /api/savefriendlist 응답은 401 이고 본문이 비어 있다', 코드 && 본문, true);
  });
  await test.step('토큰 없이 POST /api/getauctionitems 를 부른다', async () => {
    const 응답 = await request.post('/api/getauctionitems', { data: {} });
    const 코드 = await verify('POST /api/getauctionitems 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('POST /api/getauctionitems 응답 본문이 비어 있다', (await 본문글(응답)).trim(), '');
    await verify('토큰 없이 부른 POST /api/getauctionitems 응답은 401 이고 본문이 비어 있다', 코드 && 본문, true);
  });
  await test.step('토큰 없이 POST /api/getmailmessages 를 부른다', async () => {
    const 응답 = await request.post('/api/getmailmessages', { data: {} });
    const 코드 = await verify('POST /api/getmailmessages 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('POST /api/getmailmessages 응답 본문이 비어 있다', (await 본문글(응답)).trim(), '');
    await verify('토큰 없이 부른 POST /api/getmailmessages 응답은 401 이고 본문이 비어 있다', 코드 && 본문, true);
  });
  await test.step('토큰 없이 POST /api/saveauctionitem 를 부른다', async () => {
    const 응답 = await request.post('/api/saveauctionitem', { data: {} });
    const 코드 = await verify('POST /api/saveauctionitem 응답 코드가 기대 결과와 같다', 응답.status(), expected.응답코드);
    const 본문 = await verify('POST /api/saveauctionitem 응답 본문이 비어 있다', (await 본문글(응답)).trim(), '');
    await verify('토큰 없이 부른 POST /api/saveauctionitem 응답은 401 이고 본문이 비어 있다', 코드 && 본문, true);
  });
});

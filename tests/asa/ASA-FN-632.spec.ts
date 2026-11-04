import { defineCase, test, verify } from '@platform/kit';

import { 오류코드, 토큰없이부르기 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-632',
  name: '토큰 없이 GET /shop/items 요청을 보내면 401 「UNAUTHORIZED」로 막힌다',
  apiDoc: 2,
  techniques: ['동등 분할'],
  precondition: ['토큰이 없다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('토큰 없이 GET /shop/items 요청을 보낸다', async () => {
    const 응답 = await 토큰없이부르기(request, 'GET', '/shop/items');
    const 코드 = await verify('GET /shop/items 응답 코드가 401 이다', 응답.status(), 401);
    const 오류 = await verify('GET /shop/items 오류 코드가 「UNAUTHORIZED」다', await 오류코드(응답), 'UNAUTHORIZED');
    await verify('토큰 없이 GET /shop/items 요청을 보내면 401 「UNAUTHORIZED」로 막힌다', 코드 && 오류, true);
  });

  await test.step('토큰 없이 POST /gm/alignment 요청을 보낸다', async () => {
    const 응답 = await 토큰없이부르기(request, 'POST', '/gm/alignment');
    const 코드 = await verify('POST /gm/alignment 응답 코드가 401 이다', 응답.status(), 401);
    const 오류 = await verify('POST /gm/alignment 오류 코드가 「UNAUTHORIZED」다', await 오류코드(응답), 'UNAUTHORIZED');
    await verify('토큰 없이 POST /gm/alignment 요청을 보내면 401 「UNAUTHORIZED」로 막힌다', 코드 && 오류, true);
  });

  await test.step('토큰 없이 POST /gm/bot/reset 요청을 보낸다', async () => {
    const 응답 = await 토큰없이부르기(request, 'POST', '/gm/bot/reset');
    const 코드 = await verify('POST /gm/bot/reset 응답 코드가 401 이다', 응답.status(), 401);
    const 오류 = await verify('POST /gm/bot/reset 오류 코드가 「UNAUTHORIZED」다', await 오류코드(응답), 'UNAUTHORIZED');
    await verify('토큰 없이 POST /gm/bot/reset 요청을 보내면 401 「UNAUTHORIZED」로 막힌다', 코드 && 오류, true);
  });

  await test.step('토큰 없이 POST /gm/drop-rate 요청을 보낸다', async () => {
    const 응답 = await 토큰없이부르기(request, 'POST', '/gm/drop-rate');
    const 코드 = await verify('POST /gm/drop-rate 응답 코드가 401 이다', 응답.status(), 401);
    const 오류 = await verify('POST /gm/drop-rate 오류 코드가 「UNAUTHORIZED」다', await 오류코드(응답), 'UNAUTHORIZED');
    await verify('토큰 없이 POST /gm/drop-rate 요청을 보내면 401 「UNAUTHORIZED」로 막힌다', 코드 && 오류, true);
  });

  await test.step('토큰 없이 GET /world/spawns 요청을 보낸다', async () => {
    const 응답 = await 토큰없이부르기(request, 'GET', '/world/spawns');
    const 코드 = await verify('GET /world/spawns 응답 코드가 401 이다', 응답.status(), 401);
    const 오류 = await verify('GET /world/spawns 오류 코드가 「UNAUTHORIZED」다', await 오류코드(응답), 'UNAUTHORIZED');
    await verify('토큰 없이 GET /world/spawns 요청을 보내면 401 「UNAUTHORIZED」로 막힌다', 코드 && 오류, true);
  });

  await test.step('토큰 없이 GET /characters/1 요청을 보낸다', async () => {
    const 응답 = await 토큰없이부르기(request, 'GET', '/characters/1');
    const 코드 = await verify('GET /characters/1 응답 코드가 401 이다', 응답.status(), 401);
    const 오류 = await verify('GET /characters/1 오류 코드가 「UNAUTHORIZED」다', await 오류코드(응답), 'UNAUTHORIZED');
    await verify('토큰 없이 GET /characters/1 요청을 보내면 401 「UNAUTHORIZED」로 막힌다', 코드 && 오류, true);
  });

  await test.step('토큰 없이 DELETE /characters/1 요청을 보낸다', async () => {
    const 응답 = await 토큰없이부르기(request, 'DELETE', '/characters/1');
    const 코드 = await verify('DELETE /characters/1 응답 코드가 401 이다', 응답.status(), 401);
    const 오류 = await verify('DELETE /characters/1 오류 코드가 「UNAUTHORIZED」다', await 오류코드(응답), 'UNAUTHORIZED');
    await verify('토큰 없이 DELETE /characters/1 요청을 보내면 401 「UNAUTHORIZED」로 막힌다', 코드 && 오류, true);
  });

  await test.step('토큰 없이 POST /combat/bot-kill 요청을 보낸다', async () => {
    const 응답 = await 토큰없이부르기(request, 'POST', '/combat/bot-kill');
    const 코드 = await verify('POST /combat/bot-kill 응답 코드가 401 이다', 응답.status(), 401);
    const 오류 = await verify('POST /combat/bot-kill 오류 코드가 「UNAUTHORIZED」다', await 오류코드(응답), 'UNAUTHORIZED');
    await verify('토큰 없이 POST /combat/bot-kill 요청을 보내면 401 「UNAUTHORIZED」로 막힌다', 코드 && 오류, true);
  });

  await test.step('토큰 없이 GET /currency/ledger 요청을 보낸다', async () => {
    const 응답 = await 토큰없이부르기(request, 'GET', '/currency/ledger');
    const 코드 = await verify('GET /currency/ledger 응답 코드가 401 이다', 응답.status(), 401);
    const 오류 = await verify('GET /currency/ledger 오류 코드가 「UNAUTHORIZED」다', await 오류코드(응답), 'UNAUTHORIZED');
    await verify('토큰 없이 GET /currency/ledger 요청을 보내면 401 「UNAUTHORIZED」로 막힌다', 코드 && 오류, true);
  });

  await test.step('토큰 없이 POST /gm/enhance-rate 요청을 보낸다', async () => {
    const 응답 = await 토큰없이부르기(request, 'POST', '/gm/enhance-rate');
    const 코드 = await verify('POST /gm/enhance-rate 응답 코드가 401 이다', 응답.status(), 401);
    const 오류 = await verify('POST /gm/enhance-rate 오류 코드가 「UNAUTHORIZED」다', await 오류코드(응답), 'UNAUTHORIZED');
    await verify('토큰 없이 POST /gm/enhance-rate 요청을 보내면 401 「UNAUTHORIZED」로 막힌다', 코드 && 오류, true);
  });
});

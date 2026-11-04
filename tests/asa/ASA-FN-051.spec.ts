import { defineCase, test, verify } from '@platform/kit';

import { 오류코드, 토큰없이부르기 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-051',
  name: '토큰 없이 GET /bots 요청을 보내면 401 「UNAUTHORIZED」로 막힌다',
  apiDoc: 2,
  techniques: ['동등 분할'],
  precondition: ['토큰이 없다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('토큰 없이 GET /bots 요청을 보낸다', async () => {
    const 응답 = await 토큰없이부르기(request, 'GET', '/bots');
    const 코드 = await verify('GET /bots 응답 코드가 401 이다', 응답.status(), 401);
    const 오류 = await verify('GET /bots 오류 코드가 「UNAUTHORIZED」다', await 오류코드(응답), 'UNAUTHORIZED');
    await verify('토큰 없이 GET /bots 요청을 보내면 401 「UNAUTHORIZED」로 막힌다', 코드 && 오류, true);
  });

  await test.step('토큰 없이 POST /enhance 요청을 보낸다', async () => {
    const 응답 = await 토큰없이부르기(request, 'POST', '/enhance');
    const 코드 = await verify('POST /enhance 응답 코드가 401 이다', 응답.status(), 401);
    const 오류 = await verify('POST /enhance 오류 코드가 「UNAUTHORIZED」다', await 오류코드(응답), 'UNAUTHORIZED');
    await verify('토큰 없이 POST /enhance 요청을 보내면 401 「UNAUTHORIZED」로 막힌다', 코드 && 오류, true);
  });

  await test.step('토큰 없이 POST /gm/gold 요청을 보낸다', async () => {
    const 응답 = await 토큰없이부르기(request, 'POST', '/gm/gold');
    const 코드 = await verify('POST /gm/gold 응답 코드가 401 이다', 응답.status(), 401);
    const 오류 = await verify('POST /gm/gold 오류 코드가 「UNAUTHORIZED」다', await 오류코드(응답), 'UNAUTHORIZED');
    await verify('토큰 없이 POST /gm/gold 요청을 보내면 401 「UNAUTHORIZED」로 막힌다', 코드 && 오류, true);
  });

  await test.step('토큰 없이 POST /gm/item 요청을 보낸다', async () => {
    const 응답 = await 토큰없이부르기(request, 'POST', '/gm/item');
    const 코드 = await verify('POST /gm/item 응답 코드가 401 이다', 응답.status(), 401);
    const 오류 = await verify('POST /gm/item 오류 코드가 「UNAUTHORIZED」다', await 오류코드(응답), 'UNAUTHORIZED');
    await verify('토큰 없이 POST /gm/item 요청을 보내면 401 「UNAUTHORIZED」로 막힌다', 코드 && 오류, true);
  });

  await test.step('토큰 없이 POST /gm/level 요청을 보낸다', async () => {
    const 응답 = await 토큰없이부르기(request, 'POST', '/gm/level');
    const 코드 = await verify('POST /gm/level 응답 코드가 401 이다', 응답.status(), 401);
    const 오류 = await verify('POST /gm/level 오류 코드가 「UNAUTHORIZED」다', await 오류코드(응답), 'UNAUTHORIZED');
    await verify('토큰 없이 POST /gm/level 요청을 보내면 401 「UNAUTHORIZED」로 막힌다', 코드 && 오류, true);
  });

  await test.step('토큰 없이 POST /shop/buy 요청을 보낸다', async () => {
    const 응답 = await 토큰없이부르기(request, 'POST', '/shop/buy');
    const 코드 = await verify('POST /shop/buy 응답 코드가 401 이다', 응답.status(), 401);
    const 오류 = await verify('POST /shop/buy 오류 코드가 「UNAUTHORIZED」다', await 오류코드(응답), 'UNAUTHORIZED');
    await verify('토큰 없이 POST /shop/buy 요청을 보내면 401 「UNAUTHORIZED」로 막힌다', 코드 && 오류, true);
  });

  await test.step('토큰 없이 GET /gm/config 요청을 보낸다', async () => {
    const 응답 = await 토큰없이부르기(request, 'GET', '/gm/config');
    const 코드 = await verify('GET /gm/config 응답 코드가 401 이다', 응답.status(), 401);
    const 오류 = await verify('GET /gm/config 오류 코드가 「UNAUTHORIZED」다', await 오류코드(응답), 'UNAUTHORIZED');
    await verify('토큰 없이 GET /gm/config 요청을 보내면 401 「UNAUTHORIZED」로 막힌다', 코드 && 오류, true);
  });

  await test.step('토큰 없이 POST /shop/sell 요청을 보낸다', async () => {
    const 응답 = await 토큰없이부르기(request, 'POST', '/shop/sell');
    const 코드 = await verify('POST /shop/sell 응답 코드가 401 이다', 응답.status(), 401);
    const 오류 = await verify('POST /shop/sell 오류 코드가 「UNAUTHORIZED」다', await 오류코드(응답), 'UNAUTHORIZED');
    await verify('토큰 없이 POST /shop/sell 요청을 보내면 401 「UNAUTHORIZED」로 막힌다', 코드 && 오류, true);
  });

  await test.step('토큰 없이 GET /characters 요청을 보낸다', async () => {
    const 응답 = await 토큰없이부르기(request, 'GET', '/characters');
    const 코드 = await verify('GET /characters 응답 코드가 401 이다', 응답.status(), 401);
    const 오류 = await verify('GET /characters 오류 코드가 「UNAUTHORIZED」다', await 오류코드(응답), 'UNAUTHORIZED');
    await verify('토큰 없이 GET /characters 요청을 보내면 401 「UNAUTHORIZED」로 막힌다', 코드 && 오류, true);
  });

  await test.step('토큰 없이 POST /characters 요청을 보낸다', async () => {
    const 응답 = await 토큰없이부르기(request, 'POST', '/characters');
    const 코드 = await verify('POST /characters 응답 코드가 401 이다', 응답.status(), 401);
    const 오류 = await verify('POST /characters 오류 코드가 「UNAUTHORIZED」다', await 오류코드(응답), 'UNAUTHORIZED');
    await verify('토큰 없이 POST /characters 요청을 보내면 401 「UNAUTHORIZED」로 막힌다', 코드 && 오류, true);
  });
});

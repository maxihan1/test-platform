import { defineCase, test, verify } from '@platform/kit';

import { 오류코드, 틀린어드민키로부르기 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-069',
  name: '틀린 「X-Admin-Key」로 GET /admin/config 요청을 보내면 401 「UNAUTHORIZED」로 막힌다',
  apiDoc: 2,
  techniques: ['동등 분할'],
  precondition: ['「X-Admin-Key」가 틀렸다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('틀린 「X-Admin-Key」로 GET /admin/config 요청을 보낸다', async () => {
    const 응답 = await 틀린어드민키로부르기(request, 'GET', '/admin/config');
    const 코드 = await verify('GET /admin/config 응답 코드가 401 이다', 응답.status(), 401);
    const 오류 = await verify('GET /admin/config 오류 코드가 「UNAUTHORIZED」다', await 오류코드(응답), 'UNAUTHORIZED');
    await verify('틀린 「X-Admin-Key」로 GET /admin/config 요청을 보내면 401 「UNAUTHORIZED」로 막힌다', 코드 && 오류, true);
  });

  await test.step('틀린 「X-Admin-Key」로 GET /admin/forced 요청을 보낸다', async () => {
    const 응답 = await 틀린어드민키로부르기(request, 'GET', '/admin/forced');
    const 코드 = await verify('GET /admin/forced 응답 코드가 401 이다', 응답.status(), 401);
    const 오류 = await verify('GET /admin/forced 오류 코드가 「UNAUTHORIZED」다', await 오류코드(응답), 'UNAUTHORIZED');
    await verify('틀린 「X-Admin-Key」로 GET /admin/forced 요청을 보내면 401 「UNAUTHORIZED」로 막힌다', 코드 && 오류, true);
  });

  await test.step('틀린 「X-Admin-Key」로 POST /admin/forced 요청을 보낸다', async () => {
    const 응답 = await 틀린어드민키로부르기(request, 'POST', '/admin/forced');
    const 코드 = await verify('POST /admin/forced 응답 코드가 401 이다', 응답.status(), 401);
    const 오류 = await verify('POST /admin/forced 오류 코드가 「UNAUTHORIZED」다', await 오류코드(응답), 'UNAUTHORIZED');
    await verify('틀린 「X-Admin-Key」로 POST /admin/forced 요청을 보내면 401 「UNAUTHORIZED」로 막힌다', 코드 && 오류, true);
  });

  await test.step('틀린 「X-Admin-Key」로 DELETE /admin/forced 요청을 보낸다', async () => {
    const 응답 = await 틀린어드민키로부르기(request, 'DELETE', '/admin/forced');
    const 코드 = await verify('DELETE /admin/forced 응답 코드가 401 이다', 응답.status(), 401);
    const 오류 = await verify('DELETE /admin/forced 오류 코드가 「UNAUTHORIZED」다', await 오류코드(응답), 'UNAUTHORIZED');
    await verify('틀린 「X-Admin-Key」로 DELETE /admin/forced 요청을 보내면 401 「UNAUTHORIZED」로 막힌다', 코드 && 오류, true);
  });

  await test.step('틀린 「X-Admin-Key」로 GET /admin/spawns 요청을 보낸다', async () => {
    const 응답 = await 틀린어드민키로부르기(request, 'GET', '/admin/spawns');
    const 코드 = await verify('GET /admin/spawns 응답 코드가 401 이다', 응답.status(), 401);
    const 오류 = await verify('GET /admin/spawns 오류 코드가 「UNAUTHORIZED」다', await 오류코드(응답), 'UNAUTHORIZED');
    await verify('틀린 「X-Admin-Key」로 GET /admin/spawns 요청을 보내면 401 「UNAUTHORIZED」로 막힌다', 코드 && 오류, true);
  });

  await test.step('틀린 「X-Admin-Key」로 POST /admin/cleanup 요청을 보낸다', async () => {
    const 응답 = await 틀린어드민키로부르기(request, 'POST', '/admin/cleanup');
    const 코드 = await verify('POST /admin/cleanup 응답 코드가 401 이다', 응답.status(), 401);
    const 오류 = await verify('POST /admin/cleanup 오류 코드가 「UNAUTHORIZED」다', await 오류코드(응답), 'UNAUTHORIZED');
    await verify('틀린 「X-Admin-Key」로 POST /admin/cleanup 요청을 보내면 401 「UNAUTHORIZED」로 막힌다', 코드 && 오류, true);
  });

  await test.step('틀린 「X-Admin-Key」로 GET /admin/accounts 요청을 보낸다', async () => {
    const 응답 = await 틀린어드민키로부르기(request, 'GET', '/admin/accounts');
    const 코드 = await verify('GET /admin/accounts 응답 코드가 401 이다', 응답.status(), 401);
    const 오류 = await verify('GET /admin/accounts 오류 코드가 「UNAUTHORIZED」다', await 오류코드(응답), 'UNAUTHORIZED');
    await verify('틀린 「X-Admin-Key」로 GET /admin/accounts 요청을 보내면 401 「UNAUTHORIZED」로 막힌다', 코드 && 오류, true);
  });

  await test.step('틀린 「X-Admin-Key」로 GET /admin/characters 요청을 보낸다', async () => {
    const 응답 = await 틀린어드민키로부르기(request, 'GET', '/admin/characters');
    const 코드 = await verify('GET /admin/characters 응답 코드가 401 이다', 응답.status(), 401);
    const 오류 = await verify('GET /admin/characters 오류 코드가 「UNAUTHORIZED」다', await 오류코드(응답), 'UNAUTHORIZED');
    await verify('틀린 「X-Admin-Key」로 GET /admin/characters 요청을 보내면 401 「UNAUTHORIZED」로 막힌다', 코드 && 오류, true);
  });

  await test.step('틀린 「X-Admin-Key」로 GET /admin/pk-records 요청을 보낸다', async () => {
    const 응답 = await 틀린어드민키로부르기(request, 'GET', '/admin/pk-records');
    const 코드 = await verify('GET /admin/pk-records 응답 코드가 401 이다', 응답.status(), 401);
    const 오류 = await verify('GET /admin/pk-records 오류 코드가 「UNAUTHORIZED」다', await 오류코드(응답), 'UNAUTHORIZED');
    await verify('틀린 「X-Admin-Key」로 GET /admin/pk-records 요청을 보내면 401 「UNAUTHORIZED」로 막힌다', 코드 && 오류, true);
  });

  await test.step('틀린 「X-Admin-Key」로 PUT /admin/spawns/1 요청을 보낸다', async () => {
    const 응답 = await 틀린어드민키로부르기(request, 'PUT', '/admin/spawns/1');
    const 코드 = await verify('PUT /admin/spawns/1 응답 코드가 401 이다', 응답.status(), 401);
    const 오류 = await verify('PUT /admin/spawns/1 오류 코드가 「UNAUTHORIZED」다', await 오류코드(응답), 'UNAUTHORIZED');
    await verify('틀린 「X-Admin-Key」로 PUT /admin/spawns/1 요청을 보내면 401 「UNAUTHORIZED」로 막힌다', 코드 && 오류, true);
  });
});

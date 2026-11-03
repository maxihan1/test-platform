import { defineCase, test, verify } from '@platform/kit';

import { 오류코드, 틀린어드민키로부르기 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-635',
  name: '틀린 「X-Admin-Key」로 DELETE /admin/spawns/1 요청을 보내면 401 「UNAUTHORIZED」로 막힌다',
  apiDoc: 1,
  techniques: ['동등 분할'],
  precondition: ['「X-Admin-Key」가 틀렸다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('틀린 「X-Admin-Key」로 DELETE /admin/spawns/1 요청을 보낸다', async () => {
    const 응답 = await 틀린어드민키로부르기(request, 'DELETE', '/admin/spawns/1');
    const 코드 = await verify('DELETE /admin/spawns/1 응답 코드가 401 이다', 응답.status(), 401);
    const 오류 = await verify('DELETE /admin/spawns/1 오류 코드가 「UNAUTHORIZED」다', await 오류코드(응답), 'UNAUTHORIZED');
    await verify('틀린 「X-Admin-Key」로 DELETE /admin/spawns/1 요청을 보내면 401 「UNAUTHORIZED」로 막힌다', 코드 && 오류, true);
  });

  await test.step('틀린 「X-Admin-Key」로 POST /admin/world/reset 요청을 보낸다', async () => {
    const 응답 = await 틀린어드민키로부르기(request, 'POST', '/admin/world/reset');
    const 코드 = await verify('POST /admin/world/reset 응답 코드가 401 이다', 응답.status(), 401);
    const 오류 = await verify('POST /admin/world/reset 오류 코드가 「UNAUTHORIZED」다', await 오류코드(응답), 'UNAUTHORIZED');
    await verify('틀린 「X-Admin-Key」로 POST /admin/world/reset 요청을 보내면 401 「UNAUTHORIZED」로 막힌다', 코드 && 오류, true);
  });

  await test.step('틀린 「X-Admin-Key」로 POST /admin/spawns/reset 요청을 보낸다', async () => {
    const 응답 = await 틀린어드민키로부르기(request, 'POST', '/admin/spawns/reset');
    const 코드 = await verify('POST /admin/spawns/reset 응답 코드가 401 이다', 응답.status(), 401);
    const 오류 = await verify('POST /admin/spawns/reset 오류 코드가 「UNAUTHORIZED」다', await 오류코드(응답), 'UNAUTHORIZED');
    await verify('틀린 「X-Admin-Key」로 POST /admin/spawns/reset 요청을 보내면 401 「UNAUTHORIZED」로 막힌다', 코드 && 오류, true);
  });

  await test.step('틀린 「X-Admin-Key」로 GET /admin/item-templates 요청을 보낸다', async () => {
    const 응답 = await 틀린어드민키로부르기(request, 'GET', '/admin/item-templates');
    const 코드 = await verify('GET /admin/item-templates 응답 코드가 401 이다', 응답.status(), 401);
    const 오류 = await verify('GET /admin/item-templates 오류 코드가 「UNAUTHORIZED」다', await 오류코드(응답), 'UNAUTHORIZED');
    await verify('틀린 「X-Admin-Key」로 GET /admin/item-templates 요청을 보내면 401 「UNAUTHORIZED」로 막힌다', 코드 && 오류, true);
  });

  await test.step('틀린 「X-Admin-Key」로 GET /admin/characters/1 요청을 보낸다', async () => {
    const 응답 = await 틀린어드민키로부르기(request, 'GET', '/admin/characters/1');
    const 코드 = await verify('GET /admin/characters/1 응답 코드가 401 이다', 응답.status(), 401);
    const 오류 = await verify('GET /admin/characters/1 오류 코드가 「UNAUTHORIZED」다', await 오류코드(응답), 'UNAUTHORIZED');
    await verify('틀린 「X-Admin-Key」로 GET /admin/characters/1 요청을 보내면 401 「UNAUTHORIZED」로 막힌다', 코드 && 오류, true);
  });

  await test.step('틀린 「X-Admin-Key」로 PATCH /admin/characters/1 요청을 보낸다', async () => {
    const 응답 = await 틀린어드민키로부르기(request, 'PATCH', '/admin/characters/1');
    const 코드 = await verify('PATCH /admin/characters/1 응답 코드가 401 이다', 응답.status(), 401);
    const 오류 = await verify('PATCH /admin/characters/1 오류 코드가 「UNAUTHORIZED」다', await 오류코드(응답), 'UNAUTHORIZED');
    await verify('틀린 「X-Admin-Key」로 PATCH /admin/characters/1 요청을 보내면 401 「UNAUTHORIZED」로 막힌다', 코드 && 오류, true);
  });

  await test.step('틀린 「X-Admin-Key」로 PUT /admin/config/drop-rates 요청을 보낸다', async () => {
    const 응답 = await 틀린어드민키로부르기(request, 'PUT', '/admin/config/drop-rates');
    const 코드 = await verify('PUT /admin/config/drop-rates 응답 코드가 401 이다', 응답.status(), 401);
    const 오류 = await verify('PUT /admin/config/drop-rates 오류 코드가 「UNAUTHORIZED」다', await 오류코드(응답), 'UNAUTHORIZED');
    await verify('틀린 「X-Admin-Key」로 PUT /admin/config/drop-rates 요청을 보내면 401 「UNAUTHORIZED」로 막힌다', 코드 && 오류, true);
  });

  await test.step('틀린 「X-Admin-Key」로 PUT /admin/config/enhance-rates 요청을 보낸다', async () => {
    const 응답 = await 틀린어드민키로부르기(request, 'PUT', '/admin/config/enhance-rates');
    const 코드 = await verify('PUT /admin/config/enhance-rates 응답 코드가 401 이다', 응답.status(), 401);
    const 오류 = await verify('PUT /admin/config/enhance-rates 오류 코드가 「UNAUTHORIZED」다', await 오류코드(응답), 'UNAUTHORIZED');
    await verify('틀린 「X-Admin-Key」로 PUT /admin/config/enhance-rates 요청을 보내면 401 「UNAUTHORIZED」로 막힌다', 코드 && 오류, true);
  });

  await test.step('틀린 「X-Admin-Key」로 POST /admin/characters/1/items 요청을 보낸다', async () => {
    const 응답 = await 틀린어드민키로부르기(request, 'POST', '/admin/characters/1/items');
    const 코드 = await verify('POST /admin/characters/1/items 응답 코드가 401 이다', 응답.status(), 401);
    const 오류 = await verify('POST /admin/characters/1/items 오류 코드가 「UNAUTHORIZED」다', await 오류코드(응답), 'UNAUTHORIZED');
    await verify('틀린 「X-Admin-Key」로 POST /admin/characters/1/items 요청을 보내면 401 「UNAUTHORIZED」로 막힌다', 코드 && 오류, true);
  });

  await test.step('틀린 「X-Admin-Key」로 POST /admin/characters/1/reset 요청을 보낸다', async () => {
    const 응답 = await 틀린어드민키로부르기(request, 'POST', '/admin/characters/1/reset');
    const 코드 = await verify('POST /admin/characters/1/reset 응답 코드가 401 이다', 응답.status(), 401);
    const 오류 = await verify('POST /admin/characters/1/reset 오류 코드가 「UNAUTHORIZED」다', await 오류코드(응답), 'UNAUTHORIZED');
    await verify('틀린 「X-Admin-Key」로 POST /admin/characters/1/reset 요청을 보내면 401 「UNAUTHORIZED」로 막힌다', 코드 && 오류, true);
  });
});

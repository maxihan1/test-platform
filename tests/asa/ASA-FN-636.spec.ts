import { defineCase, test, verify } from '@platform/kit';

import { 오류코드, 틀린어드민키로부르기 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-636',
  name: '틀린 「X-Admin-Key」로 GET /admin/characters/1/ledger 요청을 보내면 401 「UNAUTHORIZED」로 막힌다',
  apiDoc: 1,
  techniques: ['동등 분할'],
  precondition: ['「X-Admin-Key」가 틀렸다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('틀린 「X-Admin-Key」로 GET /admin/characters/1/ledger 요청을 보낸다', async () => {
    const 응답 = await 틀린어드민키로부르기(request, 'GET', '/admin/characters/1/ledger');
    const 코드 = await verify('GET /admin/characters/1/ledger 응답 코드가 401 이다', 응답.status(), 401);
    const 오류 = await verify('GET /admin/characters/1/ledger 오류 코드가 「UNAUTHORIZED」다', await 오류코드(응답), 'UNAUTHORIZED');
    await verify('틀린 「X-Admin-Key」로 GET /admin/characters/1/ledger 요청을 보내면 401 「UNAUTHORIZED」로 막힌다', 코드 && 오류, true);
  });

  await test.step('틀린 「X-Admin-Key」로 GET /admin/characters/1/summary 요청을 보낸다', async () => {
    const 응답 = await 틀린어드민키로부르기(request, 'GET', '/admin/characters/1/summary');
    const 코드 = await verify('GET /admin/characters/1/summary 응답 코드가 401 이다', 응답.status(), 401);
    const 오류 = await verify('GET /admin/characters/1/summary 오류 코드가 「UNAUTHORIZED」다', await 오류코드(응답), 'UNAUTHORIZED');
    await verify('틀린 「X-Admin-Key」로 GET /admin/characters/1/summary 요청을 보내면 401 「UNAUTHORIZED」로 막힌다', 코드 && 오류, true);
  });

  await test.step('틀린 「X-Admin-Key」로 GET /admin/characters/1/inventory 요청을 보낸다', async () => {
    const 응답 = await 틀린어드민키로부르기(request, 'GET', '/admin/characters/1/inventory');
    const 코드 = await verify('GET /admin/characters/1/inventory 응답 코드가 401 이다', 응답.status(), 401);
    const 오류 = await verify('GET /admin/characters/1/inventory 오류 코드가 「UNAUTHORIZED」다', await 오류코드(응답), 'UNAUTHORIZED');
    await verify('틀린 「X-Admin-Key」로 GET /admin/characters/1/inventory 요청을 보내면 401 「UNAUTHORIZED」로 막힌다', 코드 && 오류, true);
  });

  await test.step('틀린 「X-Admin-Key」로 DELETE /admin/characters/1/items/1 요청을 보낸다', async () => {
    const 응답 = await 틀린어드민키로부르기(request, 'DELETE', '/admin/characters/1/items/1');
    const 코드 = await verify('DELETE /admin/characters/1/items/1 응답 코드가 401 이다', 응답.status(), 401);
    const 오류 = await verify('DELETE /admin/characters/1/items/1 오류 코드가 「UNAUTHORIZED」다', await 오류코드(응답), 'UNAUTHORIZED');
    await verify('틀린 「X-Admin-Key」로 DELETE /admin/characters/1/items/1 요청을 보내면 401 「UNAUTHORIZED」로 막힌다', 코드 && 오류, true);
  });

  await test.step('틀린 「X-Admin-Key」로 GET /admin/characters/1/enhance-history 요청을 보낸다', async () => {
    const 응답 = await 틀린어드민키로부르기(request, 'GET', '/admin/characters/1/enhance-history');
    const 코드 = await verify('GET /admin/characters/1/enhance-history 응답 코드가 401 이다', 응답.status(), 401);
    const 오류 = await verify('GET /admin/characters/1/enhance-history 오류 코드가 「UNAUTHORIZED」다', await 오류코드(응답), 'UNAUTHORIZED');
    await verify('틀린 「X-Admin-Key」로 GET /admin/characters/1/enhance-history 요청을 보내면 401 「UNAUTHORIZED」로 막힌다', 코드 && 오류, true);
  });
});

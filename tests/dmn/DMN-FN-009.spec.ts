import { defineCase, test, verify } from '@platform/kit';

import { 응답글, 없는번호 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'DMN-FN-009',
  name: '토큰 없이 푸시 이력을 부르면 401 UNAUTHORIZED 다',
  apiDoc: 1,
  techniques: ['동등 분할'],
  precondition: ['요청에 토큰이 없다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('토큰 없이 푸시 이력을 부른다', async () => {
    const res = await request.get('/v1/pushes');
    await verify('토큰 없이 푸시 이력을 부르면 401 UNAUTHORIZED 다', await 응답글(res), '401 UNAUTHORIZED');
  });

  await test.step('토큰 없이 푸시를 보낸다', async () => {
    const res = await request.post('/v1/pushes', { data: { userId: 'dmn-no-token', title: '토큰 없음', body: '토큰 없이 보낸다' } });
    await verify('토큰 없이 푸시를 보내면 401 UNAUTHORIZED 다', await 응답글(res), '401 UNAUTHORIZED');
  });

  await test.step('토큰 없이 기기를 등록한다', async () => {
    const res = await request.post('/v1/devices', { data: { userId: 'dmn-no-token', platform: 'android', pushToken: 'tok-dmn-no-token' } });
    await verify('토큰 없이 기기를 등록하면 401 UNAUTHORIZED 다', await 응답글(res), '401 UNAUTHORIZED');
  });

  await test.step('토큰 없이 푸시 하나를 조회한다', async () => {
    const res = await request.get(`/v1/pushes/${없는번호('psh')}`);
    await verify('토큰 없이 푸시 하나를 조회하면 401 UNAUTHORIZED 다', await 응답글(res), '401 UNAUTHORIZED');
  });

  await test.step('토큰 없이 기기 하나를 조회한다', async () => {
    const res = await request.get(`/v1/devices/${없는번호('dev')}`);
    await verify('토큰 없이 기기 하나를 조회하면 401 UNAUTHORIZED 다', await 응답글(res), '401 UNAUTHORIZED');
  });

  await test.step('토큰 없이 기기를 지운다', async () => {
    const res = await request.delete(`/v1/devices/${없는번호('dev')}`);
    await verify('토큰 없이 기기를 지우면 401 UNAUTHORIZED 다', await 응답글(res), '401 UNAUTHORIZED');
  });
});

import { defineCase, test, verify } from '@platform/kit';

import { 기기값, 기기등록, 기기모두지우기, 새푸시토큰, 새회원아이디, 응답글 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'DMN-FN-030',
  name: '플랫폼을 android · ios 밖의 값으로 기기를 등록하면 400 VALIDATION 이다',
  apiDoc: 1,
  precondition: ['기기가 없는 새 회원 아이디다'],
  params: null,
  expected: null,
});

test(spec, async ({ api }) => {
  const 고객사 = api('데모마켓');
  const 회원 = 새회원아이디();
  const 지울기기: string[] = [];

  try {
    await test.step('플랫폼을 「windows」로 기기를 등록한다', async () => {
      const res = await 기기등록(고객사, 회원, 새푸시토큰(), 'windows');
      if (res.status() === 201) 지울기기.push((await 기기값(res)).id);
      await verify('플랫폼을 android · ios 밖의 값으로 기기를 등록하면 400 VALIDATION 이다', await 응답글(res), '400 VALIDATION');
    });

    await test.step('pushToken 없이 기기를 등록한다', async () => {
      const res = await 고객사.post('/v1/devices', { data: { userId: 회원, platform: 'android' } });
      if (res.status() === 201) 지울기기.push((await 기기값(res)).id);
      await verify('pushToken 없이 기기를 등록하면 400 VALIDATION 이다', await 응답글(res), '400 VALIDATION');
    });
  } finally {
    await 기기모두지우기(고객사, 지울기기);
  }
});

import { defineCase, test, verify } from '@platform/kit';

import { 기기값, 기기등록, 기기모두지우기, 새푸시토큰, 새회원아이디, 응답글 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'DMN-FN-036',
  name: '같은 pushToken 으로 기기를 다시 등록하면 409 DEVICE_EXISTS 다',
  apiDoc: 1,
  techniques: ['동등 분할'],
  precondition: ['기기가 하나 등록된 회원이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ api }) => {
  const 고객사 = api('데모마켓');
  const 회원 = 새회원아이디();
  const 토큰 = 새푸시토큰();
  const 지울기기: string[] = [];
  let 첫등록 = 0;

  try {
    await test.step('회원 기기를 하나 등록한다', async () => {
      const res = await 기기등록(고객사, 회원, 토큰);
      첫등록 = res.status();
      if (첫등록 === 201) 지울기기.push((await 기기값(res)).id);
    });

    await test.step('첫 기기 등록 응답을 확인한다', async () => {
      await verify('첫 기기 등록 응답이 201 이다', 첫등록, 201, { blocker: true });
    });

    await test.step('같은 pushToken 으로 기기를 다시 등록한다', async () => {
      const res = await 기기등록(고객사, 회원, 토큰, 'ios');
      if (res.status() === 201) 지울기기.push((await 기기값(res)).id);
      await verify('같은 pushToken 으로 기기를 다시 등록하면 409 DEVICE_EXISTS 다', await 응답글(res), '409 DEVICE_EXISTS');
    });
  } finally {
    await 기기모두지우기(고객사, 지울기기);
  }
});

import { defineCase, test, verify } from '@platform/kit';

import { 기기값, 기기등록, 기기모두지우기, 새푸시토큰, 새회원아이디, 여러번보내기, 응답글, 푸시보내기 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'DMN-FN-095',
  name: '같은 회원에게 1분 안에 5건째를 보내면 202 다',
  apiDoc: 1,
  techniques: ['경계값 분석'],
  precondition: ['기기가 하나 등록된 회원이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ api }) => {
  const 고객사 = api('데모마켓');
  const 회원 = 새회원아이디();
  const 지울기기: string[] = [];
  let 첫등록 = 0;

  try {
    await test.step('회원 기기를 하나 등록한다', async () => {
      const res = await 기기등록(고객사, 회원, 새푸시토큰());
      첫등록 = res.status();
      if (첫등록 === 201) 지울기기.push((await 기기값(res)).id);
    });

    await test.step('기기 등록 응답을 확인한다', async () => {
      await verify('기기 등록 응답이 201 이다', 첫등록, 201, { blocker: true });
    });

    await test.step('같은 회원에게 1분 안에 푸시를 5건 보낸다', async () => {
      const 코드들 = await 여러번보내기(고객사, 회원, 5);
      await verify('앞 4건이 모두 202 로 접수된다', 코드들.slice(0, 4).join(', '), '202, 202, 202, 202', { blocker: true });
      await verify('같은 회원에게 1분 안에 5건째를 보내면 202 다', 코드들[4], 202, { blocker: true });
    });

    await test.step('같은 회원에게 6건째 푸시를 보낸다', async () => {
      const res = await 푸시보내기(고객사, { userId: 회원, title: '보내기 제한 6', body: '보내기 제한 확인' });
      await verify('같은 회원에게 1분 안에 6건째를 보내면 429 RATE_LIMITED 다', await 응답글(res), '429 RATE_LIMITED');
    });

  } finally {
    await 기기모두지우기(고객사, 지울기기);
  }
});

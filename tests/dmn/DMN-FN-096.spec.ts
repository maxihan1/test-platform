import { defineCase, test, verify } from '@platform/kit';

import { 기기값, 기기등록, 기기모두지우기, 새푸시토큰, 새회원아이디, 여러번보내기, 응답글, 푸시보내기 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'DMN-FN-096',
  name: '보내기 제한에 걸린 회원에게 7건째를 보내도 429 RATE_LIMITED 다',
  apiDoc: 1,
  techniques: ['동등 분할'],
  precondition: ['기기가 하나 등록된 회원이 있다', '1분 안에 5건을 받아 보내기 제한에 걸린 회원이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ api }) => {
  const 고객사 = api('데모마켓');
  const 회원 = 새회원아이디();
  const 지울기기: string[] = [];
  let 첫등록 = 0;
  let 코드들: number[] = [];

  try {
    await test.step('회원 기기를 하나 등록한다', async () => {
      const res = await 기기등록(고객사, 회원, 새푸시토큰());
      첫등록 = res.status();
      if (첫등록 === 201) 지울기기.push((await 기기값(res)).id);
    });

    await test.step('기기 등록 응답을 확인한다', async () => {
      await verify('기기 등록 응답이 201 이다', 첫등록, 201, { blocker: true });
    });

    await test.step('그 회원에게 1분 안에 푸시를 6건 보낸다', async () => {
      코드들 = await 여러번보내기(고객사, 회원, 6);
    });

    await test.step('보내기 제한에 걸렸는지 확인한다', async () => {
      await verify('앞 5건이 모두 202 로 접수된다', 코드들.slice(0, 5).join(', '), '202, 202, 202, 202, 202', { blocker: true });
      await verify('6건째가 429 로 막힌다', 코드들[5], 429, { blocker: true });
    });

    await test.step('제한에 걸린 회원에게 7건째 푸시를 보낸다', async () => {
      const res = await 푸시보내기(고객사, { userId: 회원, title: '보내기 제한 7', body: '보내기 제한 확인' });
      await verify('보내기 제한에 걸린 회원에게 7건째를 보내도 429 RATE_LIMITED 다', await 응답글(res), '429 RATE_LIMITED');
    });

  } finally {
    await 기기모두지우기(고객사, 지울기기);
  }
});

import { defineCase, test, verify } from '@platform/kit';

import { 기기값, 기기등록, 기기모두지우기, 새푸시토큰, 새회원아이디, 시간대없는시각, 응답글, 푸시보내기 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'DMN-FN-081',
  name: '시간대가 없는 시각으로 예약하면 400 VALIDATION 이다',
  apiDoc: 1,
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

    await test.step('시간대가 없는 시각으로 예약해 푸시를 보낸다', async () => {
      const res = await 푸시보내기(고객사, { userId: 회원, title: '시간대 없음', body: '시간대 없는 시각으로 예약', scheduledAt: 시간대없는시각(10) });
      await verify('시간대가 없는 시각으로 예약하면 400 VALIDATION 이다', await 응답글(res), '400 VALIDATION');
    });

  } finally {
    await 기기모두지우기(고객사, 지울기기);
  }
});

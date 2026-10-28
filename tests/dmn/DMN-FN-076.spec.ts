import { defineCase, test, verify } from '@platform/kit';

import { 기기값, 기기등록, 기기모두지우기, 분뒤, 새푸시토큰, 새회원아이디, 푸시값, 푸시보내기, 푸시조회 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'DMN-FN-076',
  name: '지금부터 10분 뒤로 예약한 푸시를 예약 시각 전에 조회하면 상태가 SCHEDULED 다',
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

    await test.step('지금부터 10분 뒤로 예약해 푸시를 보내고 그 푸시를 조회한다', async () => {
      const res = await 푸시보내기(고객사, { userId: 회원, title: '예약 10분', body: '10분 뒤 예약', scheduledAt: 분뒤(10) });
      await verify('예약 푸시 접수 응답이 202 다', res.status(), 202, { blocker: true });
      const 조회 = await 푸시값(await 푸시조회(고객사, (await 푸시값(res)).id));
      await verify('지금부터 10분 뒤로 예약한 푸시를 예약 시각 전에 조회하면 상태가 SCHEDULED 다', 조회.status, 'SCHEDULED');
    });

  } finally {
    await 기기모두지우기(고객사, 지울기기);
  }
});

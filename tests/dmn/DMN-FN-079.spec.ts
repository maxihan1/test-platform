import { defineCase, test, verify } from '@platform/kit';

import { 기기값, 기기등록, 기기모두지우기, 새푸시토큰, 새회원아이디, 서울시각, 푸시값, 푸시보내기 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'DMN-FN-079',
  name: '시간대 「+09:00」이 붙은 시각으로 예약하면 응답의 scheduledAt 이 같은 때를 가리킨다',
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

    await test.step('시간대 「+09:00」이 붙은 시각으로 예약해 푸시를 보낸다', async () => {
      const 시각 = 서울시각(10);
      const res = await 푸시보내기(고객사, { userId: 회원, title: '서울 시각 예약', body: '+09:00 시각으로 예약', scheduledAt: 시각 });
      await verify('예약 푸시 접수 응답이 202 다', res.status(), 202, { blocker: true });
      const 받은시각 = (await 푸시값(res)).scheduledAt ?? '';
      await verify('시간대 「+09:00」이 붙은 시각으로 예약하면 응답의 scheduledAt 이 같은 때를 가리킨다', Date.parse(받은시각), Date.parse(시각));
    });

  } finally {
    await 기기모두지우기(고객사, 지울기기);
  }
});

import { defineCase, test, verify } from '@platform/kit';

import { 기기값, 기기등록, 기기모두지우기, 발송끝기다리기, 새푸시토큰, 새회원아이디, 푸시값, 푸시보내기 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'DMN-FN-058',
  name: 'pushToken 이 모두 「invalid-」로 시작하는 회원에게 푸시를 보내면 FAILED INVALID_TOKEN 으로 끝난다',
  apiDoc: 1,
  precondition: ['pushToken 이 「invalid-」로 시작하는 기기만 등록된 회원이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ api }) => {
  const 고객사 = api('데모마켓');
  const 회원 = 새회원아이디();
  const 지울기기: string[] = [];
  let 첫등록 = 0;

  try {
    await test.step('pushToken 이 「invalid-」로 시작하는 기기를 등록한다', async () => {
      const res = await 기기등록(고객사, 회원, 새푸시토큰('invalid-'));
      첫등록 = res.status();
      if (첫등록 === 201) 지울기기.push((await 기기값(res)).id);
    });

    await test.step('기기 등록 응답을 확인한다', async () => {
      await verify('기기 등록 응답이 201 이다', 첫등록, 201, { blocker: true });
    });

    await test.step('그 회원에게 푸시를 보내고 발송이 끝날 때까지 기다린다', async () => {
      const res = await 푸시보내기(고객사, { userId: 회원, title: '틀린 토큰', body: '틀린 토큰 기기로 보낸다' });
      await verify('푸시 접수 응답이 202 다', res.status(), 202, { blocker: true });
      const 끝 = await 발송끝기다리기(고객사, (await 푸시값(res)).id);
      await verify(
        'pushToken 이 모두 「invalid-」로 시작하는 회원에게 푸시를 보내면 FAILED INVALID_TOKEN 으로 끝난다',
        `${끝?.status ?? ''} ${끝?.failReason ?? ''}`,
        'FAILED INVALID_TOKEN',
      );
    });
  } finally {
    await 기기모두지우기(고객사, 지울기기);
  }
});

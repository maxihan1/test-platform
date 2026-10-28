import { defineCase, test, verify } from '@platform/kit';

import { 기기값, 기기등록, 기기모두지우기, 발송끝기다리기, 새푸시토큰, 새회원아이디, 푸시값, 푸시보내기 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'DMN-FN-052',
  name: '푸시를 보내고 10초 안에 상태를 조회하면 SENT 나 FAILED 로 바뀌어 있다',
  apiDoc: 1,
  smoke: true,
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

    await test.step('푸시를 보내고 10초 동안 상태를 다시 조회한다', async () => {
      const res = await 푸시보내기(고객사, { userId: 회원, title: '발송 결과', body: '발송 결과를 기다린다' });
      await verify('푸시 접수 응답이 202 다', res.status(), 202, { blocker: true });
      const 끝 = await 발송끝기다리기(고객사, (await 푸시값(res)).id);
      await verify('푸시를 보내고 10초 안에 상태를 조회하면 SENT 나 FAILED 로 바뀌어 있다', ['SENT', 'FAILED'].includes(끝?.status ?? ''), true);
    });
  } finally {
    await 기기모두지우기(고객사, 지울기기);
  }
});

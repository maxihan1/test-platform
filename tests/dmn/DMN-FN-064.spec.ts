import { defineCase, test, verify } from '@platform/kit';

import { 기기값, 기기등록, 기기모두지우기, 발송끝기다리기, 새푸시토큰, 새회원아이디, 푸시값, 푸시보내기 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'DMN-FN-064',
  name: '기기 가운데 하나라도 정상인 회원에게 푸시를 보내면 SENT 로 끝난다',
  apiDoc: 1,
  precondition: ['「invalid-」 기기 하나와 정상 기기 하나가 등록된 회원이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ api }) => {
  const 고객사 = api('데모마켓');
  const 회원 = 새회원아이디();
  const 지울기기: string[] = [];
  const 등록코드: number[] = [];

  try {
    await test.step('「invalid-」 기기 하나와 정상 기기 하나를 등록한다', async () => {
      for (const 앞 of ['invalid-', 'tok-']) {
        const res = await 기기등록(고객사, 회원, 새푸시토큰(앞));
        등록코드.push(res.status());
        if (res.status() === 201) 지울기기.push((await 기기값(res)).id);
      }
    });

    await test.step('기기 둘의 등록 응답을 확인한다', async () => {
      await verify('기기 등록 응답 둘이 모두 201 이다', 등록코드.join(', '), '201, 201', { blocker: true });
    });

    await test.step('그 회원에게 푸시를 보내고 발송이 끝날 때까지 기다린다', async () => {
      const res = await 푸시보내기(고객사, { userId: 회원, title: '하나라도 정상', body: '정상 기기가 하나 있다' });
      await verify('푸시 접수 응답이 202 다', res.status(), 202, { blocker: true });
      const 끝 = await 발송끝기다리기(고객사, (await 푸시값(res)).id);
      await verify('기기 가운데 하나라도 정상인 회원에게 푸시를 보내면 SENT 로 끝난다', 끝?.status, 'SENT');
    });
  } finally {
    await 기기모두지우기(고객사, 지울기기);
  }
});

import { defineCase, test, verify } from '@platform/kit';

import { 기기값, 기기등록, 기기모두지우기, 새푸시토큰, 새회원아이디, 여러번보내기, 푸시보내기 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'DMN-FN-100',
  name: '한 회원이 보내기 제한에 걸려도 다른 회원에게 보내면 202 다',
  apiDoc: 1,
  precondition: ['1분 안에 5건을 받아 보내기 제한에 걸린 회원이 있다', '기기가 하나 등록된 다른 회원이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ api }) => {
  const 고객사 = api('데모마켓');
  const 막힌회원 = 새회원아이디();
  const 다른회원 = 새회원아이디();
  const 지울기기: string[] = [];
  const 등록코드: number[] = [];
  let 코드들: number[] = [];

  try {
    await test.step('두 회원의 기기를 하나씩 등록한다', async () => {
      for (const 회원 of [막힌회원, 다른회원]) {
        const res = await 기기등록(고객사, 회원, 새푸시토큰());
        등록코드.push(res.status());
        if (res.status() === 201) 지울기기.push((await 기기값(res)).id);
      }
    });

    await test.step('기기 둘의 등록 응답을 확인한다', async () => {
      await verify('기기 등록 응답 둘이 모두 201 이다', 등록코드.join(', '), '201, 201', { blocker: true });
    });

    await test.step('한 회원에게 1분 안에 푸시를 6건 보낸다', async () => {
      코드들 = await 여러번보내기(고객사, 막힌회원, 6);
    });

    await test.step('보내기 제한에 걸렸는지 확인한다', async () => {
      await verify('앞 5건이 모두 202 로 접수된다', 코드들.slice(0, 5).join(', '), '202, 202, 202, 202, 202', { blocker: true });
      await verify('6건째가 429 로 막힌다', 코드들[5], 429, { blocker: true });
    });

    await test.step('다른 회원에게 푸시를 보낸다', async () => {
      const res = await 푸시보내기(고객사, { userId: 다른회원, title: '다른 회원', body: '보내기 제한은 회원마다 센다' });
      await verify('한 회원이 보내기 제한에 걸려도 다른 회원에게 보내면 202 다', res.status(), 202);
    });
  } finally {
    await 기기모두지우기(고객사, 지울기기);
  }
});

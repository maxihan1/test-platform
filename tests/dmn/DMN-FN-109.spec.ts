import { defineCase, test, verify } from '@platform/kit';

import { 기기값, 기기등록, 기기모두지우기, 발송끝기다리기, 새푸시토큰, 새회원아이디, 쪽값, 푸시값, 푸시보내기, 푸시이력 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'DMN-FN-109',
  name: '회원 아이디로 거르면 그 회원의 푸시만 온다',
  apiDoc: 1,
  precondition: ['푸시를 두 건 받은 회원이 있다', 'SENT 푸시와 FAILED 푸시를 하나씩 받은 회원이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ api }) => {
  const 고객사 = api('데모마켓');
  const 회원 = 새회원아이디();
  const 지울기기: string[] = [];
  let 실패푸시 = '';
  let 성공푸시 = '';

  try {
    await test.step('「invalid-」 기기를 등록하고 첫 푸시를 보낸다', async () => {
      const 등록 = await 기기등록(고객사, 회원, 새푸시토큰('invalid-'));
      if (등록.status() === 201) 지울기기.push((await 기기값(등록)).id);
      const res = await 푸시보내기(고객사, { userId: 회원, title: '거르기 첫째', body: '실패할 푸시' });
      if (res.status() === 202) 실패푸시 = (await 푸시값(res)).id;
    });

    await test.step('첫 푸시가 FAILED 로 끝났는지 확인한다', async () => {
      const 끝 = 실패푸시 === '' ? null : await 발송끝기다리기(고객사, 실패푸시);
      await verify('첫 푸시가 FAILED 로 끝난다', 끝?.status, 'FAILED', { blocker: true });
    });

    await test.step('정상 기기를 등록하고 둘째 푸시를 보낸다', async () => {
      const 등록 = await 기기등록(고객사, 회원, 새푸시토큰());
      if (등록.status() === 201) 지울기기.push((await 기기값(등록)).id);
      const res = await 푸시보내기(고객사, { userId: 회원, title: '거르기 둘째', body: '성공할 푸시' });
      if (res.status() === 202) 성공푸시 = (await 푸시값(res)).id;
    });

    await test.step('둘째 푸시가 SENT 로 끝났는지 확인한다', async () => {
      const 끝 = 성공푸시 === '' ? null : await 발송끝기다리기(고객사, 성공푸시);
      await verify('둘째 푸시가 SENT 로 끝난다', 끝?.status, 'SENT', { blocker: true });
    });

    await test.step('회원 아이디로 거른 푸시 이력을 부른다', async () => {
      const 쪽 = await 쪽값(await 푸시이력(고객사, { userId: 회원 }));
      await verify('회원 아이디로 거르면 그 회원의 푸시만 온다', 쪽.items.map((p) => p.userId).join(', '), `${회원}, ${회원}`);
    });

    await test.step('회원 아이디와 상태 「FAILED」로 거른 푸시 이력을 부른다', async () => {
      const 쪽 = await 쪽값(await 푸시이력(고객사, { userId: 회원, status: 'FAILED' }));
      await verify('회원 아이디와 상태 FAILED 로 거르면 그 회원의 FAILED 푸시만 온다', 쪽.items.map((p) => p.id).join(', '), 실패푸시);
    });
  } finally {
    await 기기모두지우기(고객사, 지울기기);
  }
});

import { defineCase, test, verify } from '@platform/kit';

import { 기기값, 기기등록, 기기모두지우기, 새푸시토큰, 새회원아이디, 응답글, 쪽값, 푸시값, 푸시보내기, 푸시이력 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'DMN-FN-113',
  name: 'size 를 0으로 부르면 400 VALIDATION 이다',
  apiDoc: 1,
  techniques: ['경계값 분석'],
  precondition: ['기기가 하나 등록된 회원이 있다', '푸시를 두 건 받은 회원이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ api }) => {
  const 고객사 = api('데모마켓');
  const 회원 = 새회원아이디();
  const 지울기기: string[] = [];
  let 첫등록 = 0;
  const 접수코드: number[] = [];
  const 푸시번호: string[] = [];

  try {
    await test.step('회원 기기를 하나 등록한다', async () => {
      const res = await 기기등록(고객사, 회원, 새푸시토큰());
      첫등록 = res.status();
      if (첫등록 === 201) 지울기기.push((await 기기값(res)).id);
    });

    await test.step('기기 등록 응답을 확인한다', async () => {
      await verify('기기 등록 응답이 201 이다', 첫등록, 201, { blocker: true });
    });

    await test.step('그 회원에게 푸시를 두 건 보낸다', async () => {
      for (const 차례 of ['첫째', '둘째']) {
        const res = await 푸시보내기(고객사, { userId: 회원, title: `이력 ${차례}`, body: '푸시 이력 확인' });
        접수코드.push(res.status());
        if (res.status() === 202) 푸시번호.push((await 푸시값(res)).id);
      }
    });

    await test.step('두 푸시의 접수 응답을 확인한다', async () => {
      await verify('푸시 두 건의 접수 응답이 모두 202 다', 접수코드.join(', '), '202, 202', { blocker: true });
    });

    await test.step('size 를 0으로 푸시 이력을 부른다', async () => {
      const res = await 푸시이력(고객사, { userId: 회원, size: 0 });
      await verify('size 를 0으로 부르면 400 VALIDATION 이다', await 응답글(res), '400 VALIDATION');
    });

    await test.step('size 를 1로 그 회원의 푸시 이력을 부른다', async () => {
      const 쪽 = await 쪽값(await 푸시이력(고객사, { userId: 회원, size: 1 }));
      await verify('size 를 1로 부르면 푸시가 1건만 온다', 쪽.items.length, 1);
    });

    await test.step('size 를 100으로 그 회원의 푸시 이력을 부른다', async () => {
      const 쪽 = await 쪽값(await 푸시이력(고객사, { userId: 회원, size: 100 }));
      await verify('size 를 100으로 부르면 한 쪽 크기 100 으로 온다', 쪽.size, 100);
    });

    await test.step('size 를 101로 푸시 이력을 부른다', async () => {
      const res = await 푸시이력(고객사, { userId: 회원, size: 101 });
      await verify('size 를 101로 부르면 400 VALIDATION 이다', await 응답글(res), '400 VALIDATION');
    });

  } finally {
    await 기기모두지우기(고객사, 지울기기);
  }
});

import { defineCase, test, verify } from '@platform/kit';

import { 기기값, 기기등록, 기기모두지우기, 길이맞춘글자, 새푸시토큰, 새회원아이디, 응답글, 푸시보내기 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'DMN-FN-090',
  name: '같은 Idempotency-Key 로 다른 내용을 보내면 422 IDEMPOTENCY_KEY_REUSED 다',
  apiDoc: 1,
  techniques: ['동등 분할'],
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

    await test.step('같은 Idempotency-Key 로 제목만 바꿔 푸시를 보낸다', async () => {
      const 머리 = { 'Idempotency-Key': 길이맞춘글자(`key-${회원}-`, 40) };
      const 처음 = await 푸시보내기(고객사, { userId: 회원, title: '처음 제목', body: '같은 키로 보낸다' }, 머리);
      await verify('처음 보낸 응답이 202 다', 처음.status(), 202, { blocker: true });
      const 다시 = await 푸시보내기(고객사, { userId: 회원, title: '바꾼 제목', body: '같은 키로 보낸다' }, 머리);
      await verify('같은 Idempotency-Key 로 다른 내용을 보내면 422 IDEMPOTENCY_KEY_REUSED 다', await 응답글(다시), '422 IDEMPOTENCY_KEY_REUSED');
    });

  } finally {
    await 기기모두지우기(고객사, 지울기기);
  }
});

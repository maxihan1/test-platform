import { defineCase, test, verify } from '@platform/kit';

import { 기기값, 기기등록, 기기모두지우기, 길이맞춘글자, 새푸시토큰, 새회원아이디, 푸시보내기 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'DMN-FN-085',
  name: '같은 Idempotency-Key 로 같은 내용을 다시 보내면 응답 머리 Idempotent-Replayed 가 true 다',
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

    await test.step('같은 Idempotency-Key 와 같은 내용으로 푸시를 다시 보낸다', async () => {
      const 머리 = { 'Idempotency-Key': 길이맞춘글자(`key-${회원}-`, 40) };
      const 내용 = { userId: 회원, title: '다시 보냄', body: '같은 요청을 다시 보낸다' };
      const 처음 = await 푸시보내기(고객사, 내용, 머리);
      await verify('처음 보낸 응답이 202 다', 처음.status(), 202, { blocker: true });
      const 다시 = await 푸시보내기(고객사, 내용, 머리);
      await verify('같은 Idempotency-Key 로 같은 내용을 다시 보내면 응답 머리 Idempotent-Replayed 가 true 다', 다시.headers()['idempotent-replayed'], 'true');
    });

  } finally {
    await 기기모두지우기(고객사, 지울기기);
  }
});

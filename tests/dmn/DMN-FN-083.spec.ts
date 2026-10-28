import { defineCase, test, verify } from '@platform/kit';

import { 기기값, 기기등록, 기기모두지우기, 길이맞춘글자, 새푸시토큰, 새회원아이디, 응답글, 푸시보내기 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'DMN-FN-083',
  name: 'Idempotency-Key 를 0자로 보내면 400 VALIDATION 이다',
  apiDoc: 1,
  techniques: ['경계값 분석'],
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

    await test.step('Idempotency-Key 를 0자로 푸시를 보낸다', async () => {
      const res = await 푸시보내기(고객사, { userId: 회원, title: '키 0자', body: '키 0자 경계' }, { 'Idempotency-Key': '' });
      await verify('Idempotency-Key 를 0자로 보내면 400 VALIDATION 이다', await 응답글(res), '400 VALIDATION');
    });

    await test.step('Idempotency-Key 를 1자로 푸시를 보낸다', async () => {
      const 고정회원 = 'dmn-idempotency-key-one';
      const 등록 = await 기기등록(고객사, 고정회원, `tok-${고정회원}`);
      if (등록.status() === 201) 지울기기.push((await 기기값(등록)).id);
      const res = await 푸시보내기(고객사, { userId: 고정회원, title: '키 1자', body: '키 1자 경계' }, { 'Idempotency-Key': 'D' });
      await verify('Idempotency-Key 를 1자로 보내면 202 다', res.status(), 202);
    });

    await test.step('Idempotency-Key 를 64자로 푸시를 보낸다', async () => {
      const res = await 푸시보내기(고객사, { userId: 회원, title: '키 64자', body: '키 64자 경계' }, { 'Idempotency-Key': 길이맞춘글자(`key-${회원}-`, 64) });
      await verify('Idempotency-Key 를 64자로 보내면 202 다', res.status(), 202);
    });

    await test.step('Idempotency-Key 를 65자로 푸시를 보낸다', async () => {
      const res = await 푸시보내기(고객사, { userId: 회원, title: '키 65자', body: '키 65자 경계' }, { 'Idempotency-Key': 길이맞춘글자(`key-${회원}-`, 65) });
      await verify('Idempotency-Key 를 65자로 보내면 400 VALIDATION 이다', await 응답글(res), '400 VALIDATION');
    });

  } finally {
    await 기기모두지우기(고객사, 지울기기);
  }
});

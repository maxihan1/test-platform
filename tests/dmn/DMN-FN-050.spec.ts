import { defineCase, test, verify } from '@platform/kit';

import { 기기값, 기기등록, 기기모두지우기, 길이맞춘글자, 새푸시토큰, 새회원아이디, 응답글, 푸시보내기 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'DMN-FN-050',
  name: '제목을 50자로 보내면 202 다',
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

    await test.step('제목을 50자로 푸시를 보낸다', async () => {
      const res = await 푸시보내기(고객사, { userId: 회원, title: 길이맞춘글자('제목 경계 ', 50), body: '제목 50자' });
      await verify('제목을 50자로 보내면 202 다', res.status(), 202);
    });

    await test.step('제목을 51자로 푸시를 보낸다', async () => {
      const res = await 푸시보내기(고객사, { userId: 회원, title: 길이맞춘글자('제목 경계 ', 51), body: '제목 51자' });
      await verify('제목을 51자로 보내면 400 VALIDATION 이다', await 응답글(res), '400 VALIDATION');
    });

    await test.step('내용을 200자로 푸시를 보낸다', async () => {
      const res = await 푸시보내기(고객사, { userId: 회원, title: '내용 200자', body: 길이맞춘글자('내용 경계 ', 200) });
      await verify('내용을 200자로 보내면 202 다', res.status(), 202);
    });

    await test.step('내용을 201자로 푸시를 보낸다', async () => {
      const res = await 푸시보내기(고객사, { userId: 회원, title: '내용 201자', body: 길이맞춘글자('내용 경계 ', 201) });
      await verify('내용을 201자로 보내면 400 VALIDATION 이다', await 응답글(res), '400 VALIDATION');
    });
  } finally {
    await 기기모두지우기(고객사, 지울기기);
  }
});

import { defineCase, test, verify } from '@platform/kit';

import { 기기값, 기기등록, 기기모두지우기, 새푸시토큰, 응답글 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'DMN-FN-235',
  name: '회원 아이디를 공백만으로 기기를 등록하면 빈 값처럼 400 VALIDATION 이다',
  apiDoc: 1,
  techniques: ['오류 추정'],
  precondition: ['기기가 없는 새 회원 아이디다'],
  params: null,
  expected: null,
});

test(spec, async ({ api }) => {
  const 고객사 = api('데모마켓');
  const 지울기기: string[] = [];

  try {
    await test.step('회원 아이디를 공백만으로 기기를 등록한다', async () => {
      const res = await 기기등록(고객사, '   ', 새푸시토큰());
      if (res.status() === 201) 지울기기.push((await 기기값(res)).id);
      await verify('회원 아이디를 공백만으로 기기를 등록하면 빈 값처럼 400 VALIDATION 이다', await 응답글(res), '400 VALIDATION');
    });
  } finally {
    await 기기모두지우기(고객사, 지울기기);
  }
});

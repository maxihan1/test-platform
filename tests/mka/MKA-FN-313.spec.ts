import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-313',
  name: '아이디에 공백만 적고 「로그인」을 누르면 입력칸 아래 「아이디와 비밀번호를 입력하세요」가 보인다',
  techniques: ['오류 추정'],
  platforms: ['android'],
  precondition: ['앱을 켜 로그인 화면에 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 로그인 = new 로그인화면(driver);

  await test.step('로그인 화면이 떴는지 확인한다', async () => {
    await verify('로그인 화면이 떠 있다', await 로그인.로그인버튼보일때까지(), true, { blocker: true });
  });

  await test.step('아이디 입력칸에 공백만 적고 비밀번호를 적은 뒤 「로그인」을 누른다', async () => {
    await 로그인.로그인('   ', 'abcd1234');
    const 문구 = await verify('공백만 적었을 때 「아이디와 비밀번호를 입력하세요」가 보인다', await 로그인.오류글(), '아이디와 비밀번호를 입력하세요');
    const 자리 = await verify('공백만 적었을 때 안내가 비밀번호 입력칸 아래에 있다', await 로그인.오류가입력칸아래인가(), true);
    await verify('아이디에 공백만 적고 「로그인」을 누르면 입력칸 아래 「아이디와 비밀번호를 입력하세요」가 보인다', 문구 && 자리, true);
  }, { capture: true });
});

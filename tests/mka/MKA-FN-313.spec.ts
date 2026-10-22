import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면 } from './pages/login.page.js';

const 공백만 = '   ';
const 아무비밀번호 = 'mka-wrong-1';

export const spec = defineCase({
  tcId: 'MKA-FN-313',
  name: '아이디에 공백만 넣고 「로그인」을 누르면 빈 값처럼 「아이디와 비밀번호를 입력하세요」가 보인다',
  platforms: ['android'],
  techniques: ['오류 추정'],
  precondition: ['앱이 로그인 화면에 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 화면 = new 로그인화면(driver);

  await test.step('로그인 화면이 열렸는지 확인한다', async () => {
    await verify('로그인 화면이 보인다', await 화면.열릴때까지(), true, { blocker: true });
  });

  await test.step(
    '아이디 입력칸에 공백만 넣고 비밀번호를 적은 뒤 「로그인」을 누른다',
    async () => {
      await 화면.로그인(공백만, 아무비밀번호);
      await verify(
        '아이디에 공백만 넣고 「로그인」을 누르면 빈 값처럼 「아이디와 비밀번호를 입력하세요」가 보인다',
        await 화면.오류글(),
        '아이디와 비밀번호를 입력하세요',
      );
    },
    { capture: true },
  );
});

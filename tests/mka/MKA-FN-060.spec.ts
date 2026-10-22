import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-060',
  name: '아이디를 비우고 「로그인」을 누르면 입력칸 아래 「아이디와 비밀번호를 입력하세요」가 보인다',
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

  await test.step('아이디를 비우고 비밀번호만 적은 뒤 「로그인」을 누른다', async () => {
    await 로그인.로그인('', 'abcd1234');
    const 문구 = await verify('아이디를 비웠을 때 「아이디와 비밀번호를 입력하세요」가 보인다', await 로그인.오류글(), '아이디와 비밀번호를 입력하세요');
    const 자리 = await verify('아이디를 비웠을 때 안내가 비밀번호 입력칸 아래에 있다', await 로그인.오류가입력칸아래인가(), true);
    await verify('아이디를 비우고 「로그인」을 누르면 입력칸 아래 「아이디와 비밀번호를 입력하세요」가 보인다', 문구 && 자리, true);
  }, { capture: true });

  await test.step('앱을 다시 켜 로그인 화면이 떴는지 확인한다', async () => {
    await 로그인.앱다시켜기();
    await verify('다시 켠 로그인 화면이 떠 있다', await 로그인.로그인버튼보일때까지(), true, { blocker: true });
  });

  await test.step('비밀번호를 비우고 아이디만 적은 뒤 「로그인」을 누른다', async () => {
    await 로그인.로그인('mka_user', '');
    const 문구 = await verify('비밀번호를 비웠을 때 「아이디와 비밀번호를 입력하세요」가 보인다', await 로그인.오류글(), '아이디와 비밀번호를 입력하세요');
    const 자리 = await verify('비밀번호를 비웠을 때 안내가 비밀번호 입력칸 아래에 있다', await 로그인.오류가입력칸아래인가(), true);
    await verify('비밀번호를 비우고 「로그인」을 누르면 입력칸 아래 「아이디와 비밀번호를 입력하세요」가 보인다', 문구 && 자리, true);
  }, { capture: true });
});

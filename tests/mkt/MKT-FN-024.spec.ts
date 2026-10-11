import { defineCase, test, verify } from '@platform/kit';

import { 방해막기 } from './helpers/account.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-024',
  name: '아이디 칸에 13자를 적으면 12자까지만 들어간다',
  platforms: ['desktop'],
  precondition: [
    '회원가입 화면을 열었다',
  ],
  techniques: ['경계값 분석'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 가입 = new 회원가입화면(page);

  await 방해막기(page);

  await test.step('회원가입 화면을 연다', async () => {
    await 가입.열기();
    await verify('회원가입 화면에 「가입하기」 버튼이 보인다', await 가입.가입하기버튼.isVisible(), true, { blocker: true });
  });

  await test.step('아이디 칸에 13자를 적는다', async () => {
    await 가입.아이디칸.fill('abcdefghijklm');
    await verify('아이디 칸에 13자를 적으면 12자까지만 들어간다', (await 가입.아이디칸.inputValue()).length, 12);
  });

  await test.step('아이디 칸에 12자를 적는다', async () => {
    await 가입.아이디칸.fill('abcdefghijkl');
    await verify('아이디 칸에 12자를 적으면 12자가 모두 들어간다', await 가입.아이디칸.inputValue(), 'abcdefghijkl');
  });

  await test.step('비밀번호 칸에 21자를 적는다', async () => {
    await 가입.비밀번호칸.fill('abcdefghij1234567890!');
    await verify('비밀번호 칸에 21자를 적으면 20자까지만 들어간다', (await 가입.비밀번호칸.inputValue()).length, 20);
  });

  await test.step('비밀번호 칸에 20자를 적는다', async () => {
    await 가입.비밀번호칸.fill('abcdefghij123456789!');
    await verify('비밀번호 칸에 20자를 적으면 20자가 모두 들어간다', await 가입.비밀번호칸.inputValue(), 'abcdefghij123456789!');
  });

  await test.step('이름 칸에 1자를 적는다', async () => {
    await 가입.이름칸.fill('가');
    await verify('이름을 1자로 적으면 「이름은 2~10자입니다」 가 보인다', await 가입.안내문구('name').innerText(), '이름은 2~10자입니다');
  });

  await test.step('이름 칸에 2자를 적는다', async () => {
    await 가입.이름칸.fill('가나');
    await verify('이름을 2자로 적으면 「이름은 2~10자입니다」 가 보이지 않는다', await 가입.안내문구('name').isVisible(), false);
  });

  await test.step('이름 칸에 11자를 적는다', async () => {
    await 가입.이름칸.fill('가나다라마바사아자차카');
    await verify('이름 칸에 11자를 적으면 10자까지만 들어간다', (await 가입.이름칸.inputValue()).length, 10);
  });

  await test.step('이름 칸에 10자를 적는다', async () => {
    await 가입.이름칸.fill('가나다라마바사아자차');
    await verify(
      '이름 칸에 10자를 적으면 10자가 모두 들어가고 「이름은 2~10자입니다」 가 보이지 않는다',
      { 값: await 가입.이름칸.inputValue(), 오류문구보임: await 가입.안내문구('name').isVisible() },
      { 값: '가나다라마바사아자차', 오류문구보임: false },
    );
  });
});

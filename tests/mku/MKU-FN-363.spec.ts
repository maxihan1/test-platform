import { defineCase, test, verify } from '@platform/kit';

import { 보이는글, 세션아이디, 경로 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-363',
  name: '이메일을 「abc」로 적으면 「이메일 형식이 올바르지 않습니다」가 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  techniques: ['동등 분할'],
});

test(spec, async ({ page }) => {
  const 회원가입 = new 회원가입화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('회원가입을 연다', async () => {
    await 방해막기(page);
    await 회원가입.열기();
  });

  await test.step('회원가입 화면이 열렸는지 확인한다', async () => {
    await 회원가입.제목.waitFor();
    await verify('회원가입 화면이 열려 있다', 경로(page), 회원가입화면.주소, { blocker: true });
  });

  await test.step('회원가입 이메일 칸에 「abc」를 적고 다른 칸으로 옮긴다', async () => {
    await 회원가입.이메일.fill('abc');
    await 회원가입.이메일.blur();
    await verify('이메일을 「abc」로 적으면 「이메일 형식이 올바르지 않습니다」가 보인다', await 보이는글(회원가입.안내('email')), '이메일 형식이 올바르지 않습니다');
  });
});

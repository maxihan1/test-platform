import { defineCase, test, verify } from '@platform/kit';

import { 새회원정보 } from './helpers/account.helper.js';
import { 보이는글, 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 비밀번호찾기화면 } from './pages/find-password.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-078',
  name: '아이디와 이메일이 맞지 않으면 「일치하는 회원 정보가 없습니다」가 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  techniques: ['동등 분할'],
});

test(spec, async ({ page }) => {
  const 찾기 = new 비밀번호찾기화면(page);
  const 정보 = 새회원정보();

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('비밀번호 찾기에서 없는 아이디와 이메일을 적고 「임시 비밀번호 받기」를 누른다', async () => {
    await 방해막기(page);
    await 찾기.열기();
    await 찾기.제목.waitFor();
    await 찾기.적고받기(정보.loginId, 정보.email);
    await 찾기.결과.waitFor();
    await verify('아이디와 이메일이 맞지 않으면 「일치하는 회원 정보가 없습니다」가 보인다', await 보이는글(찾기.결과), '일치하는 회원 정보가 없습니다');
  });
});

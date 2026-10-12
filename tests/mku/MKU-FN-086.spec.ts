import { defineCase, test, verify } from '@platform/kit';

import { 보이는글, 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 비밀번호찾기화면 } from './pages/find-password.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-086',
  name: '아이디와 이메일을 비우고 「임시 비밀번호 받기」를 누르면 「일치하는 회원 정보가 없습니다」가 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  techniques: ['오류 추정'],
});

test(spec, async ({ page }) => {
  const 찾기 = new 비밀번호찾기화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('비밀번호 찾기에서 두 칸을 비우고 「임시 비밀번호 받기」를 누른다', async () => {
    await 방해막기(page);
    await 찾기.열기();
    await 찾기.제목.waitFor();
    await 찾기.받기.click();
    await 찾기.결과.waitFor();
    await verify(
      '아이디와 이메일을 비우고 「임시 비밀번호 받기」를 누르면 「일치하는 회원 정보가 없습니다」가 보인다',
      await 보이는글(찾기.결과),
      '일치하는 회원 정보가 없습니다',
    );
  });
});

import { defineCase, test, verify } from '@platform/kit';

import { 새회원정보, 회원가입 } from './helpers/account.helper.js';
import { 가입자정리하기, 보이는글 } from './helpers/common-tools.helper.js';
import { 아이디쓰이나 } from './helpers/member-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 비밀번호찾기화면 } from './pages/find-password.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-076',
  name: '아이디와 이메일이 맞으면 「가입하신 이메일로 임시 비밀번호를 보냈습니다」가 보인다',
  precondition: ['새로 가입한 회원이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 찾기 = new 비밀번호찾기화면(page);
  const 정보 = 새회원정보();

  try {
    await test.step('새로 가입한 회원을 만든다', async () => {
      await 회원가입(page.request, 정보);
    });

    await test.step('새로 가입한 회원이 있는지 확인한다', async () => {
      await verify('새로 가입한 회원의 아이디가 이미 쓰이고 있다', await 아이디쓰이나(page.request, 정보.loginId), true, { blocker: true });
    });

    await test.step('비밀번호 찾기에서 그 회원의 아이디와 이메일을 적고 「임시 비밀번호 받기」를 누른다', async () => {
      await 방해막기(page);
      await 찾기.열기();
      await 찾기.제목.waitFor();
      await 찾기.적고받기(정보.loginId, 정보.email);
      await 찾기.결과.waitFor();
      await verify(
        '아이디와 이메일이 맞으면 「가입하신 이메일로 임시 비밀번호를 보냈습니다」가 보인다',
        await 보이는글(찾기.결과),
        '가입하신 이메일로 임시 비밀번호를 보냈습니다',
      );
    });
  } finally {
    await 가입자정리하기(page.request, 정보);
  }
});

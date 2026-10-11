import { defineCase, test, verify } from '@platform/kit';

import { 새회원정보, 회원가입 } from './helpers/account.helper.js';
import { 가입자정리하기, 보이는글 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 비밀번호찾기화면 } from './pages/find-password.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-084',
  name: '맞는 아이디와 이메일로 「임시 비밀번호 받기」를 누르면 「가입하신 이메일로 임시 비밀번호를 보냈습니다」가 보인다',
  precondition: ['가입한 회원의 아이디와 이메일을 안다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 찾기 = new 비밀번호찾기화면(page);
  const 정보 = 새회원정보();

  try {
    await test.step('회원을 가입시킨다', async () => {
      await 회원가입(page.request, 정보);
    });

    await test.step('가입한 회원이 있는지 확인한다', async () => {
      const 응답 = await page.request.get(`/api/auth/check-id?loginId=${정보.loginId}`);
      const 본문 = (await 응답.json()) as { available: boolean };
      await verify('가입한 회원의 아이디가 이미 쓰이고 있다', 본문.available, false, { blocker: true });
    });

    await test.step('비밀번호 찾기에서 그 아이디와 이메일을 적고 「임시 비밀번호 받기」를 누른다', async () => {
      await 방해막기(page);
      await 찾기.열기();
      await 찾기.제목.waitFor();
      await 찾기.적고받기(정보.loginId, 정보.email);
      await 찾기.결과.waitFor();
      await verify(
        '맞는 아이디와 이메일로 「임시 비밀번호 받기」를 누르면 「가입하신 이메일로 임시 비밀번호를 보냈습니다」가 보인다',
        await 보이는글(찾기.결과),
        '가입하신 이메일로 임시 비밀번호를 보냈습니다',
      );
    });
  } finally {
    await 가입자정리하기(page.request, 정보);
  }
});

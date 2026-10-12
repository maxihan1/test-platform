import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 내정보, 새회원으로로그인, 탈퇴, type 회원정보 } from './helpers/account.helper.js';
import { 보이는이름들, 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKU-UI-007',
  name: '회원 홈 머리글 오른쪽에 「{이름}님」 · 「마이페이지」 · 「로그아웃」이 보인다',
  precondition: ['회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  let 정보: 회원정보 | undefined;
  const 머리 = new 머리글(page);
  const 홈 = new 홈화면(page);

  try {
    await test.step('회원으로 로그인한다', async () => {
      정보 = await 새회원으로로그인(page.request);
    });

    await test.step('로그인한 회원인지 확인한다', async () => {
      await verify('로그인한 회원이 맞다', (await 세션아이디(page)) === 정보?.loginId, true, { blocker: true });
    });

    await test.step('홈을 연다', async () => {
      const 이름 = (await 내정보(page.request)).name;
      await 방해막기(page);
      await 홈.열기();
      await 머리.로그아웃.waitFor();
      await verify(
        '회원 홈 머리글 오른쪽에 「{이름}님」 · 「마이페이지」 · 「로그아웃」이 보인다',
        await 보이는이름들({
          [`「${이름}님」`]: 머리.인사.filter({ hasText: `${이름}님` }),
          '「마이페이지」': 머리.마이페이지,
          '「로그아웃」': 머리.로그아웃,
        }),
        `「${이름}님」, 「마이페이지」, 「로그아웃」`,
      );
    });
  } finally {
    if (정보 !== undefined) await 탈퇴(page.request);
  }
});

import { defineCase, test, verify } from '@platform/kit';

import { 문구가보이나 } from './helpers/app.helper.js';
import { 가입양식까지 } from './helpers/onboarding.helper.js';
import { 가입양식화면 } from './pages/signup-form.page.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-066',
  name: '두 암호 칸에서 포커스가 나갈 때 값이 다르면 「비밀번호가 일치하지 않습니다.」가 보인다',
  platforms: ['android'],
  techniques: ['동등 분할'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 시작 = new 시작화면(driver);
  const 양식 = new 가입양식화면(driver);

  await test.step('앱 시작 화면을 확인한다', async () => {
    await verify('시작 화면에 「로그인」 버튼이 보인다', await 시작.떴나(), true, { blocker: true });
  });
  await test.step('가입 경로에서 우리 서버를 고르고 가입 양식을 연다', async () => {
    await verify('가입 양식이 보인다', await 가입양식까지(driver), true, { blocker: true });
  });
  await test.step('두 암호 칸에 서로 다른 8자를 적고 다른 칸을 누른다', async () => {
    await 양식.적기('암호', 'Mta12345');
    await 양식.적기('암호확인', 'Mta12346');
    await 양식.다른칸누르기();
    await verify('두 암호 칸에서 포커스가 나갈 때 값이 다르면 「비밀번호가 일치하지 않습니다.」가 보인다', await 문구가보이나(driver, '비밀번호가 일치하지 않습니다.'), true);
  }, { capture: true });
});

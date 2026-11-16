import { defineCase, test, verify } from '@platform/kit';
import { 가입양식까지 } from './helpers/signup-flow.helper.js';
import { 가입양식화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-052',
  name: '가입 양식에 가입 사유 칸과 「생년월일」 칸이 보이지 않는다',
  platforms: ['android'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 양식 = new 가입양식화면(driver);

  await test.step('가입 양식을 연다', async () => {
    await 가입양식까지(driver);
    await verify('가입 양식 「사용자명」 칸이 보인다', await 양식.그려질때까지(), true, { blocker: true });
    const 사유 = await verify('가입 사유 칸이 보이지 않는다', await 양식.칸보이나('가입사유칸'), false);
    const 생년월일 = await verify('「생년월일」 칸이 보이지 않는다', await 양식.칸보이나('생년월일'), false);
    await verify('가입 양식에 가입 사유 칸과 「생년월일」 칸이 보이지 않는다', 사유 && 생년월일, true);
  });
});

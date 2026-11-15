import { defineCase, test, verify } from '@platform/kit';
import { 가입양식까지 } from './helpers/signup-flow.helper.js';
import { 가입양식화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-050',
  name: '가입 양식에 제목 「계정 만들기」와 「이름」 · 「사용자명」 · 「이메일」 · 「암호」 · 「암호 확인」 칸과 「다음」이 보인다',
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
    const 제목 = await verify('제목이 「계정 만들기」다', await 양식.제목글(), '계정 만들기');
    const 이름 = await verify('「이름」 칸이 보인다', await 양식.칸보이나('이름칸'), true);
    const 사용자명 = await verify('「사용자명」 칸이 보인다', await 양식.칸보이나('사용자명칸'), true);
    const 이메일 = await verify('「이메일」 칸이 보인다', await 양식.칸보이나('이메일칸'), true);
    const 암호 = await verify('「암호」 칸이 보인다', await 양식.칸보이나('암호칸'), true);
    const 확인 = await verify('「암호 확인」 칸이 보인다', await 양식.칸보이나('암호확인칸'), true);
    const 다음 = await verify('「다음」이 보인다', await 양식.칸보이나('다음'), true);
    await verify('가입 양식에 제목 「계정 만들기」와 「이름」 · 「사용자명」 · 「이메일」 · 「암호」 · 「암호 확인」 칸과 「다음」이 보인다', 제목 && 이름 && 사용자명 && 이메일 && 암호 && 확인 && 다음, true);
  });
});

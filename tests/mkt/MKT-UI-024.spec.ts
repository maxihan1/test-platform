import { defineCase, test, verify } from '@platform/kit';

import { 바닥글 } from './components/footer.component.js';
import { 보이는이름들, 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-024',
  name: '홈 바닥글에 「이용약관」 · 「개인정보처리방침」 링크와 「© 2026 DemoMarket」이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 바닥 = new 바닥글(page);
  const 홈 = new 홈화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('홈을 연다', async () => {
    await 방해막기(page);
    await 홈.열기();
    await 바닥.저작권.waitFor();
    await verify(
      '홈 바닥글에 「이용약관」 · 「개인정보처리방침」 링크와 「© 2026 DemoMarket」이 보인다',
      await 보이는이름들({ '「이용약관」 링크': 바닥.이용약관, '「개인정보처리방침」 링크': 바닥.개인정보처리방침, '「© 2026 DemoMarket」': 바닥.저작권 }),
      '「이용약관」 링크, 「개인정보처리방침」 링크, 「© 2026 DemoMarket」',
    );
  });
});

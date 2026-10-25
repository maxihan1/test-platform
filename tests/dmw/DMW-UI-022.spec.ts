import { defineCase, test, verify } from '@platform/kit';

import { 쿠키안내 } from './components/cookie-bar.component.js';
import { 바닥글 } from './components/footer.component.js';
import { 가려졌나, 맨아래로내리기, 화면아래에붙었나 } from './helpers/member-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-022',
  name: '동의하기 전 쿠키 안내 띠는 화면 아래에 붙어 그 아래 내용을 덮는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 쿠키 = new 쿠키안내(page);
  const 바닥 = new 바닥글(page);
  await 안내창막기(page, { 쿠키: false });

  await test.step('홈 화면을 연다', async () => {
    await 홈.열기();
    await verify('비회원이다', await 홈.머리.로그인.isVisible(), true, { blocker: true });
    await verify('쿠키 안내 띠가 보인다', await 쿠키.띠.isVisible(), true, { blocker: true });
  });

  await test.step('동의하기 전 쿠키 안내 띠 자리를 확인한다', async () => {
    const 붙음 = await verify('쿠키 안내 띠가 화면 아래에 붙어 있다', await 화면아래에붙었나(page, 쿠키.띠), true);
    await 맨아래로내리기(page);
    await 바닥.저작권.waitFor();
    const 덮음 = await verify('쿠키 안내 띠가 그 아래 내용을 덮는다', await 가려졌나(바닥.저작권), true);
    await verify('동의하기 전 쿠키 안내 띠는 화면 아래에 붙어 그 아래 내용을 덮는다', 붙음 && 덮음, true);
  });
});

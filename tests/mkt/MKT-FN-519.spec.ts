import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-519',
  name: '이름 칸을 비우면 「이름은 2~10자입니다」가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원가입 화면이 열려 있다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 가입 = new 회원가입화면(page);

  await test.step('회원가입 화면을 연다', async () => {
    await 방해창막기(page);
    await 가입.열기();
    await verify('회원가입 화면 제목 「회원가입」이 보인다', await 가입.제목.isVisible(), true, { blocker: true });
  });

  await test.step('이름 칸을 눌렀다가 비운 채 다른 칸으로 옮긴다', async () => {
    await 가입.칸을비운채옮기기('name');
    await verify('이름 칸을 비우면 「이름은 2~10자입니다」가 보인다', await 가입.오류문구('name').isVisible(), true);
  });
});

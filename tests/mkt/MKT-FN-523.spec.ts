import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 비밀번호찾기화면 } from './pages/find-password.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-523',
  name: '빈 칸으로 「임시 비밀번호 받기」를 누르면 결과 자리에 안내가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비밀번호 찾기 화면이 열려 있다'],
  techniques: ['오류 추정'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 찾기 = new 비밀번호찾기화면(page);

  await test.step('비밀번호 찾기 화면을 연다', async () => {
    await 방해창막기(page);
    await 찾기.열기();
    await verify('비밀번호 찾기 화면 제목 「비밀번호 찾기」가 보인다', await 찾기.제목.isVisible(), true, { blocker: true });
  });

  await test.step('아이디와 이메일을 비우고 「임시 비밀번호 받기」를 누른다', async () => {
    await 찾기.받기누르기();
    await verify('빈 칸으로 「임시 비밀번호 받기」를 누르면 결과 자리에 안내가 보인다', await 찾기.결과.isVisible(), true);
  });
});

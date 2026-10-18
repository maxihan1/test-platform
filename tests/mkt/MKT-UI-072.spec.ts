import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-072',
  name: '성별 라디오 「선택 안 함」 · 「남성」 · 「여성」이 보이고 「선택 안 함」이 골라져 있다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원가입 화면이 열려 있다'],
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

  await test.step('회원가입 화면의 성별 칸을 확인한다', async () => {
    await verify(
      '성별 라디오 「선택 안 함」 · 「남성」 · 「여성」이 보이고 「선택 안 함」이 골라져 있다',
      {
        선택안함: await 가입.성별선택안함.isVisible(),
        남성: await 가입.성별남성.isVisible(),
        여성: await 가입.성별여성.isVisible(),
        선택안함골라짐: await 가입.성별선택안함.isChecked(),
        남성골라짐: await 가입.성별남성.isChecked(),
        여성골라짐: await 가입.성별여성.isChecked(),
      },
      { 선택안함: true, 남성: true, 여성: true, 선택안함골라짐: true, 남성골라짐: false, 여성골라짐: false },
    );
  });
});

import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 나타났나, 사라졌나 } from './helpers/visual.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-079',
  name: '약관 모달의 「확인」 버튼을 누르면 모달이 닫힌다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원가입 화면이 열려 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 가입 = new 회원가입화면(page);
  const 창 = 가입.약관창('이용약관');

  await test.step('회원가입 화면을 연다', async () => {
    await 방해창막기(page);
    await 가입.열기();
    await verify('회원가입 화면 제목 「회원가입」이 보인다', await 가입.제목.isVisible(), true, { blocker: true });
  });

  await test.step('약관 모달을 열고 「확인」 버튼을 누른다', async () => {
    await 가입.약관보기버튼('이용약관').click();
    await verify('약관 모달이 떠 있다', await 나타났나(창), true, { blocker: true });
    await 가입.약관창확인버튼(창).click();
    await verify('약관 모달의 「확인」 버튼을 누르면 모달이 닫힌다', await 사라졌나(창), true);
  });

  await test.step('약관 모달을 열고 오른쪽 위 X 를 누른다', async () => {
    await 가입.약관보기버튼('이용약관').click();
    await verify('약관 모달이 떠 있다', await 나타났나(창), true, { blocker: true });
    await 가입.모달.닫기X(창).click();
    await verify('약관 모달의 X 를 누르면 모달이 닫힌다', await 사라졌나(창), true);
  });

  await test.step('약관 모달을 열고 바깥 영역을 누른다', async () => {
    await 가입.약관보기버튼('이용약관').click();
    await verify('약관 모달이 떠 있다', await 나타났나(창), true, { blocker: true });
    await page.mouse.click(5, 5);
    await verify('약관 모달 바깥을 누르면 모달이 닫힌다', await 사라졌나(창), true);
  });

  await test.step('약관 모달을 열고 ESC 키를 친다', async () => {
    await 가입.약관보기버튼('이용약관').click();
    await verify('약관 모달이 떠 있다', await 나타났나(창), true, { blocker: true });
    await page.keyboard.press('Escape');
    await verify('약관 모달에서 ESC 를 치면 모달이 닫힌다', await 사라졌나(창), true);
  });
});

import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 두프레임뒤, 보낸요청끝날때까지 } from './helpers/common-tools.helper.js';
import { 나타났나, 사라졌나 } from './helpers/visual.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-385',
  name: '회원가입 버튼 반응',
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

  await test.step('회원가입 화면에서 「중복 확인」을 누른다', async () => {
    await verify(
      '회원가입 화면에서 「중복 확인」을 누르면 버튼이 보이고 누를 수 있다',
      { 보임: await 가입.중복확인버튼.isVisible(), 누를수있음: await 가입.중복확인버튼.isEnabled() },
      { 보임: true, 누를수있음: true },
    );
  });

  await test.step('회원가입 화면에서 「비밀번호 보기」를 누른다', async () => {
    await 가입.입력하기('password', 'Demo123!');
    await 가입.눈모양누르기();
    await verify('회원가입 화면에서 「비밀번호 보기」를 누르면 비밀번호 칸 글자가 보인다', await 가입.비밀번호칸종류(), 'text');
    await 가입.눈모양누르기();
  });

  await test.step('회원가입 화면에서 「보기」를 누른다', async () => {
    await 가입.약관보기버튼('이용약관').click();
    await verify('회원가입 화면에서 「보기」를 누르면 약관 모달이 뜬다', await 나타났나(가입.약관창('이용약관')), true);
    await page.keyboard.press('Escape');
    await 사라졌나(가입.약관창('이용약관'));
  });

  await test.step('회원가입 화면에서 「전체 동의」를 누른다', async () => {
    await 가입.전체동의.click();
    await verify(
      '회원가입 화면에서 「전체 동의」를 누르면 약관 셋이 켜진다',
      { 이용약관: await 가입.이용약관동의.isChecked(), 개인정보: await 가입.개인정보동의.isChecked(), 마케팅: await 가입.마케팅동의.isChecked() },
      { 이용약관: true, 개인정보: true, 마케팅: true },
    );
    await 가입.전체동의.click();
  });

  await test.step('회원가입 화면에서 「남성」을 누른다', async () => {
    await 가입.성별남성.click();
    await verify('회원가입 화면에서 「남성」을 누르면 성별 「남성」이 골라진다', await 가입.성별남성.isChecked(), true);
  });

  await test.step('회원가입 화면에서 「도서」를 누른다', async () => {
    await 가입.관심분야칸('도서').click();
    await verify('회원가입 화면에서 「도서」를 누르면 관심 분야 「도서」가 켜진다', await 가입.관심분야칸('도서').isChecked(), true);
  });

  await test.step('회원가입 화면에서 「가입하기」를 누른다', async () => {
    const 보낸수 = await 보낸요청끝날때까지(page, '/api/auth/signup', async () => {
      await 가입.가입하기버튼.click({ force: true });
      await 두프레임뒤(page);
    });
    await verify(
      '회원가입 화면에서 「가입하기」를 누르면 빈 칸이 있어 아무 일도 일어나지 않는다',
      { 가입요청: 보낸수, 회원가입화면: await 가입.제목.isVisible() },
      { 가입요청: 0, 회원가입화면: true },
    );
  });
});

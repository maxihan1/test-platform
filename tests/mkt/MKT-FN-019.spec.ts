import { defineCase, test, verify } from '@platform/kit';

import { 쿠키띠 } from './components/cookie-bar.component.js';
import { 모달 } from './components/modal.component.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-019',
  name: '약관 전체 동의가 약관 셋과 연동되고 「보기」로 연 약관 모달이 네 가지 방법으로 닫힌다',
  precondition: ['비회원이다', '「전체 동의」를 체크했다', '약관 모달이 열려 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 회원가입화면(page);
  const 약관창 = new 모달(page);

  await test.step('「전체 동의」를 체크한다 → 약관 하나를 해제한다', async () => {
    await 화면.열기();
    await 화면.가입하기버튼().waitFor();
    await new 쿠키띠(page).동의하기();
    await 화면.전체동의체크().check();
    await verify(
      '「전체 동의」를 체크하면 약관 셋이 모두 체크된다',
      [
        await 화면.약관체크('(필수) 이용약관 동의').isChecked(),
        await 화면.약관체크('(필수) 개인정보 수집 동의').isChecked(),
        await 화면.약관체크('(선택) 마케팅 수신 동의').isChecked(),
      ],
      [true, true, true],
      { blocker: true },
    );
    await 화면.약관체크('(선택) 마케팅 수신 동의').uncheck();
    await verify('약관 하나라도 해제하면 「전체 동의」도 해제된다', await 화면.전체동의체크().isChecked(), false);
  });

  await test.step('「이용약관」 옆 「보기」를 누른다', async () => {
    await 화면.약관보기버튼('(필수) 이용약관 동의').click();
    await 약관창.제목().waitFor();
    await verify('「보기」를 누르면 약관 전문이 모달로 뜬다', [await 약관창.창().isVisible(), await 약관창.제목().innerText()], [true, '이용약관'], { blocker: true });
  });

  await test.step('모달의 「확인」 버튼을 누른다 → 모달 오른쪽 위 X 를 누른다', async () => {
    await 약관창.버튼('확인').click();
    await 약관창.제목().waitFor({ state: 'detached' });
    await verify('「확인」 버튼을 누르면 약관 모달이 닫힌다', await 약관창.창().isVisible(), false);
    await 화면.약관보기버튼('(필수) 이용약관 동의').click();
    await 약관창.제목().waitFor();
    await 약관창.닫기X().click();
    await 약관창.제목().waitFor({ state: 'detached' });
    await verify('오른쪽 위 X 를 누르면 약관 모달이 닫힌다', await 약관창.창().isVisible(), false);
  });

  await test.step('모달 바깥 영역을 누른다 → ESC 키를 누른다', async () => {
    await 화면.약관보기버튼('(필수) 이용약관 동의').click();
    await 약관창.제목().waitFor();
    await 약관창.바깥영역().click({ position: { x: 5, y: 5 } });
    await 약관창.제목().waitFor({ state: 'detached' });
    await verify('바깥 영역을 누르면 약관 모달이 닫힌다', await 약관창.창().isVisible(), false);
    await 화면.약관보기버튼('(필수) 이용약관 동의').click();
    await 약관창.제목().waitFor();
    await 화면.ESC누르기();
    await 약관창.제목().waitFor({ state: 'detached' });
    await verify('ESC 키를 누르면 약관 모달이 닫힌다', await 약관창.창().isVisible(), false);
  });
});

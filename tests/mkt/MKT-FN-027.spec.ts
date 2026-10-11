import { defineCase, test, verify } from '@platform/kit';

import { 모달 } from './components/modal.component.js';
import { 방해막기 } from './helpers/account.helper.js';
import { 새가입값 } from './helpers/member.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-027',
  name: '없는 아이디로 「중복 확인」 을 누르면 「사용 가능한 아이디입니다」 가 보인다',
  platforms: ['desktop'],
  precondition: [
    '회원가입 화면을 열었다',
  ],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 가입 = new 회원가입화면(page);
  const 창 = new 모달(page);
  const 값 = 새가입값();
  const 보기 = 가입.약관보기버튼('(필수) 이용약관 동의');

  await 방해막기(page);

  await test.step('회원가입 화면을 연다', async () => {
    await 가입.열기();
    await verify('회원가입 화면에 「가입하기」 버튼이 보인다', await 가입.가입하기버튼.isVisible(), true, { blocker: true });
  });

  await test.step('아이디에 새 아이디를 적고 「중복 확인」 을 누른다', async () => {
    await 가입.아이디칸.fill(값.아이디);
    await 가입.중복확인누르기();
    await verify('없는 아이디로 「중복 확인」 을 누르면 「사용 가능한 아이디입니다」 가 보인다', await 가입.안내문구('loginId').innerText(), '사용 가능한 아이디입니다');
  });

  await test.step('비밀번호를 적고 눈 모양 버튼을 누른다', async () => {
    await 가입.비밀번호칸.fill(값.비밀번호);
    await 가입.눈버튼.click();
    await verify(
      '눈 모양 버튼을 누르면 입력한 비밀번호가 글자로 보인다',
      { 종류: await 가입.비밀번호칸.getAttribute('type'), 값: await 가입.비밀번호칸.inputValue() },
      { 종류: 'text', 값: 값.비밀번호 },
    );
  });

  await test.step('눈 모양 버튼을 다시 누른다', async () => {
    await 가입.눈버튼.click();
    await verify('눈 모양 버튼을 다시 누르면 비밀번호가 가려진다', await 가입.비밀번호칸.getAttribute('type'), 'password');
  });

  await test.step('「전체 동의」 를 켠다', async () => {
    await 가입.전체동의.check();
    await verify(
      '「전체 동의」 를 켜면 약관 셋이 모두 켜진다',
      {
        이용약관: await 가입.약관체크('(필수) 이용약관 동의').isChecked(),
        개인정보: await 가입.약관체크('(필수) 개인정보 수집 동의').isChecked(),
        마케팅: await 가입.약관체크('(선택) 마케팅 수신 동의').isChecked(),
      },
      { 이용약관: true, 개인정보: true, 마케팅: true },
    );
  });

  await test.step('「(선택) 마케팅 수신 동의」 를 끈다', async () => {
    await 가입.약관체크('(선택) 마케팅 수신 동의').uncheck();
    await verify('약관 하나를 끄면 「전체 동의」 도 꺼진다', await 가입.전체동의.isChecked(), false);
  });

  await test.step('「(필수) 이용약관 동의」 옆 「보기」 를 누른다', async () => {
    await 보기.click();
    await 창.창.waitFor();
    await verify(
      '약관 옆 「보기」 를 누르면 약관 전문이 모달로 뜬다',
      { 모달보임: await 창.창.isVisible(), 전문있음: (await 창.본문.innerText()).trim().length > 0 },
      { 모달보임: true, 전문있음: true },
    );
  });

  await test.step('약관 모달의 「확인」 을 누른다', async () => {
    await 창.버튼('확인').click();
    await 가입.모달닫힘.waitFor();
    await verify('약관 모달에서 「확인」 을 누르면 모달이 닫힌다', await 창.창.count(), 0);
  });

  await test.step('약관 모달을 다시 열고 오른쪽 위 X · 바깥 영역 · ESC 키로 하나씩 닫는다', async () => {
    const 닫힘: Record<string, boolean> = {};

    await 보기.click();
    await 창.창.waitFor();
    await 창.닫기X.click();
    await 가입.모달닫힘.waitFor();
    닫힘.X = (await 창.창.count()) === 0;

    await 보기.click();
    await 창.창.waitFor();
    await 창.바깥.click({ position: { x: 5, y: 5 } });
    await 가입.모달닫힘.waitFor();
    닫힘.바깥 = (await 창.창.count()) === 0;

    await 보기.click();
    await 창.창.waitFor();
    await page.keyboard.press('Escape');
    await 가입.모달닫힘.waitFor();
    닫힘.ESC = (await 창.창.count()) === 0;

    await verify('약관 모달은 오른쪽 위 X · 바깥 영역 클릭 · ESC 키로도 닫힌다', 닫힘, { X: true, 바깥: true, ESC: true });
  });
});

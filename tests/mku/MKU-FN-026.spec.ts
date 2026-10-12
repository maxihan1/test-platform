import { defineCase, test, verify } from '@platform/kit';

import { 모달 } from './components/modal.component.js';
import { 경로, 불투명도재기, 서서히바뀌었나, 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-026',
  name: '약관 「보기」를 누르면 약관 모달이 0.3초 동안 서서히 나타난다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 회원가입 = new 회원가입화면(page);
  const 약관창 = new 모달(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('회원가입을 연다', async () => {
    await 방해막기(page);
    await 회원가입.열기();
  });

  await test.step('회원가입 화면이 열렸는지 확인한다', async () => {
    await 회원가입.제목.waitFor();
    await verify('회원가입 화면이 열려 있다', 경로(page), 회원가입화면.주소, { blocker: true });
  });

  await test.step('회원가입에서 「(필수) 이용약관 동의」 옆 「보기」를 누른다', async () => {
    const 기록 = 불투명도재기(page, '.modal-backdrop', 800);
    await 회원가입.이용약관보기.click();
    await 약관창.창.waitFor();
    const 값들 = await 기록;
    const 전환시간 = await 약관창.배경.evaluate((el) => getComputedStyle(el).transitionDuration);
    await verify(
      '약관 「보기」를 누르면 약관 모달이 0.3초 동안 서서히 나타난다',
      { 전환시간, 서서히: 서서히바뀌었나(값들) },
      { 전환시간: '0.3s', 서서히: true },
    );
  });

  await test.step('약관 모달에서 「확인」을 누른다', async () => {
    const 전환시간 = await 약관창.배경.evaluate((el) => getComputedStyle(el).transitionDuration);
    const 기록 = 불투명도재기(page, '.modal-backdrop', 800);
    await 약관창.버튼('확인').click();
    const 값들 = await 기록;
    await verify(
      '약관 모달의 「확인」을 누르면 모달이 0.3초 동안 서서히 사라진다',
      { 전환시간, 서서히: 서서히바뀌었나(값들) },
      { 전환시간: '0.3s', 서서히: true },
    );
  });
});

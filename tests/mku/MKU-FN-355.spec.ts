import { defineCase, test, verify } from '@platform/kit';

import { 경로, 세션아이디, 스크롤멈출때까지기다리기 } from './helpers/common-tools.helper.js';
import { 모달 } from './components/modal.component.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-355',
  name: '약관 모달이 열려 있는 동안 휠을 굴려도 뒤 화면이 스크롤되지 않는다',
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

  await test.step('회원가입 화면이 한 화면보다 긴지 확인한다', async () => {
    await 회원가입.제목.waitFor();
    await verify(
      '회원가입 화면이 열려 있고 한 화면보다 길다',
      { 화면: 경로(page), 한화면보다김: await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight) },
      { 화면: 회원가입화면.주소, 한화면보다김: true },
      { blocker: true },
    );
  });

  await test.step('약관 모달을 연 채 휠을 굴린다', async () => {
    await 회원가입.이용약관보기.click();
    await 약관창.창.waitFor();
    await 스크롤멈출때까지기다리기(page);
    const 열었을때위치 = await page.evaluate(() => window.scrollY);
    await page.mouse.move(20, 360);
    await page.mouse.wheel(0, 600);
    await 스크롤멈출때까지기다리기(page);
    await verify('약관 모달이 열려 있는 동안 휠을 굴려도 뒤 화면이 스크롤되지 않는다', await page.evaluate(() => window.scrollY), 열었을때위치);
  });
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 모달 } from './components/feedback.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 회원가입화면 } from './pages/common-signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-511',
  name: '모달이 열려 있는 동안 뒤 화면은 스크롤되지 않는다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 가입 = new 회원가입화면(page);
  const 약관모달 = new 모달(page);

  await test.step('회원가입 화면을 연다', async () => {
    await 안내창끄기(page);
    await page.setViewportSize({ width: 1280, height: 500 });
    await 가입.열기();
    await verify('비회원이다', await 가입.머리글.로그인링크.isVisible(), true, { blocker: true });
  });

  await test.step('회원가입 화면에서 약관 「보기」를 누르고 마우스 휠로 화면을 내린다', async () => {
    await 가입.이용약관보기버튼.click();
    await 약관모달.열림기다리기();
    await page.mouse.move(10, 250);
    const 내리기전 = await 가입.세로위치();
    await page.mouse.wheel(0, 600);
    await page.evaluate(() => new Promise<void>((끝) => requestAnimationFrame(() => requestAnimationFrame(() => 끝()))));
    await verify('모달이 열려 있는 동안 뒤 화면은 스크롤되지 않는다', await 가입.세로위치(), 내리기전);
  });

  await test.step('모달의 「확인」으로 모달을 닫는다', async () => {
    await 약관모달.버튼('확인').click();
    await 약관모달.닫힘기다리기();
    await verify('모달이 닫히면 초점이 모달을 연 「보기」 버튼으로 돌아간다', await 가입.초점이이용약관보기에있나(), true);
  });
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-106',
  name: '「전체 동의」를 켜면 약관 셋이 모두 켜진다',
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 화면 = new 회원가입화면(page);

  await test.step('「전체 동의」를 켠다', async () => {
    await 안내창끄기(page);
    await 화면.열기();
    await verify('회원가입 화면 제목이 보인다', await 화면.제목.isVisible(), true, { blocker: true });
    await 화면.전체동의.check();
    await verify(
      '「전체 동의」를 켜면 약관 셋이 모두 켜진다',
      [await 화면.이용약관동의.isChecked(), await 화면.개인정보동의.isChecked(), await 화면.마케팅동의.isChecked()],
      [true, true, true],
    );
  });

  await test.step('「(선택) 마케팅 수신 동의」를 끈다', async () => {
    await 화면.마케팅동의.uncheck();
    await verify('약관 하나를 끄면 「전체 동의」도 꺼진다', await 화면.전체동의.isChecked(), false);
  });
});

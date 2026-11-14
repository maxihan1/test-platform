import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 암호재설정화면 } from './pages/password-reset.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-958',
  name: '암호 재설정 화면에서 이메일을 비우고 누르면 로그인 화면으로 가고 「비밀번호 복구 링크를 받을 수 있습니다」가 든 안내가 보인다',
  precondition: ['비회원이다'],
  techniques: ['오류 추정'],
  params: z.object({}),
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 암호재설정화면(page);

  await test.step('암호 재설정 화면을 연다', async () => {
    await 한국어로(page);
    await 화면.열기();
    await verify('암호 재설정 화면에 「암호 재설정」 버튼이 보인다', await 화면.보내기.isVisible(), true, { blocker: true });
  });

  await test.step('암호 재설정 화면에서 이메일을 비우고 「암호 재설정」을 누른다', async () => {
    await 화면.보내기누르기('');
    const 안내 = 화면.결과안내.filter({ hasText: '비밀번호 복구 링크를 받을 수 있습니다' });
    const 떴다 = await 안내.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    const 로그인화면 = await verify('로그인 화면 주소로 옮겨 간다', new URL(page.url()).pathname, '/auth/sign_in');
    const 문구 = await verify('「비밀번호 복구 링크를 받을 수 있습니다」가 든 안내가 뜬다', 떴다, true);
    await verify('암호 재설정 화면에서 이메일을 비우고 누르면 로그인 화면으로 가고 「비밀번호 복구 링크를 받을 수 있습니다」가 든 안내가 보인다', 로그인화면 && 문구, true);
  });
});

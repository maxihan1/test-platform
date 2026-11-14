import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 확인링크재전송화면 } from './pages/confirmation.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-957',
  name: '확인 링크 다시 보내기 화면에서 이메일을 비우고 누르면 로그인 화면으로 가고 「이메일 주소가 저희 데이터베이스에 있는 경우」로 시작하는 안내가 보인다',
  precondition: ['비회원이다'],
  techniques: ['오류 추정'],
  params: z.object({}),
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 확인링크재전송화면(page);

  await test.step('확인 링크 다시 보내기 화면을 연다', async () => {
    await 한국어로(page);
    await 화면.열기();
    await verify('확인 링크 다시 보내기 화면에 「확인 링크 다시 보내기」 버튼이 보인다', await 화면.보내기.isVisible(), true, { blocker: true });
  });

  await test.step('확인 링크 다시 보내기 화면에서 이메일을 비우고 「확인 링크 다시 보내기」를 누른다', async () => {
    await 화면.보내기누르기('');
    const 안내 = 화면.결과안내.filter({ hasText: '이메일 주소가 저희 데이터베이스에 있는 경우' });
    const 떴다 = await 안내.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    const 로그인화면 = await verify('로그인 화면 주소로 옮겨 간다', new URL(page.url()).pathname, '/auth/sign_in');
    const 문구 = await verify('「이메일 주소가 저희 데이터베이스에 있는 경우」가 든 안내가 뜬다', 떴다, true);
    await verify('확인 링크 다시 보내기 화면에서 이메일을 비우고 누르면 로그인 화면으로 가고 「이메일 주소가 저희 데이터베이스에 있는 경우」로 시작하는 안내가 보인다', 로그인화면 && 문구, true);
  });
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 내계정API } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-014',
  name: '로그인 후 왼쪽 열에 「검색하거나 URL 붙여넣기」 입력칸과 표시 이름 · @핸들이 든 프로필 카드가 보인다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);

  await test.step('일반 회원으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await verify('로그인 후 오른쪽 메뉴에 「홈」이 보인다', await 홈.메뉴.링크(/^홈/).waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });

  await test.step('홈을 연다', async () => {
    await 홈.열기();
    const 나 = await 내계정API(page);
    const 검색 = await verify('왼쪽 열에 「검색하거나 URL 붙여넣기」 입력칸이 보인다', await 홈.검색칸.isVisible(), true);
    const 이름 = await verify('프로필 카드에 표시 이름이 보인다', await 홈.카드표시이름(나.display_name).isVisible(), true);
    const 핸들 = await verify('프로필 카드에 @핸들이 보인다', await 홈.카드핸들(나.acct).isVisible(), true);
    await verify('로그인 후 왼쪽 열에 「검색하거나 URL 붙여넣기」 입력칸과 표시 이름 · @핸들이 든 프로필 카드가 보인다', 검색 && 이름 && 핸들, true);
  });
});

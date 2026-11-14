import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 설정화면 } from './pages/settings-menu.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-023',
  name: '설정 화면에서 「환경설정」을 열면 하위 메뉴 「외관」이 펼쳐진다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 설정 = new 설정화면(page);

  await test.step('일반 회원으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await verify('로그인 후 오른쪽 메뉴에 「홈」이 보인다', await 홈.메뉴.링크(/^홈/).waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });

  await test.step('설정 화면을 연다', async () => {
    await 설정.열기();
    await verify('설정 화면 왼쪽 메뉴에 「환경설정」이 보인다', await 설정.환경설정.isVisible(), true, { blocker: true });
  });

  await test.step('설정 화면에서 「환경설정」을 연다', async () => {
    await 설정.환경설정열기();
    await verify('설정 화면에서 「환경설정」을 열면 하위 메뉴 「외관」이 펼쳐진다', await 설정.외관.isVisible(), true);
    await verify('「계정」 구획의 하위 메뉴 「2단계 인증」은 보이지 않는다', await 설정.이단계인증.isVisible(), false);
  });
});

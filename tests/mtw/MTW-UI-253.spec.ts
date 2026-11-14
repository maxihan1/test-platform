import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 계정설정화면 } from './pages/account-settings.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-253',
  name: '「새로운 애플리케이션」 화면에 이름 · 웹사이트 · 「콜백 URL」 · 「범위」 · 「제출」이 보인다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});
test(spec, async ({ page, params }) => {
  const 설정 = new 계정설정화면(page);

  await test.step('일반 회원으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
  });

  await test.step('개발 > 「새로운 애플리케이션」 화면을 연다', async () => {
    await 설정.열기('/settings/applications/new');
    const 이름 = await verify('이름 칸이 보인다', await 설정.칸(/이름/).isVisible(), true);
    const 사이트 = await verify('웹사이트 칸이 보인다', await 설정.칸(/웹사이트/).isVisible(), true);
    const 콜백 = await verify('「콜백 URL」이 보인다', await 설정.글('콜백 URL').isVisible(), true);
    const 범위 = await verify('「범위」가 보인다', await 설정.글(/^범위/).isVisible(), true);
    const 제출 = await verify('「제출」이 보인다', await 설정.버튼('제출').isVisible(), true);
    await verify('「새로운 애플리케이션」 화면에 이름 · 웹사이트 · 「콜백 URL」 · 「범위」 · 「제출」이 보인다', 이름 && 사이트 && 콜백 && 범위 && 제출, true);
  });
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 계정설정화면 } from './pages/set-account.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-391',
  name: '설정 「계정」에 로그인된 계정마다 @이름@도메인 줄이 보이고 누르면 계정 설정이 열린다',
  platforms: ['android'],
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 설정 = new 설정화면(driver);
  const 계정설정 = new 계정설정화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('홈에서 설정을 연다', async () => {
    await verify('설정 화면에 「계정 추가...」 줄이 보인다', await 설정.열기(), true, { blocker: true });
  });
  await test.step('설정 「계정」의 계정 줄을 누른다', async () => {
    const 줄 = await verify('설정 「계정」에 「@이름@도메인」 꼴 줄이 보인다', (await 설정.계정줄글들()).length > 0, true);
    await 설정.계정줄누르기();
    const 열림 = await verify('계정 설정이 열린다', await 계정설정.떴나(), true);
    await verify('설정 「계정」에 로그인된 계정마다 @이름@도메인 줄이 보이고 누르면 계정 설정이 열린다', 줄 && 열림, true);
  }, { capture: true });
});

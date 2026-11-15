import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 확인창 } from './components/dialog.component.js';
import { 앱링크열기, 계정추가로그인 } from './helpers/signup-flow.helper.js';
import { 계정줄 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-523',
  name: '계정이 둘일 때 공유받기로 들어오면 「계정 선택」 창에 두 계정이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    secondId: z.string().describe('두 번째 사용자 아이디').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 비밀번호').optional().meta({ secret: true, account: '두 번째 사용자' }),
    공유할글: z.string().describe('공유 주소 text 뒤에 붙일 글').default('안녕'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 창 = new 확인창(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('계정 둘인 앱에 공유받기로 들어온다', async () => {
    await 계정추가로그인(driver, params.secondId, params.secondPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    await 앱링크열기(driver, `mastodon://share?text=${encodeURIComponent(params.공유할글)}`);
    const 제목 = await verify('「계정 선택」 창이 보인다', await 뜰때까지(driver, 창.안의글자('계정 선택'), 10_000), true);
    const 첫계정 = await verify('일반 회원 계정 줄이 보인다', await 뜰때까지(driver, 창.안의글자(계정줄(params.loginId ?? '')), 10_000), true);
    const 둘째계정 = await verify('두 번째 사용자 계정 줄이 보인다', await 뜰때까지(driver, 창.안의글자(계정줄(params.secondId ?? '')), 10_000), true);
    await verify('계정이 둘일 때 공유받기로 들어오면 「계정 선택」 창에 두 계정이 보인다', 제목 && 첫계정 && 둘째계정, true);
  });
});

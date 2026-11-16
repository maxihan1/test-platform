import { defineCase, test, verify } from '@platform/kit';
import { 될때까지, 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 확인창 } from './components/dialog.component.js';
import { 앱링크열기, 앱화면떠있나 } from './helpers/signup-flow.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 글쓰기화면 } from './pages/compose.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-528',
  name: '공유받기로 연 글쓰기를 닫으면 앱 화면이 사라진다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    공유할글: z.string().describe('공유 주소 text 뒤에 붙일 글').default('안녕'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 글쓰기 = new 글쓰기화면(driver);
  const 창 = new 확인창(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('공유받기로 연 글쓰기를 닫는다', async () => {
    await 앱링크열기(driver, `mastodon://share?text=${encodeURIComponent(params.공유할글)}`);
    await verify('글쓰기 본문 칸이 보인다', await 글쓰기.그려질때까지(), true, { blocker: true });
    await driver.$(글쓰기.닫기).click();
    if (await 뜰때까지(driver, 창.확인버튼, 3_000)) await 창.확인();
    await verify('공유받기로 연 글쓰기를 닫으면 앱 화면이 사라진다', await 될때까지(driver, async () => !(await 앱화면떠있나(driver)), 10_000), true);
  });
});

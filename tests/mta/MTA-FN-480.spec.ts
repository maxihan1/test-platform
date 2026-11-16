import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지, 될때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정줄 } from './helpers/app.helper.js';
import { 홈으로 } from './helpers/nav.helper.js';
import { 설정줄열기, 계정설정열기 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-480',
  name: '프라이버시 스위치를 바꾸고 화면을 나갔다 다시 열면 바꾼 값이 그대로 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['프로필 고쳐도 되는 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('프로필 고쳐도 되는 계정 아이디').optional().meta({ secret: true, account: '프로필 고쳐도 되는 계정' }),
    loginPassword: z.string().describe('프로필 고쳐도 되는 계정 비밀번호').optional().meta({ secret: true, account: '프로필 고쳐도 되는 계정' }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 설정 = new 설정화면(driver);
  let 원래값 = false;
  let 바꿈 = false;
  try {
    await test.step('프로필 고쳐도 되는 계정으로 로그인해 홈 화면을 연다', async () => {
      await 로그인하기(driver, params.loginId, params.loginPassword);
      await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    });
    await test.step('계정 설정을 연다', async () => {
      await verify('계정 설정이 열린다', await 계정설정열기(driver, 계정줄(params.loginId ?? '')), true, { blocker: true });
    });
    await test.step('「공개 게시물을 검색 결과에 포함시키기」를 바꾸고 화면을 다시 연다', async () => {
      await verify('「프라이버시와 노출 범위」가 열린다', await 설정줄열기(driver, '프라이버시와 노출 범위'), true, { blocker: true });
      원래값 = await 설정.켜졌나(1);
      await 설정.스위치바꾸기(1);
      바꿈 = true;
      await verify('스위치가 바뀐다', await 될때까지(driver, async () => (await 설정.켜졌나(1)) !== 원래값, 10_000), true, { blocker: true });
      await driver.back();
      await verify('계정 설정으로 돌아온다', await 뜰때까지(driver, 설정.굴려서줄('프라이버시와 노출 범위'), 10_000), true, { blocker: true });
      await verify('「프라이버시와 노출 범위」가 다시 열린다', await 설정줄열기(driver, '프라이버시와 노출 범위'), true, { blocker: true });
      await verify('프라이버시 스위치를 바꾸고 화면을 나갔다 다시 열면 바꾼 값이 그대로 보인다', await 설정.켜졌나(1), !원래값);
    });
  } finally {
    if (바꿈) {
      await 홈으로(driver);
      await 계정설정열기(driver, 계정줄(params.loginId ?? ''));
      await 설정줄열기(driver, '프라이버시와 노출 범위');
      if ((await 설정.켜졌나(1)) !== 원래값) await 설정.스위치바꾸기(1);
      await 될때까지(driver, async () => (await 설정.켜졌나(1)) === 원래값, 10_000);
    }
  }
});

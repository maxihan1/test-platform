import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 확인창 } from './components/dialog.component.js';
import { 머리항목지우기, 항목라벨머리, 항목삭제창열기, 항목더하기, 항목정리, 항목화면열기 } from './helpers/profile-edit-flow.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';
import { 프로필편집화면 } from './pages/profile-edit.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-411',
  name: '프로필 항목 삭제를 누르면 「Delete field?」가 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['프로필 고쳐도 되는 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('프로필 고쳐도 되는 계정 아이디').optional().meta({ secret: true, account: '프로필 고쳐도 되는 계정' }),
    loginPassword: z.string().describe('프로필 고쳐도 되는 계정 비밀번호').optional().meta({ secret: true, account: '프로필 고쳐도 되는 계정' }),
  }),
  expected: z.object({
    묻는글: z.string().describe('항목 삭제 확인 창에 보이는 글').default('Delete field?'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);
  const 편집 = new 프로필편집화면(driver);
  const 창 = new 확인창(driver);
  const 라벨 = `${항목라벨머리} 삭제`;
  const 더한라벨: string[] = [];

  await test.step('프로필 고쳐도 되는 계정으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('내 프로필에서 「프로필 편집」을 연다', async () => {
    await 홈.탭.누르기('프로필');
    await verify('내 프로필 화면이 그려진다', await 프로필.그려질때까지(), true, { blocker: true });
    await 프로필.동작누르기();
    await verify('프로필 편집 화면이 그려진다', await 편집.그려질때까지(), true, { blocker: true });
  });

  try {
    await test.step('프로필 편집에서 「Custom fields」를 연다', async () => {
      await verify('「Custom fields」 화면이 열린다', await 항목화면열기(driver), true, { blocker: true });
      await 머리항목지우기(driver);
    });

    await test.step('「Add field」로 지울 항목을 하나 더한다', async () => {
      더한라벨.push(라벨);
      await verify('더한 항목 줄이 보인다', await 항목더하기(driver, 라벨), true, { blocker: true });
    });

    await test.step('프로필 항목 하나를 지운다', async () => {
      await 항목삭제창열기(driver, 라벨);
      await verify('프로필 항목 삭제를 누르면 「Delete field?」가 보인다', await 뜰때까지(driver, 창.안의글자(expected.묻는글), 10_000), true);
    });
  } finally {
    await 항목정리(driver, 더한라벨);
  }
});

import { defineCase, test, verify } from '@platform/kit';
import { 끌어놓기, 될때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 머리항목지우기, 항목라벨머리, 항목더하기, 항목정리, 항목화면열기 } from './helpers/profile-edit-flow.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';
import { 프로필편집화면 } from './pages/profile-edit.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-412',
  name: '프로필 첫 항목 손잡이를 둘째 자리로 끌면 두 항목의 순서가 바뀐다',
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
  const 프로필 = new 프로필화면(driver);
  const 편집 = new 프로필편집화면(driver);
  const 첫라벨 = `${항목라벨머리} 가`;
  const 둘째라벨 = `${항목라벨머리} 나`;
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

    await test.step('「Add field」로 두 항목을 차례로 더한다', async () => {
      const 앞 = (await 편집.목록제목글들()).length;
      await verify('항목을 두 개 더할 자리가 있다', 앞 <= 2, true, { blocker: true });
      더한라벨.push(첫라벨, 둘째라벨);
      await verify('첫 항목 줄이 보인다', await 항목더하기(driver, 첫라벨), true, { blocker: true });
      await verify('둘째 항목 줄이 보인다', await 항목더하기(driver, 둘째라벨), true, { blocker: true });
    });

    await test.step('프로필 항목 손잡이를 끌어 순서를 바꾼다', async () => {
      const 전 = await 편집.목록제목글들();
      const 첫 = 전[0];
      const 둘째 = 전[1];
      if (첫 === undefined || 둘째 === undefined) throw new Error('프로필 항목이 둘보다 적어 순서를 못 바꾼다');
      await 끌어놓기(driver, 편집.항목손잡이, 편집.항목도움말);
      await verify(
        '프로필 첫 항목 손잡이를 둘째 자리로 끌면 두 항목의 순서가 바뀐다',
        await 될때까지(
          driver,
          async () => {
            const 후 = await 편집.목록제목글들();
            return 후.indexOf(둘째) >= 0 && 후.indexOf(둘째) < 후.indexOf(첫);
          },
          10_000,
        ),
        true,
      );
    });
  } finally {
    await 항목정리(driver, 더한라벨);
  }
});

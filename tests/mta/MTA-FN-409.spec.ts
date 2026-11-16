import { defineCase, test, verify } from '@platform/kit';
import { 보이나, 사라질때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 머리항목지우기, 항목수맞추기, 항목정리, 항목화면열기 } from './helpers/profile-edit-flow.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';
import { 프로필편집화면 } from './pages/profile-edit.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-409',
  name: '프로필 항목이 3개면 「Add field」가 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  techniques: ['경계값 분석'],
  precondition: ['프로필 고쳐도 되는 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('프로필 고쳐도 되는 계정 아이디').optional().meta({ secret: true, account: '프로필 고쳐도 되는 계정' }),
    loginPassword: z.string().describe('프로필 고쳐도 되는 계정 비밀번호').optional().meta({ secret: true, account: '프로필 고쳐도 되는 계정' }),
    안쪽항목수: z.number().int().min(1).describe('「Add field」가 보여야 하는 항목 수(경계 안쪽)').default(3),
    바깥항목수: z.number().int().min(1).describe('「Add field」가 사라지는 항목 수(경계 바깥)').default(4),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);
  const 편집 = new 프로필편집화면(driver);
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

    await test.step('프로필 항목을 3개로 맞춘다', async () => {
      await verify('프로필 항목을 3개로 맞출 수 있다', await 항목수맞추기(driver, params.안쪽항목수, 더한라벨), true, { blocker: true });
      await verify('프로필 항목이 3개면 「Add field」가 보인다', await 보이나(driver, 편집.항목추가), true);
    });

    await test.step('프로필 항목을 4개로 맞춘다', async () => {
      await verify('프로필 항목을 4개로 맞출 수 있다', await 항목수맞추기(driver, params.바깥항목수, 더한라벨), true, { blocker: true });
      await verify('「Add field」가 보이지 않는다', await 사라질때까지(driver, 편집.항목추가, 10_000), true);
    });
  } finally {
    await 항목정리(driver, 더한라벨);
  }
});

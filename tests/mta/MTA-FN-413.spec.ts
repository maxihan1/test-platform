import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리항목지우기, 항목라벨머리, 항목더하기, 항목정리, 항목화면열기 } from './helpers/profile-edit-flow.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';
import { 프로필편집화면 } from './pages/profile-edit.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-413',
  name: '프로필 항목 값에 255자를 적고 저장하면 오류 없이 저장된다',
  platforms: ['android'],
  precondition: ['프로필 고쳐도 되는 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('프로필 고쳐도 되는 계정 아이디').optional().meta({ secret: true, account: '프로필 고쳐도 되는 계정' }),
    loginPassword: z.string().describe('프로필 고쳐도 되는 계정 비밀번호').optional().meta({ secret: true, account: '프로필 고쳐도 되는 계정' }),
    값글자수: z.number().int().min(1).describe('항목 값에 적는 글자 수').default(255),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);
  const 편집 = new 프로필편집화면(driver);
  const 라벨 = `${항목라벨머리} 긴값`;
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
      await verify('항목을 더할 자리가 있다', (await 편집.목록제목글들()).length < 4, true, { blocker: true });
    });

    await test.step('프로필 항목 값에 255자를 적고 저장한다', async () => {
      더한라벨.push(라벨);
      await verify('프로필 항목 값에 255자를 적고 저장하면 오류 없이 저장된다', await 항목더하기(driver, 라벨, 'a'.repeat(params.값글자수)), true);
    });
  } finally {
    await 항목정리(driver, 더한라벨);
  }
});

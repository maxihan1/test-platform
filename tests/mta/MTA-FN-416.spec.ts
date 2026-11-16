import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 확인창 } from './components/dialog.component.js';
import { 머리해시태그지우기, 소개해시태그화면열기, 해시태그더하기, 해시태그정리, 해시태그지우기창열기 } from './helpers/profile-edit-flow.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';
import { 프로필편집화면 } from './pages/profile-edit.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-416',
  name: '「Add hashtag」로 더한 해시태그 줄을 지우면 「Remove hashtag?」가 보인다',
  platforms: ['android'],
  precondition: ['프로필 고쳐도 되는 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('프로필 고쳐도 되는 계정 아이디').optional().meta({ secret: true, account: '프로필 고쳐도 되는 계정' }),
    loginPassword: z.string().describe('프로필 고쳐도 되는 계정 비밀번호').optional().meta({ secret: true, account: '프로필 고쳐도 되는 계정' }),
    태그: z.string().min(1).describe('더할 해시태그 — tcfeat 로 시작해야 앞 실행이 남긴 것을 지운다').default('tcfeat01'),
  }),
  expected: z.object({
    묻는글: z.string().describe('해시태그 지우기 확인 창에 보이는 글').default('Remove hashtag?'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);
  const 편집 = new 프로필편집화면(driver);
  const 창 = new 확인창(driver);
  const 더한태그: string[] = [];

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
    await test.step('프로필 편집에서 「Featured hashtags」를 연다', async () => {
      await verify('「Featured hashtags」 화면이 열린다', await 소개해시태그화면열기(driver), true, { blocker: true });
      await 머리해시태그지우기(driver);
    });

    await test.step('「Add hashtag」로 해시태그를 더하고 지운다', async () => {
      더한태그.push(params.태그);
      await verify('더한 해시태그 줄이 보인다', await 해시태그더하기(driver, params.태그), true, { blocker: true });
      await 해시태그지우기창열기(driver, params.태그);
      await verify('「Add hashtag」로 더한 해시태그 줄을 지우면 「Remove hashtag?」가 보인다', await 뜰때까지(driver, 창.안의글자(expected.묻는글), 10_000), true);
    });
  } finally {
    await 해시태그정리(driver, 더한태그);
  }
});

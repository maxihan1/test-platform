import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 글이될때까지읽기 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';
import { 프로필편집화면 } from './pages/profile-edit.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-350',
  name: '「Profile tab settings」에 「‘Media’ tab」 · 「Include replies」 · 「‘Featured’ tab」 스위치와 「These settings customize what users see on mastodon.maxihan.com」으로 시작하는 안내가 보인다',
  platforms: ['android'],
  precondition: ['프로필 고쳐도 되는 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('프로필 고쳐도 되는 계정 아이디').optional().meta({ secret: true, account: '프로필 고쳐도 되는 계정' }),
    loginPassword: z.string().describe('프로필 고쳐도 되는 계정 비밀번호').optional().meta({ secret: true, account: '프로필 고쳐도 되는 계정' }),
  }),
  expected: z.object({
    미디어줄: z.string().describe('탭 설정 줄 이름').default('‘Media’ tab'),
    답글줄: z.string().describe('탭 설정 줄 이름').default('Include replies'),
    추천줄: z.string().describe('탭 설정 줄 이름').default('‘Featured’ tab'),
    스위치수: z.number().int().describe('탭 설정 스위치 수').default(3),
    안내시작: z.string().describe('탭 설정 하단 안내의 시작 글').default('These settings customize what users see on mastodon.maxihan.com'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);
  const 편집 = new 프로필편집화면(driver);
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
  await test.step('프로필 편집 「Profile tab settings」를 연다', async () => {
    await 편집.줄누르기('Profile tab settings');
    await verify('「Profile tab settings」 화면이 열린다', await 글이될때까지읽기(driver, 편집.제목, 'Profile tab settings'), 'Profile tab settings', { blocker: true });
    const 미디어 = await verify('탭 설정에 「‘Media’ tab」이 보인다', await 뜰때까지(driver, 편집.줄(expected.미디어줄), 10_000), true);
    const 답글 = await verify('탭 설정에 「Include replies」가 보인다', await 뜰때까지(driver, 편집.줄(expected.답글줄), 10_000), true);
    const 추천 = await verify('탭 설정에 「‘Featured’ tab」이 보인다', await 뜰때까지(driver, 편집.줄(expected.추천줄), 10_000), true);
    const 스위치 = await verify('탭 설정 스위치 수가 기대값과 같다', (await driver.$$(편집.탭설정스위치들).getElements()).length, expected.스위치수);
    const 안내 = await verify('탭 설정 하단에 「These settings customize what users see on mastodon.maxihan.com」으로 시작하는 안내가 보인다', await 뜰때까지(driver, 편집.줄포함(expected.안내시작), 10_000), true);
    await verify('「Profile tab settings」에 「‘Media’ tab」 · 「Include replies」 · 「‘Featured’ tab」 스위치와 「These settings customize what users see on mastodon.maxihan.com」으로 시작하는 안내가 보인다', 미디어 && 답글 && 추천 && 스위치 && 안내, true);
  });
});

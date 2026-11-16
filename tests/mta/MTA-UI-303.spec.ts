import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글읽기 } from './helpers/app.helper.js';
import { 프로필열기 } from './helpers/nav.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-303',
  name: '프로필 머리에 헤더 이미지 · 아바타 · 표시 이름 · 「@hana_photo@mastodon.maxihan.com」이 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    계정글: z.string().describe('프로필 머리의 계정').default('@hana_photo@mastodon.maxihan.com'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);
  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });
  await test.step('hana_photo 프로필을 연다', async () => {
    await 프로필열기(driver, 'hana_photo');
    const 헤더 = await verify('프로필 머리에 헤더 이미지가 보인다', await 뜰때까지(driver, 프로필.헤더이미지, 10_000), true);
    const 아바타 = await verify('프로필 머리에 아바타가 보인다', await 뜰때까지(driver, 프로필.아바타, 10_000), true);
    const 이름 = await verify('프로필 머리에 표시 이름이 보인다', await 뜰때까지(driver, 프로필.이름, 10_000), true);
    const 계정 = await verify('프로필 머리의 계정이 기대값과 같다', await 글읽기(driver, 프로필.계정), expected.계정글);
    await verify('프로필 머리에 헤더 이미지 · 아바타 · 표시 이름 · 「@hana_photo@mastodon.maxihan.com」이 보인다', 헤더 && 아바타 && 이름 && 계정, true);
  });
});

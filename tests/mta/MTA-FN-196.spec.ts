import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 확인창 } from './components/dialog.component.js';
import { 문구가보이나, 프로필열기 } from './helpers/app.helper.js';
import { 설정스위치바꾸기, 설정줄열기, 프로필버튼누르기, 홈탭으로 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-196',
  name: '설정 「누군가를 언팔로우할 때 묻기」를 켜고 hana_photo 프로필에서 「팔로우 해제」를 누르면 설정 「누군가를 언팔로우할 때 묻기」가 켜져 있을 때만 팔로우 해제 확인 창 「<이름> 님을 언팔로우 할까요?」가 뜬다',
  platforms: ['android'],
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 확인 = new 확인창(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  try {
    await test.step('설정 「누군가를 언팔로우할 때 묻기」를 켜고 hana_photo 프로필에서 「팔로우 해제」를 누른다', async () => {
      await 설정줄열기(driver, ['동작']);
      await 설정스위치바꾸기(driver, '누군가를 언팔로우할 때 묻기', true);
      await 홈탭으로(driver);
      await 프로필열기(driver, 'hana_photo');
      await 프로필버튼누르기(driver);
      await verify('설정 「누군가를 언팔로우할 때 묻기」를 켜고 hana_photo 프로필에서 「팔로우 해제」를 누르면 설정 「누군가를 언팔로우할 때 묻기」가 켜져 있을 때만 팔로우 해제 확인 창 「<이름> 님을 언팔로우 할까요?」가 뜬다', await 문구가보이나(driver, '<이름> 님을 언팔로우 할까요?'), true);
    }, { capture: true });
  } finally {
    if (await 확인.떴나(2_000)) await 확인.취소누르기();
    await 홈탭으로(driver);
    await 설정줄열기(driver, ['동작']);
    await 설정스위치바꾸기(driver, '누군가를 언팔로우할 때 묻기', false);
    await 홈탭으로(driver);
  }
});

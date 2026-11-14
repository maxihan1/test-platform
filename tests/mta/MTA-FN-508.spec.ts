import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 계정설정화면 } from './pages/set-account.page.js';
import { 게시기본값화면 } from './pages/set-posting.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-508',
  name: '「공개 범위」(인용 가능한 사용자)는 「모든 사용자」 · 「팔로워만」 · 「본인만」 가운데 고르고 게시 범위가 팔로워면 잠긴다',
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
  const 설정 = new 설정화면(driver);
  const 계정설정 = new 계정설정화면(driver);
  const 게시 = new 게시기본값화면(driver);
  let 바꿈 = false;

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('설정에서 게시 기본값을 연다', async () => {
    await 설정.열기();
    await 설정.계정줄누르기();
    await 계정설정.줄누르기('게시 기본값');
    await verify('게시 기본값 화면에 「게시 범위」 줄이 보인다', await 게시.떴나(), true, { blocker: true });
  });
  try {
    await test.step('게시 기본값에서 「게시 범위」를 「팔로워」로 고른다', async () => {
      await 게시.줄누르기('공개 범위');
      const 모두 = await verify('「공개 범위」 선택지에 「모든 사용자」가 있다', (await 게시.글자수('모든 사용자')) >= 2, true);
      const 팔로워만 = await verify('「공개 범위」 선택지에 「팔로워만」이 있다', await 게시.선택지보이나('팔로워만'), true);
      const 본인만 = await verify('「공개 범위」 선택지에 「본인만」이 있다', await 게시.선택지보이나('본인만'), true);
      await 게시.뒤로가기();
      await 게시.줄누르기('게시 범위');
      await 게시.선택지고르기('팔로워');
      바꿈 = true;
      await 게시.줄누르기('공개 범위');
      const 잠김 = await verify('「공개 범위」 줄이 잠겨 선택 창이 뜨지 않는다', await 게시.창이안뜨나('본인만'), true);
      await verify('「공개 범위」(인용 가능한 사용자)는 「모든 사용자」 · 「팔로워만」 · 「본인만」 가운데 고르고 게시 범위가 팔로워면 잠긴다', 모두 && 팔로워만 && 본인만 && 잠김, true);
    }, { capture: true });
  } finally {
    if (바꿈) {
      await 게시.줄누르기('게시 범위');
      await 게시.선택지고르기('공개');
      await 게시.뒤로가기();
    }
  }
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 작성화면 } from './pages/publish.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-343',
  name: '잠기지 않은 계정이 공개 범위를 「팔로워」로 고르면 「이 계정은 비공개상태가 아닙니다. 누구나 이 계정을 팔로우 하여 팔로워 전용의 게시물을 볼 수 있습니다.」 경고가 보인다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 글쓰기 = new 작성화면(page);

  await test.step('일반 회원으로 로그인하고 홈을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 홈.열기();
    await verify('홈에 작성 상자가 보인다', await 홈.작성.본문.isVisible(), true, { blocker: true });
  });

  await test.step('작성 상자 공개 범위를 「팔로워」로 고른다', async () => {
    await 글쓰기.공개범위바꾸고저장('팔로워');
    const 떴다 = await 글쓰기.비공개경고.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify(
      '잠기지 않은 계정이 공개 범위를 「팔로워」로 고르면 「이 계정은 비공개상태가 아닙니다. 누구나 이 계정을 팔로우 하여 팔로워 전용의 게시물을 볼 수 있습니다.」 경고가 보인다',
      떴다,
      true,
    );
  });
});

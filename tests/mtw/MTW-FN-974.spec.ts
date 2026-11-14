import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 가짜응답, type 풀기 as 풀기타입 } from './helpers/mock.helper.js';
import { 팔로우요청화면 } from './pages/follow-requests.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-974',
  name: '팔로우 요청이 없을 때 팔로우 요청 화면을 열면 「아직 팔로우 요청이 없습니다. 요청을 받았을 때 여기에 나타납니다.」가 보인다',
  techniques: ['경계값 분석'],
  precondition: ['팔로우 요청 응답은 가짜 응답(모킹)이다', '일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 팔로우요청화면(page);
  let 풀기값: 풀기타입 | undefined;

  await test.step('일반 회원으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 화면.열기();
    await verify('팔로우 요청 화면에 「팔로우 요청」 제목이 보인다', await 화면.제목.isVisible(), true, { blocker: true });
  });

  try {
    await test.step('팔로우 요청이 없을 때 팔로우 요청 화면을 연다', async () => {
      풀기값 = await 가짜응답(page, /\/api\/v1\/follow_requests/, { 상태: 200, 본문: [] });
      await 화면.열기();
      const 보인다 = await 화면.빈안내.waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('팔로우 요청이 없을 때 팔로우 요청 화면을 열면 「아직 팔로우 요청이 없습니다. 요청을 받았을 때 여기에 나타납니다.」가 보인다', 보인다, true);
    });
  } finally {
    if (풀기값 !== undefined) await 풀기값();
  }
});

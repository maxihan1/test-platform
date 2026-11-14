import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 가짜응답, type 풀기 as 풀기타입 } from './helpers/mock.helper.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-972',
  name: '글이 없는 프로필을 열면 「이곳에는 게시물이 없습니다!」가 보인다',
  techniques: ['경계값 분석'],
  precondition: ['프로필 글 목록 응답은 가짜 응답(모킹)이다', '일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 프로필 = new 프로필화면(page);
  let 풀기값: 풀기타입 | undefined;

  await test.step('일반 회원으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 프로필.메뉴.그려질때까지();
    await verify('왼쪽 메뉴에 「홈」 링크가 보인다', await 프로필.메뉴.링크('홈').isVisible(), true, { blocker: true });
  });

  try {
    await test.step('글이 없는 프로필을 연다', async () => {
      풀기값 = await 가짜응답(page, /\/api\/v1\/accounts\/\d+\/statuses/, { 상태: 200, 본문: [] });
      await 프로필.열기('hana_photo');
      const 보인다 = await 프로필.게시물없음.waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('글이 없는 프로필을 열면 「이곳에는 게시물이 없습니다!」가 보인다', 보인다, true);
    });
  } finally {
    if (풀기값 !== undefined) await 풀기값();
  }
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 가짜응답, type 풀기 } from './helpers/mock.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 작성화면 } from './pages/publish.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-992',
  name: '처리 중인 파일을 붙여 게시하면 「처리가 끝나지 않은 파일은 첨부할 수 없습니다. 잠시 후에 다시 시도해 주세요!」가 보인다',
  techniques: ['동등 분할'],
  precondition: ['글 게시 응답은 가짜 응답(모킹)이다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 글쓰기 = new 작성화면(page);
  let 풀기함수: 풀기 | undefined;

  await test.step('일반 회원으로 로그인하고 홈을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 홈.열기();
    await verify('홈에 작성 상자가 보인다', await 홈.작성.본문.isVisible(), true, { blocker: true });
  });

  try {
    await test.step('처리 중인 파일을 붙인 글을 게시한다', async () => {
      풀기함수 = await 가짜응답(page, /\/api\/v1\/statuses$/, {
        상태: 422,
        본문: { error: '처리가 끝나지 않은 파일은 첨부할 수 없습니다. 잠시 후에 다시 시도해 주세요!' },
      });
      await 홈.작성.쓰기('처리 중인 파일 확인 글');
      await 글쓰기.게시해보기();
      const 떴다 = await 글쓰기.알림.글('처리가 끝나지 않은 파일은 첨부할 수 없습니다. 잠시 후에 다시 시도해 주세요!').first().waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('처리 중인 파일을 붙여 게시하면 「처리가 끝나지 않은 파일은 첨부할 수 없습니다. 잠시 후에 다시 시도해 주세요!」가 보인다', 떴다, true);
    });
  } finally {
    if (풀기함수 !== undefined) await 풀기함수();
  }
});

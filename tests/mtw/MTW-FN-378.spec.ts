import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글지우기API } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 작성화면 } from './pages/publish.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-378',
  name: '본문 · 첨부 · 투표가 모두 비었을 때 「게시」를 누르면 게시가 막히거나 「빈 게시물은 게시할 수 없습니다.」가 뜬다',
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
  let 글번호: string | undefined;

  await test.step('일반 회원으로 로그인하고 홈을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 홈.열기();
    await verify('홈에 작성 상자가 보인다', await 홈.작성.본문.isVisible(), true, { blocker: true });
  });

  try {
    await test.step('빈 작성 상자에서 「게시」를 누른다', async () => {
      const 결과 = await 글쓰기.게시해보기();
      글번호 = 결과.글번호;
      const 안내 = await 글쓰기.알림.글('빈 게시물은 게시할 수 없습니다.').first().waitFor({ timeout: 3_000 }).then(() => true, () => false);
      const 막힘 = await 글쓰기.게시버튼.isDisabled();
      await verify('본문 · 첨부 · 투표가 모두 비었을 때 「게시」를 누르면 게시가 막히거나 「빈 게시물은 게시할 수 없습니다.」가 뜬다', !결과.게시됨 && (막힘 || 안내), true);
    });
  } finally {
    if (글번호 !== undefined) await 글지우기API(page, 글번호);
  }
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글지우기API } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 표식 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 작성화면 } from './pages/publish.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-363',
  name: '설문 두 항목에 같은 글을 넣고 「게시」를 누르면 「중복된 항목 있음」이 보인다',
  techniques: ['동등 분할'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
    항목글: z.string().min(1).max(50).describe('두 항목에 똑같이 넣는 글 — 50자 이하 아무 글').default('같은 글'),
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
    await test.step('설문 두 항목에 같은 글을 넣고 「게시」를 누른다', async () => {
      await 홈.작성.쓰기(`설문 중복 확인 ${표식('dup')}`);
      await 홈.작성.설문.click();
      await 글쓰기.항목채우기(1, params.항목글);
      await 글쓰기.항목칸생길때까지(2);
      await 글쓰기.항목채우기(2, params.항목글);
      const 결과 = await 글쓰기.게시해보기();
      글번호 = 결과.글번호;
      const 떴다 = await 글쓰기.알림.글('중복된 항목 있음').first().waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('설문 두 항목에 같은 글을 넣고 「게시」를 누르면 「중복된 항목 있음」이 보인다', 떴다, true);
    });
  } finally {
    if (글번호 !== undefined) await 글지우기API(page, 글번호);
  }
});

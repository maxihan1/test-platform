import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글경로, 글쓰기API, 글지우기API } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 표식 } from './helpers/page-setup.helper.js';
import { 작성화면 } from './pages/publish.page.js';
import { 글상세화면 } from './pages/status.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-382',
  name: '내 글을 고쳐 저장하면 「게시물이 저장되었습니다.」가 보인다',
  precondition: ['일반 회원이 쓴 새 글이 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
    고친글: z.string().min(1).max(400).describe('고쳐 넣을 글 — 400자 이하 아무 글').default('고친 글 확인'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 글상세화면(page);
  const 글쓰기 = new 작성화면(page);
  const 글표식 = 표식('edit');
  let 글번호: string | undefined;
  let 경로 = '';

  await test.step('일반 회원으로 로그인하고 새 글의 상세를 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    const 글 = await 글쓰기API(page, { status: `고치기 전 글 ${글표식}`, visibility: 'public' });
    글번호 = 글.id;
    경로 = 글경로(글);
    await 상세.열기(경로);
    await verify('새 글 상세에 본문이 보인다', await 상세.본문조각(글표식).isVisible(), true, { blocker: true });
  });

  try {
    await test.step('내 글의 「자세히」에서 「수정」을 눌러 고쳐 저장한다', async () => {
      await 상세.자세히열기();
      const 원문 = 글쓰기.원문응답받기();
      await 상세.펼침.항목(/^수정$/).click();
      await 원문;
      await 글쓰기.답장취소.waitFor();
      await 글쓰기.작성.본문.fill(`${params.고친글} ${글표식}`);
      await 글쓰기.작성.게시.click();
      const 떴다 = await 글쓰기.알림.글('게시물이 저장되었습니다.').first().waitFor({ timeout: 15_000 }).then(() => true, () => false);
      await verify('내 글을 고쳐 저장하면 「게시물이 저장되었습니다.」가 보인다', 떴다, true);
    });

    await test.step('고친 글 상세를 연다', async () => {
      await 상세.열기(경로);
      const 붙었다 = await 상세.수정됨.waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('고친 글 상세에 「1번 수정됨」이 붙는다', 붙었다, true);
    });
  } finally {
    if (글번호 !== undefined) await 글지우기API(page, 글번호);
  }
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글쓰기API, 글지우기API } from './helpers/api.helper.js';
import { 고정API, 고정풀기API } from './helpers/status-api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 표식 } from './helpers/page-setup.helper.js';
import { 고정글화면 } from './pages/pinned.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-472',
  name: '고정한 글 화면을 열면 내가 고정한 글이 보인다',
  precondition: ['일반 회원이 고정한 글이 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 고정목록 = new 고정글화면(page);
  const 글표식 = 표식('pinned');
  let 글번호: string | undefined;

  await test.step('일반 회원으로 로그인하고 새 글을 고정한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    const 글 = await 글쓰기API(page, { status: `고정 화면 확인 ${글표식}`, visibility: 'public' });
    글번호 = 글.id;
    await 고정API(page, 글.id);
    await verify('새 글이 만들어졌다', 글번호.length > 0, true, { blocker: true });
  });

  try {
    await test.step('고정한 글 화면을 연다', async () => {
      await 고정목록.열기();
      await verify('고정한 글 화면을 열면 내가 고정한 글이 보인다', await 고정목록.글(글표식).isVisible(), true);
    });
  } finally {
    if (글번호 !== undefined) {
      await 고정풀기API(page, 글번호);
      await 글지우기API(page, 글번호);
    }
  }
});

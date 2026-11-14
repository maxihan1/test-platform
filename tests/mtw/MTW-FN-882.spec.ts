import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글지우기API } from './helpers/api.helper.js';
import { 글쓰기시도API } from './helpers/status-api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 표식 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-882',
  name: '없는 글을 인용해 게시하면 「인용하려는 게시물이 존재하지 않습니다.」가 돌아온다',
  techniques: ['동등 분할'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  let 글번호: string | undefined;

  await test.step('일반 회원으로 로그인하고 홈을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 홈.열기();
    await verify('홈에 작성 상자가 보인다', await 홈.작성.본문.isVisible(), true, { blocker: true });
  });

  try {
    await test.step('없는 글 번호를 인용해 API 로 게시한다', async () => {
      const 결과 = await 글쓰기시도API(page, { status: `없는 글 인용 확인 ${표식('noquote')}`, visibility: 'public', quoted_status_id: '1' });
      글번호 = 결과.글번호;
      await verify('없는 글을 인용해 게시하면 「인용하려는 게시물이 존재하지 않습니다.」가 돌아온다', 결과.오류.includes('인용하려는 게시물이 존재하지 않습니다.'), true);
    });
  } finally {
    if (글번호 !== undefined) await 글지우기API(page, 글번호);
  }
});

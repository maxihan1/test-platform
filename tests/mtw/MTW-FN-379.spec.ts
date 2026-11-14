import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글지우기API } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 표식 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-379',
  name: '글을 넣고 「게시」를 누르면 「게시하였습니다.」와 「열기」 링크가 보인다',
  smoke: true,
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
    글머리: z.string().min(1).max(400).describe('게시할 글 앞부분 — 400자 이하 아무 글').default('게시 확인 글'),
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
    await test.step('작성 상자에 글을 넣고 「게시」를 누른다', async () => {
      await 홈.작성.쓰기(`${params.글머리} ${표식('post')}`);
      글번호 = (await 홈.작성.게시하기()).id;
      const 안내 = 홈.알림.글('게시하였습니다.');
      const 떴다 = await 안내.waitFor({ timeout: 10_000 }).then(() => true, () => false);
      const 문구 = await verify('「게시하였습니다.」 안내가 뜬다', 떴다, true);
      const 열기 = await verify('안내에 「열기」 링크가 보인다', await 홈.알림.동작('게시하였습니다.', '열기').isVisible(), true);
      await verify('글을 넣고 「게시」를 누르면 「게시하였습니다.」와 「열기」 링크가 보인다', 문구 && 열기, true);
      await verify('게시 뒤 작성 상자 입력칸이 비워진다', await 홈.작성.본문.inputValue(), '');
    });
  } finally {
    if (글번호 !== undefined) await 글지우기API(page, 글번호);
  }
});

import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 글상세열기 } from './helpers/nav.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 글상세화면 } from './pages/thread.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-598',
  name: '글 상세를 보는 동안 새 답글이 달리면 「More replies found」와 「표시」가 보인다',
  platforms: ['android'],
  held: '보류 — 글 상세를 보는 동안 답글을 달아 줄 다른 기기가 없다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 글상세 = new 글상세화면(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('글 상세를 보는 동안 새 답글이 달린다', async () => {
    await 글상세열기(driver, 'minjun_dev', '마스토돈 4.7 인용 기능');
    const 새답글 = await verify('「More replies found」가 보인다', await 뜰때까지(driver, 글상세.전체글자포함('More replies found'), 60_000), true);
    const 표시 = await verify('「표시」가 보인다', await 뜰때까지(driver, 글상세.전체글자포함('표시'), 10_000), true);
    await verify('글 상세를 보는 동안 새 답글이 달리면 「More replies found」와 「표시」가 보인다', 새답글 && 표시, true);
  });
});

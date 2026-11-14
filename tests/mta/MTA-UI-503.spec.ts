import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 프로필열기 } from './helpers/app.helper.js';
import { 더보기에서항목찾기 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-503',
  name: '글 언어가 기기 언어와 다르고 공개 · 제한적 공개 글이면 더보기에 번역(「<언어>에서 번역됨」 · 「원본 보기」) 항목이 보인다',
  platforms: ['android'],
  held: '보류 — 기기 언어와 다른 언어의 공개 글',
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    작성자: z.string().describe('기기 언어와 다른 언어의 공개 글을 쓴 계정 이름'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('기기 언어와 다른 언어의 남의 공개 글 더보기를 연다', async () => {
    await 프로필열기(driver, params.작성자);
    const 번역됨 = await verify('글 더보기에 「<언어>에서 번역됨」이 보인다', await 더보기에서항목찾기(driver, '<언어>에서 번역됨', false), true);
    const 원본 = await verify('글 더보기에 「원본 보기」가 보인다', await 더보기에서항목찾기(driver, '원본 보기', false), true);
    await verify('글 언어가 기기 언어와 다르고 공개 · 제한적 공개 글이면 더보기에 번역(「<언어>에서 번역됨」 · 「원본 보기」) 항목이 보인다', 번역됨 && 원본, true);
  }, { capture: true });
});

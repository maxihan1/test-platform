import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 작성화면 } from './pages/publish.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-116',
  name: '「공개범위와 반응」 창에 「공개」 · 「조용한 공개」 · 「팔로워」 · 「개인 멘션」이 보인다',
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

  await test.step('일반 회원으로 로그인하고 홈을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 홈.열기();
    await verify('홈에 작성 상자가 보인다', await 홈.작성.본문.isVisible(), true, { blocker: true });
  });

  await test.step('공개 범위 버튼을 눌러 「공개범위와 반응」 창을 연다', async () => {
    await 글쓰기.공개범위창열기();
    await 글쓰기.공개범위목록열기();
    const 공개 = await verify('「공개」가 보인다', await 글쓰기.공개범위선택지('공개').isVisible(), true);
    const 조용한 = await verify('「조용한 공개」가 보인다', await 글쓰기.공개범위선택지('조용한 공개').isVisible(), true);
    const 팔로워 = await verify('「팔로워」가 보인다', await 글쓰기.공개범위선택지('팔로워').isVisible(), true);
    const 개인 = await verify('「개인 멘션」이 보인다', await 글쓰기.공개범위선택지('개인 멘션').isVisible(), true);
    await verify('「공개범위와 반응」 창에 「공개」 · 「조용한 공개」 · 「팔로워」 · 「개인 멘션」이 보인다', 공개 && 조용한 && 팔로워 && 개인, true);
  });

  await test.step('창에서 「팔로워」를 고른다', async () => {
    await 글쓰기.공개범위고르기시도('팔로워');
    await verify('「팔로워」에서는 인용할 수 있는 사람 선택이 꺼진다', await 글쓰기.인용범위선택.isDisabled(), true);
  });

  await test.step('창에서 「개인 멘션」을 고른다', async () => {
    await 글쓰기.공개범위고르기시도('개인 멘션');
    await verify('「개인 멘션」에서도 인용할 수 있는 사람 선택이 꺼진다', await 글쓰기.인용범위선택.isDisabled(), true);
  });
});

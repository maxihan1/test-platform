import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 문구가보이나, 보이나, 프로필열기 } from './helpers/app.helper.js';
import { 문구찾기 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 링크카드화면 } from './pages/link-card.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-137',
  name: '링크 카드에 제목 · 설명 · 이미지 · 「<작성자>에 의해」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 링크 = new 링크카드화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('news_bot 프로필에서 링크 카드 글을 찾는다', async () => {
    await 프로필열기(driver, 'news_bot');
    await verify('링크 카드가 보인다', await 문구찾기(driver, '에 의해'), true, { blocker: true });
    const 제목 = await verify('링크 카드에 제목이 보인다', await 보이나(driver, 링크.제목), true);
    const 설명 = await verify('링크 카드에 설명이 보인다', await 보이나(driver, 링크.설명), true);
    const 이미지 = await verify('링크 카드에 이미지가 보인다', await 보이나(driver, 링크.이미지), true);
    const 작성자 = await verify('링크 카드에 「<작성자>에 의해」가 보인다', await 문구가보이나(driver, '<작성자>에 의해'), true);
    await verify('링크 카드에 제목 · 설명 · 이미지 · 「<작성자>에 의해」가 보인다', 제목 && 설명 && 이미지 && 작성자, true);
  }, { capture: true });
});

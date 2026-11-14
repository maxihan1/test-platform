import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 인용글찾기API } from './helpers/status-api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 글카드목록 } from './pages/feed-card.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-134',
  name: 'minjun_dev 투표 글 카드에 투표 선택지와 「투표」 버튼이 보인다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 프로필 = new 프로필화면(page);
  const 카드 = new 글카드목록(page);

  await test.step('일반 회원으로 로그인하고 홈을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 홈.열기();
    await verify('홈에 작성 상자가 보인다', await 홈.작성.본문.isVisible(), true, { blocker: true });
  });

  await test.step('minjun_dev 프로필을 연다', async () => {
    await 프로필.열기('minjun_dev');
    await 카드.카드보이기('주로 쓰는 언어');
    const 선택지 = await verify('minjun_dev 투표 글 카드에 투표 선택지가 보인다', await 카드.투표선택지('주로 쓰는 언어').first().isVisible(), true);
    const 버튼 = await verify('minjun_dev 투표 글 카드에 「투표」 버튼이 보인다', await 카드.투표버튼('주로 쓰는 언어').isVisible(), true);
    await verify('minjun_dev 투표 글 카드에 투표 선택지와 「투표」 버튼이 보인다', 선택지 && 버튼, true);
  });

  await test.step('hana_photo 프로필을 연다', async () => {
    await 프로필.열기('hana_photo');
    await 카드.카드보이기('오늘 아침 한강 산책길');
    await verify('hana_photo 사진 글 카드에 미디어 격자가 보인다', await 카드.미디어격자('오늘 아침 한강 산책길').isVisible(), true);
  });

  await test.step('jiho_cafe 프로필을 연다', async () => {
    const { 원글조각 } = await 인용글찾기API(page, 'jiho_cafe');
    await 프로필.열기('jiho_cafe');
    await 카드.카드보이기(원글조각);
    await verify('jiho_cafe 인용 글 카드 본문 아래에 원글 카드가 보인다', await 카드.인용원글(원글조각).isVisible(), true);
  });
});

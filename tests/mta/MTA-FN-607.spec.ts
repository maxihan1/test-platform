import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 알림글 } from './components/toast.component.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필열기 } from './helpers/nav.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 글카드 } from './pages/post-card.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-607',
  name: '재생할 수 없는 영상을 열면 토스트 「비디오 재생 오류 발생」이 보인다',
  platforms: ['android'],
  held: '보류 — 재생할 수 없는 영상 글이 없다(서버가 받지 않는다)',
  techniques: ['동등 분할'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 카드 = new 글카드(driver);
  const 알림 = new 알림글(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('재생할 수 없는 영상 글을 연다', async () => {
    await 프로필열기(driver, 'hana_photo');
    await 카드.사진누르기();
    await verify('재생할 수 없는 영상을 열면 토스트 「비디오 재생 오류 발생」이 보인다', await 알림.토스트(), '비디오 재생 오류 발생');
  });
});

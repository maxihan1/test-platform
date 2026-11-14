import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글카드 } from './components/status-card.component.js';
import { 알림멘션탭열기 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-176',
  name: 'hana_photo 와 주고받은 개인 멘션 글을 열면 남의 팔로워 공개 글과 모든 개인 멘션은 「부스트」 버튼이 비활성이다',
  platforms: ['android'],
  techniques: ['동등 분할'],
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 카드 = new 글카드(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('hana_photo 와 주고받은 개인 멘션 글을 연다', async () => {
    await 알림멘션탭열기(driver);
    const 버튼 = await 카드.아래버튼('내일 사진 산책', 'boost_btn');
    await verify('hana_photo 와 주고받은 개인 멘션 글을 열면 남의 팔로워 공개 글과 모든 개인 멘션은 「부스트」 버튼이 비활성이다', await 버튼.getAttribute('enabled'), 'false');
  }, { capture: true });
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 문구가보이나 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-107',
  name: '실시간 피드에 안내 배너 「이것들은 해당 서버(mastodon.maxihan.com)에 있는 모든 사용자가 작성한 전체 게시물입니다.」가 보인다',
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

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('홈 드롭다운에서 「실시간 피드」를 고른다', async () => {
    await 홈.드롭다운열기();
    await 홈.드롭다운고르기('실시간 피드');
    await verify('실시간 피드에 안내 배너 「이것들은 해당 서버(mastodon.maxihan.com)에 있는 모든 사용자가 작성한 전체 게시물입니다.」가 보인다', await 문구가보이나(driver, '이것들은 해당 서버(mastodon.maxihan.com)에 있는 모든 사용자가 작성한 전체 게시물입니다.', 15_000), true);
  }, { capture: true });
});

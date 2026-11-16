import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 표시글, 내글쓰기 } from './helpers/post.helper.js';
import { 문구가보이나, 내글수정열기, 내글모두지우기 } from './helpers/compose-flow.helper.js';

import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-258',
  name: '글 수정 화면에서 공개 범위 버튼을 누르면 「게시된 게시물은 공개 범위를 변경할 수 없습니다.」가 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    안내: z.string().describe('공개 범위 변경 불가 안내 글').default('게시된 게시물은 공개 범위를 변경할 수 없습니다.'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 본문 = 표시글('공개 범위 수정 확인');
  const 글쓰기 = new 글쓰기화면(driver);
  const 홈 = new 홈화면(driver);

  try {
    await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
      await 로그인하기(driver, params.loginId, params.loginPassword);
      await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    });

    await test.step('내 새 글을 올리고 수정 화면을 연다', async () => {
      await 내글쓰기(driver, 본문);
      await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
      await 내글수정열기(driver, 본문);
      await verify('글 수정 화면 본문 칸이 보인다', await 글쓰기.그려질때까지(), true, { blocker: true });
    });

    await test.step('내 새 글 수정 화면에서 공개 범위 버튼을 누른다', async () => {
      await driver.$(글쓰기.공개범위버튼).click();
      await verify('글 수정 화면에서 공개 범위 버튼을 누르면 「게시된 게시물은 공개 범위를 변경할 수 없습니다.」가 보인다', await 문구가보이나(driver, expected.안내), true);
    });
  } finally {
    await 내글모두지우기(driver, 본문);
  }
});

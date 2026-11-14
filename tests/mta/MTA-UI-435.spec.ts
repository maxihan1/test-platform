import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 계정설정화면 } from './pages/set-account.page.js';
import { 게시기본값화면 } from './pages/set-posting.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-435',
  name: '게시 기본값 화면에 배너 「이러한 설정은 게시물을 올릴 때 기본값으로 사용될 것이지만, 작성기 내에서 게시물별로 편집할 수 있습니다.」 · 「게시 범위」 · 「공개 범위」 · 「게시 언어」가 보인다',
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
  const 설정 = new 설정화면(driver);
  const 계정설정 = new 계정설정화면(driver);
  const 게시 = new 게시기본값화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('홈에서 설정을 연다', async () => {
    await verify('설정 화면에 「계정 추가...」 줄이 보인다', await 설정.열기(), true, { blocker: true });
  });
  await test.step('설정에서 계정 설정을 연다', async () => {
    await 설정.계정줄누르기();
    await verify('계정 설정 화면에 계정 이름 제목이 보인다', await 계정설정.떴나(), true, { blocker: true });
  });
  await test.step('계정 설정에서 「게시 기본값」을 누른다', async () => {
    await 계정설정.줄누르기('게시 기본값');
    await verify('게시 기본값 화면이 열린다', await 게시.떴나(), true);
    const 배너 = await verify('배너 「이러한 설정은 게시물을 올릴 때 기본값으로 사용될 것이지만, 작성기 내에서 게시물별로 편집할 수 있습니다.」가 보인다', await 게시.글보이나('이러한 설정은 게시물을 올릴 때 기본값으로 사용될 것이지만, 작성기 내에서 게시물별로 편집할 수 있습니다.'), true);
    const 범위 = await verify('「게시 범위」가 보인다', await 게시.줄보이나('게시 범위'), true);
    const 공개 = await verify('「공개 범위」가 보인다', await 게시.줄보이나('공개 범위'), true);
    const 언어 = await verify('「게시 언어」가 보인다', await 게시.줄보이나('게시 언어'), true);
    await verify('게시 기본값 화면에 배너 「이러한 설정은 게시물을 올릴 때 기본값으로 사용될 것이지만, 작성기 내에서 게시물별로 편집할 수 있습니다.」 · 「게시 범위」 · 「공개 범위」 · 「게시 언어」가 보인다', 배너 && 범위 && 공개 && 언어, true);
  }, { capture: true });
});

import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정줄, 글읽기 } from './helpers/app.helper.js';
import { 설정줄열기, 계정설정열기 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-435',
  name: '게시 기본값 화면에 안내 「이러한 설정은 게시물을 올릴 때 기본값으로 사용될 것이지만, 작성기 내에서 게시물별로 편집할 수 있습니다.」와 「게시 범위」 · 「공개 범위」 · 「게시 언어」가 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    안내글: z.string().describe('게시 기본값 화면 안내').default('이러한 설정은 게시물을 올릴 때 기본값으로 사용될 것이지만, 작성기 내에서 게시물별로 편집할 수 있습니다.'),
    범위줄: z.string().describe('게시 기본값 줄 이름').default('게시 범위'),
    공개줄: z.string().describe('게시 기본값 줄 이름').default('공개 범위'),
    언어줄: z.string().describe('게시 기본값 줄 이름').default('게시 언어'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 설정 = new 설정화면(driver);
  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });
  await test.step('계정 설정을 연다', async () => {
    await verify('계정 설정이 열린다', await 계정설정열기(driver, 계정줄(params.loginId ?? '')), true, { blocker: true });
  });
  await test.step('계정 설정에서 「게시 기본값」을 연다', async () => {
    await verify('게시 기본값 화면이 열린다', await 설정줄열기(driver, '게시 기본값'), true, { blocker: true });
    const 안내 = await verify('게시 기본값 화면의 안내가 기대값과 같다', await 글읽기(driver, 설정.안내글), expected.안내글);
    const 범위 = await verify('게시 기본값 화면에 「게시 범위」가 보인다', await 뜰때까지(driver, 설정.줄(expected.범위줄), 10_000), true);
    const 공개 = await verify('게시 기본값 화면에 「공개 범위」가 보인다', await 뜰때까지(driver, 설정.줄(expected.공개줄), 10_000), true);
    const 언어 = await verify('게시 기본값 화면에 「게시 언어」가 보인다', await 뜰때까지(driver, 설정.줄(expected.언어줄), 10_000), true);
    await verify('게시 기본값 화면에 안내 「이러한 설정은 게시물을 올릴 때 기본값으로 사용될 것이지만, 작성기 내에서 게시물별로 편집할 수 있습니다.」와 「게시 범위」 · 「공개 범위」 · 「게시 언어」가 보인다', 안내 && 범위 && 공개 && 언어, true);
  });
});

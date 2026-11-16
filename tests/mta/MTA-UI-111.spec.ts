import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-111',
  name: '팔로우한 해시태그가 없는 계정의 홈 드롭다운 「팔로우 중인 해시태그」 아래에 「해시태그를 팔로우해서 관심사 따라잡기」 · 「팔로우중인 사람들이 여기 나타날 것입니다」가 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('blankId', 'blankPassword'),
  precondition: ['빈 계정으로 로그인해 있다'],
  params: z.object({
    blankId: z.string().describe('빈 계정 아이디').optional().meta({ secret: true, account: '빈 계정' }),
    blankPassword: z.string().describe('빈 계정 비밀번호').optional().meta({ secret: true, account: '빈 계정' }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);

  await test.step('빈 계정으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.blankId, params.blankPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('빈 계정으로 홈 드롭다운 「팔로우 중인 해시태그」를 누른다', async () => {
    await 홈.드롭다운열기();
    await 홈.메뉴.고르기('팔로우 중인 해시태그');
    const 안내 = await verify('「해시태그를 팔로우해서 관심사 따라잡기」가 보인다', await 뜰때까지(driver, 홈.메뉴.항목포함('해시태그를 팔로우해서 관심사 따라잡기'), 10_000), true);
    const 제목 = await verify('「팔로우중인 사람들이 여기 나타날 것입니다」가 보인다', await 뜰때까지(driver, 홈.메뉴.항목포함('팔로우중인 사람들이 여기 나타날 것입니다'), 10_000), true);
    await verify('팔로우한 해시태그가 없는 계정의 홈 드롭다운 「팔로우 중인 해시태그」 아래에 「해시태그를 팔로우해서 관심사 따라잡기」 · 「팔로우중인 사람들이 여기 나타날 것입니다」가 보인다', 안내 && 제목, true);
  });
});

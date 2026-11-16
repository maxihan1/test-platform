import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-108',
  name: '홈 드롭다운 「목록」 아래에 내 목록 「개발 소식」 · 「친구」가 가나다 순으로 보이고 「목록 만들기」 · 「목록 관리」가 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('홈 드롭다운에서 「목록」을 누른다', async () => {
    await 홈.드롭다운열기();
    await 홈.메뉴.고르기('목록');
    const 개발소식 = await verify('「개발 소식」이 보인다', await 홈.메뉴.뜰때까지('개발 소식'), true);
    const 친구 = await verify('「친구」가 보인다', await 홈.메뉴.뜰때까지('친구'), true);
    const 가나다순 = await verify('「개발 소식」이 「친구」보다 위에 있다', (await 홈.메뉴세로위치('개발 소식')) < (await 홈.메뉴세로위치('친구')), true);
    const 만들기 = await verify('「목록 만들기」가 보인다', await 홈.메뉴.뜰때까지('목록 만들기'), true);
    const 관리 = await verify('「목록 관리」가 보인다', await 홈.메뉴.뜰때까지('목록 관리'), true);
    await verify('홈 드롭다운 「목록」 아래에 내 목록 「개발 소식」 · 「친구」가 가나다 순으로 보이고 「목록 만들기」 · 「목록 관리」가 보인다', 개발소식 && 친구 && 가나다순 && 만들기 && 관리, true);
  });
});

import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지, 보이나 } from '@platform/kit/parts';
import { z } from 'zod';

import { 이름앞부분, 글자수 } from './helpers/timeline.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필열기 } from './helpers/nav.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 글카드 } from './pages/post-card.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-189',
  name: '표시 이름이 20자인 사람 글 더보기를 열면 이름이 줄지 않고 그대로 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  techniques: ['경계값 분석'],
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

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('표시 이름 20자인 dn_len20 글 더보기를 연다', async () => {
    await 프로필열기(driver, 'dn_len20');
    const 이름 = await 카드.첫이름읽기();
    await verify('표시 이름이 20자다', 글자수(이름), 20, { blocker: true });
    await 카드.첫글더보기열기();
    await verify('표시 이름이 20자인 사람 글 더보기를 열면 이름이 줄지 않고 그대로 보인다', await 뜰때까지(driver, 카드.메뉴.항목포함(이름), 10_000), true);
    await driver.back();
  });

  await test.step('표시 이름 21자인 dn_len21 글 더보기를 연다', async () => {
    await 프로필열기(driver, 'dn_len21');
    const 이름 = await 카드.첫이름읽기();
    await verify('표시 이름이 21자다', 글자수(이름), 21, { blocker: true });
    await 카드.첫글더보기열기();
    const 줄어듦 = await verify('이름이 15자 뒤 「…」로 줄어 보인다', await 뜰때까지(driver, 카드.메뉴.항목포함(`${이름앞부분(이름, 15)}…`), 10_000), true);
    const 전체없음 = await verify('줄지 않은 전체 이름은 보이지 않는다', await 보이나(driver, 카드.메뉴.항목포함(이름)), false);
    await verify('표시 이름이 21자인 사람 글 더보기에 이름이 15자 뒤 「…」로 줄어 보인다', 줄어듦 && 전체없음, true);
  });
});

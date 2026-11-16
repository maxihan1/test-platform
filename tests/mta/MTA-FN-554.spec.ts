import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지, 알림창열기 } from '@platform/kit/parts';
import { z } from 'zod';

import { 뜨는메뉴 } from './components/popup-menu.component.js';
import { 꾸러미 } from './helpers/app.helper.js';
import { 본문아래재생버튼누르기 } from './helpers/play.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필열기 } from './helpers/nav.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 글카드 } from './pages/post-card.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-554',
  name: '오디오를 재생하면 알림창에 「오디오 재생」 알림이 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    글일부: z.string().min(1).describe('jiho_cafe 오디오 글을 찾는 낱말').default('카페에서 틀어 둔 짧은 멜로디예요'),
  }),
  expected: z.object({
    알림글: z.string().describe('알림창 오디오 알림 글').default('오디오 재생'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 카드 = new 글카드(driver);
  const 메뉴 = new 뜨는메뉴(driver);

  await test.step('일반 회원으로 로그인해 jiho_cafe 프로필을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    await 프로필열기(driver, 'jiho_cafe');
    await verify('오디오 글 카드가 보인다', await 카드.글자가보일때까지(params.글일부), true, { blocker: true });
  });

  try {
    await test.step('jiho_cafe 의 오디오 글을 재생하고 알림창을 연다', async () => {
      await verify('오디오 글 카드의 재생 버튼을 누른다', await 본문아래재생버튼누르기(driver, params.글일부), true, { blocker: true });
      await 알림창열기(driver);
      await verify('오디오를 재생하면 알림창에 「오디오 재생」 알림이 보인다', await 뜰때까지(driver, 메뉴.항목포함(expected.알림글), 10_000), true);
    });
  } finally {
    await driver.back();
    await driver.activateApp(꾸러미);
  }
});

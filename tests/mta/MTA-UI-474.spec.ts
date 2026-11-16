import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지, 보이나 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필열기 } from './helpers/nav.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 미디어뷰어 } from './pages/media-viewer.page.js';
import { 글카드 } from './pages/post-card.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-474',
  name: '영상 미디어 뷰어에 「재생」 또는 「일시정지」와 진행 막대가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    글일부: z.string().min(1).describe('hana_photo 영상 글을 찾는 낱말').default('해 질 녘 짧은 영상이에요'),
  }),
  expected: z.object({
    재생: z.string().describe('재생 버튼 이름').default('재생'),
    일시정지: z.string().describe('일시정지 버튼 이름').default('일시정지'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 카드 = new 글카드(driver);
  const 뷰어 = new 미디어뷰어(driver);

  await test.step('일반 회원으로 로그인해 hana_photo 프로필을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    await 프로필열기(driver, 'hana_photo');
    await verify('영상 글 카드가 보인다', await 카드.글자가보일때까지(params.글일부), true, { blocker: true });
  });

  await test.step('hana_photo 의 영상 글에서 영상을 누른다', async () => {
    const 영상 = 카드.굴려서아이디('play_button');
    await verify('영상 글의 재생 표시가 보인다', await 뜰때까지(driver, 영상, 20_000), true, { blocker: true });
    await driver.$(영상).click();
    await verify('영상 미디어 뷰어가 열린다', await 뷰어.영상뷰어가뜰때까지(), true, { blocker: true });
    const 이름 = await 뷰어.재생버튼이름();
    const 버튼 = await verify('「재생」 또는 「일시정지」 버튼이 보인다', [expected.재생, expected.일시정지].includes(이름), true);
    const 막대 = await verify('진행 막대가 보인다', await 보이나(driver, 뷰어.진행막대), true);
    await verify('영상 미디어 뷰어에 「재생」 또는 「일시정지」와 진행 막대가 보인다', 버튼 && 막대, true);
  });
});

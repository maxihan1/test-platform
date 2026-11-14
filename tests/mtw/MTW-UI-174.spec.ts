import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 내계정API } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈링크화면 } from './pages/home-links.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-174',
  name: '글 카드의 작성자 이름을 누르면 그 프로필로 간다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 링크 = new 홈링크화면(page);
  const 프로필 = new 프로필화면(page);

  await test.step('일반 회원으로 로그인하고 홈을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 홈.열기();
    await 링크.첫글카드그려질때까지();
    await verify('홈에 글 카드가 보인다', await 링크.첫글카드.isVisible(), true, { blocker: true });
  });

  await test.step('홈 글 카드의 작성자 이름을 누른다', async () => {
    const 카드핸들 = (await 링크.첫글작성자.innerText()).match(/@[^\s@]+/)?.[0] ?? '';
    await 링크.첫글작성자.click();
    await 프로필.그려질때까지();
    const 같다 = (await 프로필.핸들.innerText()).startsWith(카드핸들);
    await verify('카드 작성자의 핸들이 비어 있지 않다', 카드핸들 !== '', true, { blocker: true });
    await verify('글 카드의 작성자 이름을 누르면 그 프로필로 간다', 같다, true);
  });

  await test.step('왼쪽 프로필 카드를 누른다', async () => {
    const 나 = await 내계정API(page);
    await 홈.열기();
    await 링크.내프로필카드.click();
    await 프로필.그려질때까지();
    await verify('왼쪽 프로필 카드는 내 프로필로 이어진다', new URL(page.url()).pathname, `/@${나.acct}`);
  });
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글경로, 글찾기API } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 작성화면 } from './pages/publish.page.js';
import { 글상세화면 } from './pages/status.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-109',
  name: '홈에서 Alt+n 을 치면 작성 상자 본문에 커서가 간다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 글쓰기 = new 작성화면(page);
  const 상세 = new 글상세화면(page);

  await test.step('일반 회원으로 로그인하고 홈을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 홈.열기();
    await verify('홈에 작성 상자가 보인다', await 홈.작성.본문.isVisible(), true, { blocker: true });
  });

  await test.step('홈에서 Alt+n 을 친다', async () => {
    await 홈.제목.click();
    await 글쓰기.키치기('Alt+n');
    await verify('홈에서 Alt+n 을 치면 작성 상자 본문에 커서가 간다', await 글쓰기.본문에커서올때까지(), true);
  });

  await test.step('hana_photo 글의 「답장」을 누른다', async () => {
    const 글 = await 글찾기API(page, 'hana_photo', '4.7 의 인용');
    await 상세.열기(글경로(글));
    await 상세.답장.click();
    await 글쓰기.답장취소.waitFor();
    await verify('글의 「답장」은 상대 핸들이 든 작성 상자를 연다', (await 글쓰기.작성.본문.inputValue()).includes('@hana_photo'), true);
  });

  await test.step('/publish 주소를 연다', async () => {
    await 글쓰기.열기();
    await verify('/publish 주소에서 작성 상자가 열린다', await 글쓰기.작성.본문.isVisible(), true);
  });
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 기본서버주소, 서버주소로켜기, 앱다시켜기 } from './helpers/app.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 토스트글읽기 } from './helpers/wait.helper.js';

export const spec = defineCase({
  tcId: 'DMA-FN-037',
  name: '한 번 받은 서버 주소는 다음 실행에도 쓰여 토스트에 그 주소가 다시 보인다',
  platforms: ['android'],
  precondition: ['앱을 server 값으로 한 번 켰다'],
  params: z.object({
    serverAddress: z.string().describe('앱에 넘길 서버 주소 — 연결이 바로 거절되는 주소').default('http://127.0.0.1:9'),
    userId: z.string().describe('아이디 — 아무 글자').default('user2'),
    userPass: z.string().describe('비밀번호 — 아무 글자').default('wrong1234'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 로그인 = new 로그인화면(driver);

  try {
    await test.step('앱을 server 값으로 한 번 켠다', async () => {
      await 서버주소로켜기(driver, params.serverAddress);
      await 로그인.열릴때까지().catch(() => undefined);
      await verify('로그인 화면이 보인다', await 로그인.보이나(), true, { blocker: true });
    });

    await test.step('앱을 끄고 server 값 없이 다시 켠 뒤 「로그인」을 누른다', async () => {
      await 앱다시켜기(driver);
      await 로그인.열릴때까지().catch(() => undefined);
      await 로그인.로그인(params.userId, params.userPass);
      const 글 = await 토스트글읽기(driver);
      await verify('한 번 받은 서버 주소는 다음 실행에도 쓰여 토스트에 그 주소가 다시 보인다', 글.includes(params.serverAddress), true);
    }, { capture: true });
  } finally {
    await 서버주소로켜기(driver, 기본서버주소);
  }
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 서버값없이켜기, 서버주소로켜기 } from './helpers/app.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 토스트글읽기 } from './helpers/wait.helper.js';

export const spec = defineCase({
  tcId: 'DMA-FN-030',
  name: '서버에 닿지 않으면 토스트 「서버에 연결할 수 없습니다 ({서버 주소})」가 보인다',
  platforms: ['android'],
  precondition: ['앱을 닿지 않는 서버 주소로 켰다'],
  params: z.object({
    serverAddress: z.string().describe('서버 주소 — 연결이 바로 거절되는 주소').default('http://127.0.0.1:9'),
    userId: z.string().describe('아이디 — 아무 글자').default('user2'),
    userPass: z.string().describe('비밀번호 — 아무 글자').default('wrong1234'),
  }),
  expected: null,
  techniques: ['동등 분할'],
});

test(spec, async ({ driver, params }) => {
  const 로그인 = new 로그인화면(driver);

  try {
    await test.step('앱을 닿지 않는 서버 주소로 켠다', async () => {
      await 서버주소로켜기(driver, params.serverAddress);
      await 로그인.열릴때까지().catch(() => undefined);
      await verify('로그인 화면이 보인다', await 로그인.보이나(), true, { blocker: true });
    });

    await test.step('로그인 화면에서 「로그인」을 누른다', async () => {
      await 로그인.로그인(params.userId, params.userPass);
      await verify(
        '서버에 닿지 않으면 토스트 「서버에 연결할 수 없습니다 ({서버 주소})」가 보인다',
        await 토스트글읽기(driver),
        `서버에 연결할 수 없습니다 (${params.serverAddress})`,
      );
    }, { capture: true });
  } finally {
    await 서버값없이켜기(driver);
  }
});

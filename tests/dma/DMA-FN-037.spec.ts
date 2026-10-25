import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 다시켜기, 서버주소로켜기 } from './helpers/app.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-037',
  name: '주소를 한 번 넘긴 뒤 server 값 없이 다시 켜고 로그인하면 「서버에 연결할 수 없습니다 (<앞서 넘긴 주소>)」가 보인다',
  platforms: ['android'],
  precondition: ['server 값으로 폰에서 닿지 않는 주소를 넘겨 앱을 켠 상태다'],
  params: z.object({
    닿지않는주소: z.string().describe('server 값으로 넘길 주소 — 폰에서 열리지 않는 http 주소').default('http://127.0.0.1:1'),
    아이디: z.string().describe('로그인 칸에 적을 아이디 — 빈 칸이 아닌 아무 글자').default('dma-probe'),
    비밀글자: z.string().describe('비밀번호 칸에 적을 글자 — 빈 칸이 아닌 아무 글자').default('dma-probe'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 로그인 = new 로그인화면(driver);

  await test.step('server 값으로 닿지 않는 주소를 넘겨 앱을 켠다', async () => {
    await 서버주소로켜기(driver, params.닿지않는주소);
  });

  await test.step('넘긴 주소로 켜졌는지 확인한다', async () => {
    await 로그인.로그인하기(params.아이디, params.비밀글자);
    await verify(
      '「서버에 연결할 수 없습니다 (<넘긴 주소>)」가 보인다',
      await 로그인.안내글(),
      `서버에 연결할 수 없습니다 (${params.닿지않는주소})`,
      { blocker: true },
    );
  });

  await test.step('server 값 없이 앱을 다시 켜고 「로그인」을 누른다', async () => {
    await 다시켜기(driver);
    await 로그인.로그인하기(params.아이디, params.비밀글자);
    await verify(
      '주소를 한 번 넘긴 뒤 server 값 없이 다시 켜고 로그인하면 「서버에 연결할 수 없습니다 (<앞서 넘긴 주소>)」가 보인다',
      await 로그인.안내글(),
      `서버에 연결할 수 없습니다 (${params.닿지않는주소})`,
    );
  }, { capture: true });
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 내계정API } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 컬렉션목록화면 } from './pages/collections.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-635',
  name: '컬렉션이 없을 때 컬렉션 화면을 열면 「아직 컬렉션을 만들지 않았습니다.」가 보인다',
  techniques: ['경계값 분석'],
  precondition: ['두 번째 사용자로 로그인해 있다'],
  params: z.object({
    secondId: z.string().describe('두 번째 사용자 이메일').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 암호').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 컬렉션목록화면(page);
  let 내아이디 = '';

  await test.step('두 번째 사용자로 로그인하고 내 아이디를 확인한다', async () => {
    await 로그인하기(page, params.secondId, params.secondPassword);
    내아이디 = (await 내계정API(page)).acct;
    await verify('내 아이디가 확인된다', 내아이디 !== '', true, { blocker: true });
  });

  await test.step('두 번째 사용자로 컬렉션 화면을 연다', async () => {
    await 화면.열기(내아이디);
    const 보인다 = await 화면.빈안내.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('컬렉션이 없을 때 컬렉션 화면을 열면 「아직 컬렉션을 만들지 않았습니다.」가 보인다', 보인다, true);
  });
});

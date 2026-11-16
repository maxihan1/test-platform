import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 가입해서이메일확인화면으로 } from './helpers/confirm.helper.js';
import { 시작화면열기 } from './helpers/login.helper.js';
import { 이메일확인화면 } from './pages/email-confirm.page.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-109',
  name: '이메일 확인 화면에서 「재전송」을 누르면 버튼이 「재전송 (n)」으로 바뀌고 꺼진다',
  platforms: ['android'],
  precondition: ['이메일 확인 대기 계정이 있다'],
  params: null,
  expected: z.object({
    버튼글: z.string().describe('재전송 뒤 버튼 글 — 숫자는 n 으로 읽는다').default('재전송 (n)'),
  }),
});

test(spec, async ({ driver, expected }) => {
  const 시작 = new 시작화면(driver);
  const 확인 = new 이메일확인화면(driver);

  await test.step('앱을 켜서 시작 화면을 연다', async () => {
    await 시작화면열기(driver);
    await verify('시작 화면 「로그인」 버튼이 보인다', await 시작.그려질때까지(), true, { blocker: true });
  });

  await test.step('이메일 확인 대기 계정으로 로그인해 확인 화면을 연다', async () => {
    await 가입해서이메일확인화면으로(driver);
    await verify('「수신함 확인하기」 화면이 보인다', await 확인.그려질때까지(), true, { blocker: true });
    await verify('「재전송」 버튼이 켜져 있다', await 확인.재전송켜질때까지(70_000), true, { blocker: true });
  });

  await test.step('이메일 확인 화면에서 「재전송」을 누르고 버튼을 읽는다', async () => {
    await 확인.재전송누르기();
    await 뜰때까지(driver, 확인.재전송카운트, 10_000);
    const 글 = await verify('버튼 글이 「재전송 (n)」 꼴이다', (await 확인.재전송글()).replace(/\d+/g, 'n'), expected.버튼글);
    const 꺼짐 = await verify('버튼이 꺼져 있다', await 확인.재전송꺼졌나(), true);
    await verify('이메일 확인 화면에서 「재전송」을 누르면 버튼이 「재전송 (n)」으로 바뀌고 꺼진다', 글 && 꺼짐, true);
  });
});

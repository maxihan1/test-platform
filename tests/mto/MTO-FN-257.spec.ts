import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 릴레이추가화면 } from './pages/relay-new.page.js';
import { 릴레이화면 } from './pages/relays.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-257',
  name: '릴레이 inbox URL 에 「not a url」을 적고 저장하면 오류가 보이고 릴레이가 만들어지지 않는다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  techniques: ['동등 분할', '결정 테이블'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
    주소: z.string().min(1).describe('릴레이 서버의 inbox URL 칸에 적을 글자 — 주소 형식이 아닌 글자').default('not a url'),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 릴레이 = new 릴레이화면(page);
  const 추가 = new 릴레이추가화면(page);
  let 이전 = 0;

  await test.step('Owner 계정으로 로그인하고 릴레이 추가 화면을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 릴레이.열기();
    이전 = await 릴레이.표.count();
    await 추가.열기();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 추가.제목.isVisible(), true, { blocker: true });
  });

  await test.step('「릴레이 서버의 inbox URL」에 「not a url」을 적고 「저장하고 활성화」를 누른다', async () => {
    await 추가.저장하기(params.주소);
    const 오류 = await verify('오류가 보인다', await 추가.오류요약.isVisible(), true);
    await 릴레이.열기();
    const 안만들어짐 = await verify('릴레이가 만들어지지 않는다', await 릴레이.표.count(), 이전);
    await verify('릴레이 inbox URL 에 「not a url」을 적고 저장하면 오류가 보이고 릴레이가 만들어지지 않는다', 오류 && 안만들어짐, true);
  });
});

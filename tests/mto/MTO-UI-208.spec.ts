import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 릴레이추가화면 } from './pages/relay-new.page.js';
import { 릴레이화면 } from './pages/relays.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-208',
  name: '릴레이 추가 화면에 「릴레이 서버의 inbox URL」 칸 · 「저장하고 활성화」와 설명 「활성화 되면, 이 릴레이의 모든 공개 게시물을 구독하고 이 서버의 공개 게시물을 전송하게 됩니다.」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 릴레이 = new 릴레이화면(page);
  const 추가 = new 릴레이추가화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 릴레이.열기();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 릴레이.제목.isVisible(), true, { blocker: true });
  });

  await test.step('「릴레이」 화면에서 「릴레이 연결 설정」을 누른다', async () => {
    await 릴레이.연결설정.click();
    await 추가.제목.waitFor();
    const 칸 = await verify('「릴레이 서버의 inbox URL」 칸이 보인다', await 추가.주소칸.isVisible(), true);
    const 저장 = await verify('「저장하고 활성화」가 보인다', await 추가.저장하고활성화.isVisible(), true);
    const 설명 = await verify('설명이 보인다', await 추가.활성화설명.isVisible(), true);
    await verify('릴레이 추가 화면에 「릴레이 서버의 inbox URL」 칸 · 「저장하고 활성화」와 설명 「활성화 되면, 이 릴레이의 모든 공개 게시물을 구독하고 이 서버의 공개 게시물을 전송하게 됩니다.」가 보인다', 칸 && 저장 && 설명, true);
  });
});

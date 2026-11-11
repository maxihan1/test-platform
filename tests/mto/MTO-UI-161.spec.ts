import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 초대화면 } from './pages/invites.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-161',
  name: '초대 생성 폼에 「사용 횟수 제한」 · 「만기」 선택지와 「초대를 통한 팔로우」 · 「초대 링크 생성하기」, 설명 「이 서버에 대한 초대 링크를 만들고 공유합니다」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 초대 = new 초대화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 초대.열기();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 초대.제목.isVisible(), true, { blocker: true });
  });

  await test.step('「초대」 화면을 연다', async () => {
    await 초대.열기();
    const 횟수 = await verify('「사용 횟수 제한」 선택지가 보인다', await 초대.사용횟수제한.isVisible(), true);
    const 만기 = await verify('「만기」 선택지가 보인다', await 초대.만기.isVisible(), true);
    const 팔로우 = await verify('「초대를 통한 팔로우」가 보인다', await 초대.초대를통한팔로우.isVisible(), true);
    const 생성 = await verify('「초대 링크 생성하기」가 보인다', await 초대.생성.isVisible(), true);
    const 설명 = await verify('설명 「이 서버에 대한 초대 링크를 만들고 공유합니다」가 보인다', await 초대.설명.isVisible(), true);
    await verify('초대 생성 폼에 「사용 횟수 제한」 · 「만기」 선택지와 「초대를 통한 팔로우」 · 「초대 링크 생성하기」, 설명 「이 서버에 대한 초대 링크를 만들고 공유합니다」가 보인다', 횟수 && 만기 && 팔로우 && 생성 && 설명, true);
  });
});

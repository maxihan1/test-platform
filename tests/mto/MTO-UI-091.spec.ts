import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { qa_user2되돌리기 } from './helpers/account.helper.js';
import { 계정번호 } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 조치화면 } from './pages/account-action.page.js';
import { 계정상세화면 } from './pages/account-detail.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-091',
  name: '조치 화면의 유형 아래에 「경고 보내기」 · 「동결」 · 「민감함」 · 「정지」 설명 문구가 기획서 글 그대로 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '조치 대상 qa_user2 가 제재 없는 상태다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 상세 = new 계정상세화면(page);
  const 조치 = new 조치화면(page);
  let 번호 = '';

  try {

    await test.step('Owner 계정으로 로그인하고 qa_user2 제재를 푼다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await qa_user2되돌리기(page);
    });

    await test.step('qa_user2 가 제재 없는 상태인지 확인한다', async () => {
      번호 = await 계정번호(page, 'qa_user2');
      await 상세.열기(번호);
      await verify('조치 대상 qa_user2 가 제재 없는 상태다', (await 상세.상태.innerText()).trim(), '제한 없음', { blocker: true });
    });

    await test.step('qa_user2 의 조치 취하기 화면을 연다', async () => {
      await 조치.열기(번호);
      const 경고 = await verify('「경고 보내기」 설명 문구가 보인다', await 조치.유형설명('이것을 사용해서 어떤 동작도 하지 않고, 사용자에게 경고를 보냅니다.').isVisible(), true);
      const 동결 = await verify('「동결」 설명 문구가 보인다', await 조치.유형설명('사용자가 계정을 사용하는 것을 막지만, 그의 게시물을 삭제하거나 숨기지는 않습니다.').isVisible(), true);
      const 민감함 = await verify('「민감함」 설명 문구가 보인다', await 조치.유형설명('이 사용자의 모든 미디어 첨부를 민감함으로 강제 설정합니다.').isVisible(), true);
      const 정지 = await verify('「정지」 설명 문구가 보인다', await 조치.유형설명('이 계정과의 모든 상호작용을 막고 모든 내용을 삭제합니다. 30일 이내에 되돌리기가 가능합니다. 이 계정에 대한 모든 신고를 닫습니다.').isVisible(), true);
      await verify('조치 화면의 유형 아래에 「경고 보내기」 · 「동결」 · 「민감함」 · 「정지」 설명 문구가 기획서 글 그대로 보인다', 경고 && 동결 && 민감함 && 정지, true);
    });

  } finally {
    await qa_user2되돌리기(page);
  }
});

import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 개인멘션화면 } from './pages/conversations.page.js';
import { 글상세화면 } from './pages/status.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-154',
  name: '개인 멘션 글 카드의 부스트 아이콘이 「부스트와 인용이 비활성화되었습니다」로 꺼져 있다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 대화 = new 개인멘션화면(page);
  const 상세 = new 글상세화면(page);

  await test.step('일반 회원으로 로그인하고 개인 멘션 화면을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 대화.열기();
    await verify('개인 멘션 화면에 대화 글이 보인다', await 대화.글('회의 자료 보냈어요').isVisible(), true, { blocker: true });
  });

  await test.step('개인 멘션 화면에서 대화 글을 연다', async () => {
    await 대화.글열기('회의 자료 보냈어요');
    await 상세.그려질때까지();
    const 보임 = await verify('부스트 아이콘이 「부스트와 인용이 비활성화되었습니다」로 보인다', await 상세.부스트비활성.isVisible(), true);
    const 꺼짐 = await verify('부스트 아이콘이 눌리지 않는다', await 상세.부스트비활성.isDisabled(), true);
    await verify('개인 멘션 글 카드의 부스트 아이콘이 「부스트와 인용이 비활성화되었습니다」로 꺼져 있다', 보임 && 꺼짐, true);
  });
});

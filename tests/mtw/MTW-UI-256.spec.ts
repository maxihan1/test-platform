import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 계정설정화면 } from './pages/account-settings.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-256',
  name: '내보내기 화면에 항목별 개수와 「CSV」 내려받기, 「아카이브 요청하기」가 보인다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});
test(spec, async ({ page, params }) => {
  const 설정 = new 계정설정화면(page);

  await test.step('일반 회원으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
  });

  await test.step('내보내기 화면을 연다', async () => {
    await 설정.열기('/settings/export');
    const 항목 = await verify('「게시물」 · 「팔로우」 · 「필터」 항목 줄이 보인다', (await 설정.글(/^게시물$/).isVisible()) && (await 설정.글(/^팔로우$/).isVisible()) && (await 설정.글(/^필터$/).isVisible()), true);
    const 내려받기 = await verify('「CSV」 내려받기가 보인다', await 설정.링크('CSV').isVisible(), true);
    const 아카이브 = await verify('「아카이브 요청하기」가 보인다', await 설정.버튼('아카이브 요청하기').or(설정.링크('아카이브 요청하기')).first().isVisible(), true);
    await verify('내보내기 화면에 항목별 개수와 「CSV」 내려받기, 「아카이브 요청하기」가 보인다', 항목 && 내려받기 && 아카이브, true);
  });
});

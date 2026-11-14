import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-329',
  name: '남의 프로필에 커버 · 아바타 · 표시 이름 · 핸들 · 팔로우 버튼 · 알림 벨 · 「⋯」가 보인다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 프로필 = new 프로필화면(page);

  await test.step('일반 회원으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 프로필.메뉴.그려질때까지();
    await verify('왼쪽 메뉴에 「홈」 링크가 보인다', await 프로필.메뉴.링크('홈').isVisible(), true, { blocker: true });
  });

  await test.step('hana_photo 프로필을 연다', async () => {
    await 프로필.열기('hana_photo');
    await 프로필.버튼그려질때까지();
    const 커버 = await verify('프로필에 커버가 보인다', await 프로필.커버.isVisible(), true);
    const 아바타 = await verify('프로필에 아바타가 보인다', await 프로필.아바타.isVisible(), true);
    const 이름 = await verify('프로필에 표시 이름이 보인다', await 프로필.표시이름.isVisible(), true);
    const 핸들 = await verify('프로필에 핸들이 보인다', await 프로필.핸들.isVisible(), true);
    const 팔로우 = await verify('프로필에 팔로우 버튼이 보인다', await 프로필.팔로우버튼.isVisible(), true);
    const 벨 = await verify('프로필에 알림 벨이 보인다', await 프로필.알림벨.isVisible(), true);
    const 더보기 = await verify('프로필에 「⋯」가 보인다', await 프로필.더보기.first().isVisible(), true);
    await verify('남의 프로필에 커버 · 아바타 · 표시 이름 · 핸들 · 팔로우 버튼 · 알림 벨 · 「⋯」가 보인다', 커버 && 아바타 && 이름 && 핸들 && 팔로우 && 벨 && 더보기, true);
  });
});

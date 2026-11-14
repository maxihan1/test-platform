import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 로그인상태인가 } from './helpers/maintenance-dash.helper.js';
import { 대시보드화면 } from './pages/dashboard.page.js';

export const spec = defineCase({
  tcId: 'ARO-UI-045',
  name: '대시보드에 카드 「게임 계정」 · 「캐릭터」 · 「정지 중 계정」 · 「채팅 금지 계정」 · 「점검」 · 「게임에 보이는 공지」 · 「오늘 지급」 · 「아직 안 받은 지급 우편」이 보인다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 대시보드 = new 대시보드화면(page);

  await test.step('운영자 계정으로 로그인한다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
    await verify('운영자 세션이 열려 있다', await 로그인상태인가(page), true, { blocker: true });
  });

  await test.step('대시보드를 연다', async () => {
    await 대시보드.열기();
    await 대시보드.틀.그려질때까지();
    await verify(
      '대시보드에 카드 「게임 계정」 · 「캐릭터」 · 「정지 중 계정」 · 「채팅 금지 계정」 · 「점검」 · 「게임에 보이는 공지」 · 「오늘 지급」 · 「아직 안 받은 지급 우편」이 보인다',
      (await 대시보드.카드이름들.allInnerTexts()).map((글) => 글.trim()).join(', '),
      '게임 계정, 캐릭터, 정지 중 계정, 채팅 금지 계정, 점검, 게임에 보이는 공지, 오늘 지급, 아직 안 받은 지급 우편',
    );
  });

  await test.step('카드 아래 안내를 본다', async () => {
    await verify('카드 아래에 안내 「시각은 이 브라우저 시간대로 보입니다. 게임 서버가 읽는 공지 · 점검 상태는 /api/serverstatus 와 같습니다.」가 보인다', await 대시보드.안내.isVisible(), true);
  });
});

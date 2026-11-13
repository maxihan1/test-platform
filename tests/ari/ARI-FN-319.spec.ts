import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 큰제목들, 화면글들, 화면전체글 } from './helpers/html.helper.js';
import { 웹로그인, 화면글 } from './helpers/web.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-319',
  name: '「일반 회원」으로 대시보드를 열면 「Account Dashboard」 · 「Account Settings」 · 「Edit Details」 · 「Change Password」 · 「Welcome back, !」 · 「Your Characters」 · 「Logout」이 보인다',
  apiDoc: 2,
  precondition: ['「일반 회원」 계정이 있다'],
  params: z.object({
    playerId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    playerPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ request, params }) => {
  await test.step('「일반 회원」으로 웹 로그인한 뒤 GET /Account/Dashboard 를 부른다', async () => {
    const 로그인 = await 웹로그인(request, params.playerId ?? '', params.playerPassword ?? '');
    await verify('「일반 회원」 웹 로그인 응답 코드가 302 다', 로그인.status(), 302, { blocker: true });
    const 화면 = await 화면글(request, '/Account/Dashboard');
    await verify('대시보드 응답 코드가 200 이다', 화면.status, 200, { blocker: true });
    const 글들 = 화면글들(화면.html);
    const 제목 = await verify('큰 제목 「Account Dashboard」가 보인다', 큰제목들(화면.html).includes('Account Dashboard'), true);
    const 상자 = await verify('상자 「Account Settings」가 보인다', 글들.includes('Account Settings'), true);
    const 수정 = await verify('버튼 「Edit Details」가 보인다', 글들.includes('Edit Details'), true);
    const 비밀번호 = await verify('버튼 「Change Password」가 보인다', 글들.includes('Change Password'), true);
    const 환영 = await verify('환영 문구 「Welcome back, !」가 보인다', 화면전체글(화면.html).includes('Welcome back, !'), true);
    const 캐릭터 = await verify('소제목 「Your Characters」가 보인다', 글들.includes('Your Characters'), true);
    const 로그아웃 = await verify('버튼 「Logout」이 보인다', 글들.includes('Logout'), true);
    await verify(
      '「일반 회원」으로 대시보드를 열면 「Account Dashboard」 · 「Account Settings」 · 「Edit Details」 · 「Change Password」 · 「Welcome back, !」 · 「Your Characters」 · 「Logout」이 보인다',
      제목 && 상자 && 수정 && 비밀번호 && 환영 && 캐릭터 && 로그아웃,
      true,
    );
  });
});

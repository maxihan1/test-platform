import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호찾기, 계정상세 } from './helpers/api.helper.js';
import { 목록줄글들 } from './helpers/html.helper.js';
import { 웹로그인, 화면글 } from './helpers/web.helper.js';

export const spec = defineCase({
  tcId: 'ARI-FN-321',
  name: '「일반 회원」으로 대시보드를 열면 캐릭터 목록 줄이 캐릭터 이름만으로 보인다',
  apiDoc: 2,
  precondition: ['「일반 회원」 계정이 있다'],
  params: z.object({
    playerId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    playerPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ request, admin, params }) => {
  await test.step('「일반 회원」으로 웹 로그인한 뒤 대시보드의 캐릭터 목록을 읽는다', async () => {
    const 계정번호 = await 계정번호찾기(admin, params.playerId ?? '');
    await verify('「일반 회원」 계정 번호를 찾았다', 계정번호 > 0, true, { blocker: true });
    const 이름들 = ((await 계정상세(admin, 계정번호))?.characters ?? []).map((c) => c.name).sort();
    await verify('「일반 회원」 캐릭터가 하나 이상이다', 이름들.length > 0, true, { blocker: true });
    const 로그인 = await 웹로그인(request, params.playerId ?? '', params.playerPassword ?? '');
    await verify('「일반 회원」 웹 로그인 응답 코드가 302 다', 로그인.status(), 302, { blocker: true });
    const 화면 = await 화면글(request, '/Account/Dashboard');
    await verify('대시보드 응답 코드가 200 이다', 화면.status, 200, { blocker: true });
    await verify('「일반 회원」으로 대시보드를 열면 캐릭터 목록 줄이 캐릭터 이름만으로 보인다', 목록줄글들(화면.html).sort().join(', '), 이름들.join(', '));
  });
});

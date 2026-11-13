import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 대상준비, 시험계정, 시험사유, 적용중찾기, 채운사유 } from './helpers/sanction.helper.js';
import { 글자, 새제재걸기, 적용중제재풀기, 제재해제 } from './helpers/ops-api.helper.js';
import { 유저화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-269',
  name: '해제 사유를 비우고 「확인」을 누르면 토스트 「해제 사유를 1~200자로 입력하세요」가 뜬다',
  precondition: ['qa_player2 에 정지가 걸려 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
    최소글자수: z.number().int().min(1).max(200).describe('해제 사유로 적을 글자 수 — 1~200').default(1),
    한도글자수: z.number().int().min(1).max(200).describe('해제 사유로 적을 글자 수 — 1~200').default(200),
    초과글자수: z.number().int().min(201).describe('API 로 보낼 해제 사유 글자 수 — 201 이상').default(201),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 유저화면(page);
  let 계정 = 0;

  try {
    await test.step('운영자 계정으로 로그인하고 대상 계정에 정지를 걸어 둔다', async () => {
      계정 = await 대상준비(page, params.loginId, params.loginPassword);
      await 새제재걸기(page, 계정, 'SUSPEND', 시험사유('ARO-FN-269'));
    });

    await test.step('「유저 · 제재」에서 정지가 걸린 대상 계정 줄을 확인한다', async () => {
      await 화면.열기(`?q=${시험계정}`);
      await verify('대상 계정 줄에 「정지 해제」 버튼이 보인다', await 화면.줄버튼(시험계정, '정지 해제').isVisible(), true, { blocker: true });
    });

    await test.step('해제 사유를 비우고 「확인」을 누른다', async () => {
      await 화면.제재창열기(시험계정, '정지 해제');
      await 화면.창.누르기('확인');
      const 떴다 = await 화면.알림.뜰때까지('해제 사유를 1~200자로 입력하세요');
      await verify('해제 사유를 비우고 「확인」을 누르면 토스트 「해제 사유를 1~200자로 입력하세요」가 뜬다', 떴다, true);
    });

    await test.step('해제 사유 1자로 해제한다', async () => {
      await 화면.제재창열기(시험계정, '정지 해제');
      await 화면.해제사유칸.fill(글자(params.최소글자수));
      await verify('해제 사유 칸에 적은 글자 수가 그대로 들어 있다', (await 화면.해제사유칸.inputValue()).length, params.최소글자수, { blocker: true });
      await 화면.창.누르기('확인');
      await 화면.알림.뜰때까지('정지를 해제했습니다');
      await verify('해제 사유 1자로 해제된다', (await 적용중찾기(page, 계정, 'SUSPEND')) === null, true);
    });

    await test.step('해제 사유 200자로 해제한다', async () => {
      await 새제재걸기(page, 계정, 'SUSPEND', 시험사유('ARO-FN-269'));
      await 화면.새로고침();
      await 화면.제재창열기(시험계정, '정지 해제');
      await 화면.해제사유칸.fill(채운사유(시험사유('ARO-FN-269'), params.한도글자수));
      await verify('해제 사유 칸에 적은 글자 수가 그대로 들어 있다', (await 화면.해제사유칸.inputValue()).length, params.한도글자수, { blocker: true });
      await 화면.창.누르기('확인');
      await 화면.알림.뜰때까지('정지를 해제했습니다');
      await verify('해제 사유 200자로 해제된다', (await 적용중찾기(page, 계정, 'SUSPEND')) === null, true);
    });

    await test.step('API 로 해제 사유 201자를 보낸다', async () => {
      const 번호 = await 새제재걸기(page, 계정, 'SUSPEND', 시험사유('ARO-FN-269'));
      const 응답 = await 제재해제(page, 번호, 채운사유(시험사유('ARO-FN-269'), params.초과글자수));
      const 코드 = await verify('응답 코드가 400 이다', 응답.status, 400);
      const 문구 = await verify('거절 문구가 「해제 사유를 1~200자로 입력하세요」다', 응답.body.message, '해제 사유를 1~200자로 입력하세요');
      await verify('해제 사유 201자는 「해제 사유를 1~200자로 입력하세요」로 거절된다', 코드 && 문구, true);
    });
  } finally {
    if (계정 > 0) await 적용중제재풀기(page, 계정);
  }
});

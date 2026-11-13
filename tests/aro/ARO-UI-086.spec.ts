import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 대상준비, 시험계정, 시험사유 } from './helpers/sanction.helper.js';
import { 새제재걸기, 적용중제재풀기 } from './helpers/ops-api.helper.js';
import { 유저화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'ARO-UI-086',
  name: '상세 패널 제재 이력의 「해제」를 누르면 확인 창 「qa_player2 의 정지를 해제할까요?」와 「계속」 · 「닫기」가 보인다',
  precondition: ['qa_player2 에 정지가 걸려 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 유저화면(page);
  const 사유 = 시험사유('ARO-UI-086');
  let 계정 = 0;

  try {
    await test.step('운영자 계정으로 로그인하고 대상 계정에 정지를 걸어 둔다', async () => {
      계정 = await 대상준비(page, params.loginId, params.loginPassword);
      await 새제재걸기(page, 계정, 'SUSPEND', 사유);
    });

    await test.step('상세 패널의 제재 이력에서 걸어 둔 정지를 확인한다', async () => {
      await 화면.상세열기(계정);
      await verify('걸어 둔 정지 줄에 「해제」 버튼이 보인다', await 화면.제재행해제버튼(사유).isVisible(), true, { blocker: true });
    });

    await test.step('상세 패널 제재 이력의 「해제」를 누른다', async () => {
      await 화면.제재행해제버튼(사유).click();
      const 열렸다 = await 화면.창.열릴때까지();
      const 안내 = await verify('확인 창에 「qa_player2 의 정지를 해제할까요?」가 보인다', 열렸다 ? (await 화면.창.본문.innerText()).trim() : '', `${시험계정} 의 정지를 해제할까요?`);
      const 계속 = await verify('「계속」 버튼이 보인다', await 화면.창.버튼('계속').isVisible(), true);
      const 닫기 = await verify('「닫기」 버튼이 보인다', await 화면.창.버튼('닫기').isVisible(), true);
      await verify('상세 패널 제재 이력의 「해제」를 누르면 확인 창 「qa_player2 의 정지를 해제할까요?」와 「계속」 · 「닫기」가 보인다', 안내 && 계속 && 닫기, true);
    });

    await test.step('확인 창의 「계속」을 누른다', async () => {
      await 화면.창.누르기('계속');
      const 열렸다 = await 화면.창.열릴때까지();
      const 제목 = 열렸다 ? await 화면.창.제목.innerText() : '';
      await verify('확인 창 「계속」 뒤에 「정지 해제」 사유 창이 열린다', 제목.trim(), '정지 해제');
    });
  } finally {
    if (계정 > 0) await 적용중제재풀기(page, 계정);
  }
});

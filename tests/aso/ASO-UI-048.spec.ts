import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 백오피스화면 } from './pages/backoffice.page.js';

export const spec = defineCase({
  tcId: 'ASO-UI-048',
  name: '정리 탭 버튼 반응',
  precondition: ['정리 탭을 열었다'],
  expected: z.object({
    월드초기화확인문구: z.string().describe('월드 초기화 확인 창 문구').default('바닥 아이템과 봇을 초기화할까요?'),
  }),
  params: null,
});

test(spec, async ({ page, expected }) => {
  const 화면 = new 백오피스화면(page);

  await test.step('정리 탭을 연다', async () => {
    await 화면.열기();
    await 화면.정리탭.click();
    await verify('「테스트 계정 삭제」 카드가 보인다', await 화면.계정삭제제목.isVisible(), true, { blocker: true });
  });

  await test.step('「삭제」를 누르고 확인 창은 취소한다', async () => {
    const 접두어 = '';
    const 문구 = await 화면.확인창문구받고취소(화면.계정삭제버튼);
    await verify('정리 탭에서 「삭제」를 누르면 확인 창 「"<접두어>" 로 시작하는 계정을 모두 지울까요? 되돌릴 수 없습니다.」가 뜬다', 문구, `"${접두어}" 로 시작하는 계정을 모두 지울까요? 되돌릴 수 없습니다.`);
  });

  await test.step('「바닥 아이템·봇 초기화」를 누르고 확인 창은 취소한다', async () => {
    const 문구 = await 화면.확인창문구받고취소(화면.월드초기화버튼);
    await verify('정리 탭에서 「바닥 아이템·봇 초기화」를 누르면 확인 창 「바닥 아이템과 봇을 초기화할까요?」가 뜬다', 문구, expected.월드초기화확인문구);
  });
});

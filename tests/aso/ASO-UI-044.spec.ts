import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 백오피스화면 } from './pages/backoffice.page.js';

export const spec = defineCase({
  tcId: 'ASO-UI-044',
  name: '캐릭터 탭 버튼 반응',
  precondition: ['맞는 키를 저장했다', '캐릭터 상세를 열었다'],
  params: z.object({
    password: z.string().describe('관리 키 — 대상 서버 테스트 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    초기화확인문구: z.string().describe('초기화 확인 창 문구').default('이 캐릭터를 새 캐릭터 상태로 되돌릴까요? 아이템이 모두 사라집니다.'),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 화면 = new 백오피스화면(page);

  await test.step('백오피스를 열고 맞는 키를 저장한다', async () => {
    await 화면.열기();
    const 응답 = await 화면.키저장하고목록기다리기(params.password ?? '');
    await verify('키 저장 뒤 캐릭터 검색 응답이 성공이다', 응답.ok(), true, { blocker: true });
  });

  await test.step('목록 첫 캐릭터 줄을 누른다', async () => {
    await 화면.캐릭터열기(화면.캐릭터줄들.first());
    await verify('캐릭터 탭에서 캐릭터 줄을 누르면 상세의 「값 바꾸기」가 보인다', await 화면.값바꾸기제목.isVisible(), true);
  });

  await test.step('「새 캐릭터 상태로 초기화」를 누르고 확인 창은 취소한다', async () => {
    const 문구 = await 화면.확인창문구받고취소(화면.초기화버튼);
    await verify('캐릭터 탭에서 「새 캐릭터 상태로 초기화」를 누르면 확인 창 「이 캐릭터를 새 캐릭터 상태로 되돌릴까요? 아이템이 모두 사라집니다.」가 뜬다', 문구, expected.초기화확인문구);
  });

  await test.step('「적용」을 본다', async () => {
    const 보임 = await verify('「적용」 버튼이 보인다', await 화면.적용버튼.isVisible(), true);
    const 눌림 = await verify('「적용」 버튼을 누를 수 있다', await 화면.적용버튼.isEnabled(), true);
    await verify('캐릭터 탭에서 「적용」 버튼이 보이고 누를 수 있다', 보임 && 눌림, true);
  });

  await test.step('「지급」을 본다', async () => {
    const 보임 = await verify('「지급」 버튼이 보인다', await 화면.지급버튼.isVisible(), true);
    const 눌림 = await verify('「지급」 버튼을 누를 수 있다', await 화면.지급버튼.isEnabled(), true);
    await verify('캐릭터 탭에서 「지급」 버튼이 보이고 누를 수 있다', 보임 && 눌림, true);
  });
});

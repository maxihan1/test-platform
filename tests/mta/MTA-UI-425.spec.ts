import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 필터편집화면 } from './pages/filter-edit.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 계정설정화면 } from './pages/set-account.page.js';
import { 필터목록화면 } from './pages/set-filters.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-425',
  name: '필터 삭제는 「“<제목>” 필터를 삭제하시겠습니까?」 / 「이 필터는 당신의 모든 기기의 계정에서 삭제됩니다.」를 묻는다',
  platforms: ['android'],
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 설정 = new 설정화면(driver);
  const 계정설정 = new 계정설정화면(driver);
  const 필터목록 = new 필터목록화면(driver);
  const 편집 = new 필터편집화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('설정에서 필터 목록을 연다', async () => {
    await 설정.열기();
    await 설정.계정줄누르기();
    await 계정설정.줄누르기('필터');
    await verify('필터 목록에 「필터 추가」 단추가 보인다', await 필터목록.떴나(), true, { blocker: true });
  });
  await test.step('필터 「스포일러」 편집에서 「필터 삭제」를 누른다', async () => {
    await 필터목록.줄누르기('스포일러');
    await verify('필터 편집 화면이 열린다', await 편집.떴나(), true);
    await 편집.삭제누르기();
    const 제목 = await verify('삭제 확인 창에 「“<제목>” 필터를 삭제하시겠습니까?」가 보인다', await 편집.글보이나('“<제목>” 필터를 삭제하시겠습니까?'), true);
    const 안내 = await verify('삭제 확인 창에 「이 필터는 당신의 모든 기기의 계정에서 삭제됩니다.」가 보인다', await 편집.글보이나('이 필터는 당신의 모든 기기의 계정에서 삭제됩니다.'), true);
    await verify('필터 삭제는 「“<제목>” 필터를 삭제하시겠습니까?」 / 「이 필터는 당신의 모든 기기의 계정에서 삭제됩니다.」를 묻는다', 제목 && 안내, true);
    await 편집.취소하기();
  }, { capture: true });
});

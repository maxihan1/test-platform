import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 필터편집화면 } from './pages/filter-edit.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 뮤트된단어화면 } from './pages/muted-words.page.js';
import { 계정설정화면 } from './pages/set-account.page.js';
import { 필터목록화면 } from './pages/set-filters.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-493',
  name: '새 필터 뮤트된 단어에서 「뮤트할 단어 추가」로 단어를 더하면 뮤트된 단어 화면(「뮤트된 단어」)에서 「뮤트할 단어 추가」(「단어 또는 어구」, 「단어는 대소문자를 구분하지 않으며, 전체 단어 단위로만 일치합니다.」)로 단어를 더하고 「뮤트된 단어 편집」으로 고친다',
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
  const 단어 = new 뮤트된단어화면(driver);

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
  await test.step('필터 목록에서 필터 추가 화면을 연다', async () => {
    await 필터목록.추가누르기();
    await verify('필터 편집 화면에 「기간」 줄이 보인다', await 편집.떴나(), true, { blocker: true });
  });
  await test.step('새 필터 뮤트된 단어에서 「뮤트할 단어 추가」로 단어를 더한다', async () => {
    await 편집.줄누르기('뮤트된 단어');
    const 화면 = await verify('뮤트된 단어 화면이 열린다', await 단어.떴나(), true);
    await 단어.추가창열기();
    const 힌트 = await verify('「단어 또는 어구」가 보인다', await 단어.글보이나('단어 또는 어구'), true);
    const 안내 = await verify('「단어는 대소문자를 구분하지 않으며, 전체 단어 단위로만 일치합니다.」가 보인다', await 단어.글보이나('단어는 대소문자를 구분하지 않으며, 전체 단어 단위로만 일치합니다.'), true);
    await 단어.단어넣고확인('mta단어');
    const 더함 = await verify('더한 단어 「mta단어」가 목록에 보인다', await 단어.글자보이나('mta단어'), true);
    await 단어.단어누르기('mta단어');
    const 고침 = await verify('「뮤트된 단어 편집」이 보인다', await 단어.글보이나('뮤트된 단어 편집'), true);
    await verify('새 필터 뮤트된 단어에서 「뮤트할 단어 추가」로 단어를 더하면 뮤트된 단어 화면(「뮤트된 단어」)에서 「뮤트할 단어 추가」(「단어 또는 어구」, 「단어는 대소문자를 구분하지 않으며, 전체 단어 단위로만 일치합니다.」)로 단어를 더하고 「뮤트된 단어 편집」으로 고친다', 화면 && 힌트 && 안내 && 더함 && 고침, true);
  }, { capture: true });
});

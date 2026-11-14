import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { apiGet, 글지우기API, 몸 } from './helpers/api.helper.js';
import { 표식 } from './helpers/page-setup.helper.js';

export const spec = defineCase({
  tcId: 'MTW-FN-316',
  name: '홈을 열면 팔로우한 hana_photo 의 글이 보인다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 표 = 표식('mine');
  let 글번호: string | undefined;

  await test.step('일반 회원으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await verify('로그인 후 오른쪽 메뉴에 「홈」이 보인다', await 홈.메뉴.링크(/^홈/).waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });

  await test.step('홈을 연다', async () => {
    await 홈.열기();
    await verify('홈에 작성 상자가 보인다', await 홈.작성.영역.isVisible(), true, { blocker: true });
    let 있다 = false;
    let 끝번호 = '';
    for (let 쪽 = 0; 쪽 < 5 && !있다; 쪽 += 1) {
      const 목록 = await 몸<{ id: string; account: { acct: string } }[]>(await apiGet(page, `/api/v1/timelines/home?limit=40${끝번호 === '' ? '' : `&max_id=${끝번호}`}`));
      있다 = 목록.some((글) => 글.account.acct === 'hana_photo');
      끝번호 = 목록.at(-1)?.id ?? '';
      if (끝번호 === '') break;
    }
    await verify('홈을 열면 팔로우한 hana_photo 의 글이 보인다', 있다, true);
  });

  try {
    await test.step('작성 상자로 공개 글을 게시한다', async () => {
      await 홈.작성.쓰기(`홈 맨 위 확인 ${표}`);
      글번호 = (await 홈.작성.게시하기()).id;
      const 보인다 = await 홈.글(표).first().waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('목록에 방금 쓴 글이 보인다', 보인다, true);
      await verify('방금 쓴 내 글이 홈 목록 맨 위에 보인다', (await 홈.첫글.innerText()).includes(표), true);
    });
  } finally {
    if (글번호 !== undefined) await 글지우기API(page, 글번호);
  }
});

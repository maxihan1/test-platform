import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정찾기API } from './helpers/api.helper.js';
import { 관계API, 관계바꾸기API } from './helpers/account-api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 차단창 } from './pages/block-dialog.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-661',
  name: '프로필 「계정 차단」에서 「차단」을 누르면 그 계정이 차단된다',
  precondition: ['두 번째 사용자로 로그인해 있다'],
  params: z.object({
    secondId: z.string().describe('두 번째 사용자 이메일').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 암호').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 프로필 = new 프로필화면(page);
  const 창 = new 차단창(page);
  let 대상id = '';

  try {
    await test.step('두 번째 사용자로 로그인하고 news_bot 프로필을 연다', async () => {
      await 로그인하기(page, params.secondId, params.secondPassword);
      대상id = (await 계정찾기API(page, 'news_bot')).id;
      await 관계바꾸기API(page, 대상id, 'unblock');
      await 프로필.열기('news_bot');
      await 프로필.버튼그려질때까지();
      await verify('프로필 「⋯」 버튼이 보인다', await 프로필.더보기.isVisible(), true, { blocker: true });
    });

    await test.step('두 번째 사용자로 news_bot 프로필의 「계정 차단」을 누른다', async () => {
      await 프로필.더보기열기();
      await 프로필.펼침.항목(/^계정 차단$/).click();
      await 창.뜰때까지();
      await verify('차단 창 제목은 「사용자를 차단할까요?」다', await 창.제목.innerText(), '사용자를 차단할까요?');
    });

    await test.step('두 번째 사용자로 news_bot 프로필의 「계정 차단」을 누르고 창의 「차단」을 누른다', async () => {
      await 창.차단.click();
      await 프로필.팔로우버튼.filter({ hasText: '차단 해제' }).waitFor();
      await verify('프로필 「계정 차단」에서 「차단」을 누르면 그 계정이 차단된다', (await 관계API(page, 대상id)).blocking, true);
    });
  } finally {
    if (대상id !== '') await 관계바꾸기API(page, 대상id, 'unblock');
  }
});

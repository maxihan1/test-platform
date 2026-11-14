import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { apiDelete, apiPost, 몸 } from './helpers/api.helper.js';
import { 계정찾기API } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 표식 } from './helpers/page-setup.helper.js';

export const spec = defineCase({
  tcId: 'MTW-FN-618',
  name: '이미 든 구성원을 다시 넣으면 「이미 목록에 존재합니다」가 돌아온다',
  techniques: ['동등 분할'],
  precondition: ['일반 회원이 만든 임시 리스트가 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  let 리스트id = '';
  let 구성원id = '';
  let 남id = '';

  try {
    await test.step('일반 회원으로 로그인하고 임시 리스트에 구성원 하나를 넣는다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      리스트id = (await 몸<{ id: string }>(await apiPost(page, '/api/v1/lists', { title: 표식('list') }))).id;
      구성원id = (await 계정찾기API(page, 'qa_user2')).id;
      남id = (await 계정찾기API(page, 'qa_admin')).id;
      const 응답 = await apiPost(page, `/api/v1/lists/${리스트id}/accounts`, { account_ids: [구성원id] });
      await verify('임시 리스트에 구성원이 들어간다', 응답.ok(), true, { blocker: true });
    });

    await test.step('리스트 구성원 추가 API 로 이미 든 계정을 다시 넣는다', async () => {
      const 응답 = await apiPost(page, `/api/v1/lists/${리스트id}/accounts`, { account_ids: [구성원id] });
      await verify('이미 든 구성원을 다시 넣으면 「이미 목록에 존재합니다」가 돌아온다', (await 응답.text()).includes('이미 목록에 존재합니다'), true);
    });

    await test.step('리스트 구성원 추가 API 로 팔로우하지 않은 계정을 넣는다', async () => {
      const 응답 = await apiPost(page, `/api/v1/lists/${리스트id}/accounts`, { account_ids: [남id] });
      await verify('팔로우하지 않은 계정에는 「팔로우한 계정이어야 합니다」가 돌아온다', (await 응답.text()).includes('팔로우한 계정이어야 합니다'), true);
    });
  } finally {
    if (리스트id !== '') await apiDelete(page, `/api/v1/lists/${리스트id}`);
  }
});

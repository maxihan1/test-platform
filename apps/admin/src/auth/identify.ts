// 요청 하나를 받아 「이 사람이 누구인가」만 돌려준다. SPEC §3.5 가 말하는 갈아 끼울 자리다.
// 나중에 회사 계정(SSO)으로 바꾸면 **바뀌는 곳이 이 파일 하나여야 한다** —
// 실행·카탈로그·리포팅은 돌려받은 값만 쓰고 비밀번호도 세션도 모른다

import { 사용자와해시, type 사용자 } from './store.js';

// FastifyRequest 를 통째로 받지 않는다. 여기가 요청에서 읽는 것은 세션 한 칸뿐이고,
// 그래야 SSO 로 갈아 끼울 때 무엇을 대신 채워야 하는지가 한눈에 보인다
export interface 인증요청 {
  session: { get(key: 'username'): string | undefined };
}

export async function 확인(req: 인증요청): Promise<사용자 | null> {
  const username = req.session.get('username');
  if (username === undefined || username === '') return null;

  // 세션이 살아 있어도 계정이 비활성이 됐으면 그 자리에서 끊긴다
  const 찾은것 = await 사용자와해시(username);
  return 찾은것 === null ? null : 찾은것.user;
}

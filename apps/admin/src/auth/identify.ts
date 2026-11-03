// 요청 하나를 받아 「이 사람이 누구인가」만 돌려준다. SPEC §3.5 가 말하는 갈아 끼울 자리다.
// 나중에 회사 계정(SSO)으로 바꾸면 **바뀌는 곳이 이 파일 하나여야 한다** —
// 실행·카탈로그·리포팅은 돌려받은 값만 쓰고 비밀번호도 세션도 모른다

import { 작성계정인가, 토큰주인, 헤더토큰 } from './agentToken.js';
import { SSO설정읽기 } from './oidc.js';
import { 출입증수명 } from './session.js';
import { 비밀번호도장, 사용자와해시, type 사용자 } from './store.js';

// FastifyRequest 를 통째로 받지 않는다. 여기가 요청에서 읽는 것은 세션 칸 몇 개와 헤더 한 칸뿐이고,
// 그래야 SSO 로 갈아 끼울 때 무엇을 대신 채워야 하는지가 한눈에 보인다
export interface 인증요청 {
  session: {
    get(key: 'username' | 'stamp' | 'method' | 'authSid'): string | undefined;
    get(key: 'loginAt'): number | undefined;
  };
  headers?: { authorization?: string };
}

/** 에이전트 토큰을 내민 요청인가. 문이 이것으로 통로 허용 목록을 건다 (SPEC 도메인/인증 §7) */
export function 토큰으로왔나(req: 인증요청): boolean {
  return req.headers?.authorization !== undefined;
}

export async function 확인(req: 인증요청): Promise<사용자 | null> {
  // 토큰을 내밀었으면 토큰으로만 판정한다 — 틀렸다고 세션으로 넘어가면 틀린 열쇠가 통한다
  const 토큰 = 헤더토큰(req.headers?.authorization);
  const username = 토큰 === null ? req.session.get('username') : 토큰 === '틀림' ? null : await 토큰주인(토큰);
  if (username === undefined || username === null || username === '') return null;

  // 세션이 살아 있어도 계정이 비활성·승인 대기면 그 자리에서 끊긴다
  const 찾은것 = await 사용자와해시(username, 토큰 === null ? req.session.get('authSid') : undefined);
  if (찾은것 === null) return null;
  // 토큰은 비밀번호와 따로 노는 열쇠라 출입증 검사를 안 한다 (SPEC 도메인/인증 §7)
  const SSO켜짐 = SSO설정읽기() !== null;
  if (토큰 === null && !출입증맞나(req, 찾은것.passwordHash, SSO켜짐)) return null;
  if (토큰 === null && SSO켜짐 && Auth가끊었나(req, 찾은것)) return null;
  // 작성 에이전트 계정은 토큰으로만 쓴다. SSO 로 묶인 뒤 서버가 에이전트 이름을 그 계정으로 바꾸면 사람의 출입증이 살아 있다 (sso.ts 계정찾기)
  if (토큰 === null && SSO켜짐 && 작성계정인가(username)) return null;
  // SSO 설치에는 비밀번호 바꾸기 길이 없다 — 변경 강제를 남기면 묶인 기본 계정 admin 이 변경 화면에 갇힌다.
  // DB 값은 지우지 않는다. SSO 를 끄면 admin/admin 의 변경 강제가 되살아나야 한다
  if (SSO켜짐) return { ...찾은것.user, mustChangePassword: false };
  return 찾은것.user;
}

/**
 * SSO 가 켜진 설치는 SSO 로 구운 출입증만, 꺼진 설치는 비밀번호 도장이 맞는 출입증만 받는다.
 * 켜고 끄는 순간 반대쪽 출입증이 저절로 끊긴다. 비밀번호가 바뀌면 옛 도장의 출입증이 끊긴다 (SPEC 도메인/인증 §7)
 */
function 출입증맞나(req: 인증요청, passwordHash: string | null, SSO켜짐: boolean): boolean {
  if (SSO켜짐) return req.session.get('method') === 'sso';
  return passwordHash !== null && req.session.get('stamp') === 비밀번호도장(passwordHash);
}

/**
 * Auth_platform 이 back-channel 로 끝났다고 알린 SSO 출입증인가 (SPEC 도메인/인증 §7 「인증 적용 범위」).
 * 그 Auth 세션(sid)이 끝났거나 그 사람의 세션이 다 끊긴 시각보다 앞에 구웠으면 끊는다. 구운 시각이 없는 옛(S24 전) 출입증은 그 시각이 있으면 끊는다
 */
function Auth가끊었나(req: 인증요청, 찾은것: { sessionsValidAfter: Date | null; sidRevoked: boolean }): boolean {
  const loginAt = req.session.get('loginAt');
  // 끊긴 sid 는 25시간만 기억한다(sso.ts). 출입증은 칸을 고칠 때마다(로그인 시작만 눌러도) 수명이 늘어 그보다 오래 살 수 있다 —
  // 구운 시각으로 수명을 다시 재야 지워진 sid 의 출입증이 되살아나지 않는다
  if (loginAt !== undefined && Date.now() - loginAt > 출입증수명 * 1000) return true;
  if (찾은것.sidRevoked) return true;
  return 찾은것.sessionsValidAfter !== null && (loginAt ?? 0) < 찾은것.sessionsValidAfter.getTime();
}

export interface 계정 {
  loginId: string;
  password: string;
}

export function 계정값(params: { loginId?: string; password?: string }): 계정 {
  if (!params.loginId || !params.password) {
    throw new Error('일반 회원 계정 값이 없다 — 대상 서버 줄에 일반 회원 계정을 넣는다');
  }
  return { loginId: params.loginId, password: params.password };
}

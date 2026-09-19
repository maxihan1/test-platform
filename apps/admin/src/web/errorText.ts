// 서버가 준 오류 코드를 사람이 읽는 한 문장으로 바꾼다. 화면 어디서든 같은 말투를 쓴다 (DESIGN.md)

// 서버가 내는 코드 중 **사람이 실제로 만나는 것**만 옮긴다.
// 전부 옮기려 들면 서버가 짚어 준 사유를 버리게 된다 (§8.2 의 INVALID_REQUEST 가 그랬다)
const 옮길것: Record<string, (detail: string) => string> = {
  // 실행 결과·증적 주소는 사람이 메신저에 붙여 나누는 링크다 (§8.4).
  // 배정 안 받은 사람이 눌렀을 때 무슨 일인지와 빠져나갈 길을 같이 준다
  SERVICE_FORBIDDEN: () =>
    '이 서비스에 배정받지 않았습니다. 운영 등급인 사람에게 배정을 요청하세요.',
  FORBIDDEN: (detail) =>
    detail === ''
      ? '이 일을 할 수 있는 등급이 아닙니다.'
      : `이 일에는 '${등급이름(detail)}' 등급이 필요합니다.`,
  UNAUTHENTICATED: () => '로그인이 풀렸습니다. 다시 로그인하세요.',
  RUN_NOT_FOUND: () => '그 실행을 찾지 못했습니다. 주소가 틀렸거나 지워진 기록입니다.',
  RUN_ITEM_NOT_FOUND: () => '그 실행 항목을 찾지 못했습니다.',
  EVIDENCE_NOT_FOUND: () => '그 증적 문서를 찾지 못했습니다.',
  CASE_NOT_FOUND: () => '그 케이스를 찾지 못했습니다. 스캔에서 빠졌을 수 있습니다.',
  PARAM_SET_NOT_FOUND: () => '그 입력값 묶음을 찾지 못했습니다.',
  SCREENSHOT_NOT_FOUND: () => '그 화면 사진을 찾지 못했습니다.',
  EVIDENCE_NOT_READY: () => '증적 문서가 아직 만들어지는 중입니다.',
  SERVICE_REQUIRED: () => '어느 서비스인지 고르지 않았습니다. 맨 위 띠에서 서비스를 고르세요.',
};

const 등급표: Record<string, string> = {
  viewer: '보기만',
  operator: '실행까지',
  admin: '운영',
};

function 등급이름(role: string): string {
  return 등급표[role] ?? role;
}

/**
 * `code` 는 서버가 낸 `error` 값, `detail` 은 그 옆에 실려 온 설명이다.
 * 모르는 코드면 **서버가 준 설명을 그대로** 쓴다 — 우리가 지어낸 말로 덮으면
 * 어느 칸이 문제인지 서버만 아는 정보를 버리게 된다.
 */
export function 요청오류문장(code: string, detail: string): string {
  const 옮기기 = 옮길것[code];
  if (옮기기 !== undefined) return 옮기기(detail);
  return detail !== '' ? detail : `요청이 실패했습니다 (${code}).`;
}

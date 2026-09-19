// 서버가 준 오류 코드를 사람이 읽는 한 문장으로 바꾼다. 화면 어디서든 같은 말투를 쓴다 (DESIGN.md)
// 설정 화면의 설정오류문장() 도 이 표를 쓴다 — 표가 둘이면 코드를 옮길 때마다 어느 쪽에 넣을지 갈린다

// 서버가 내는 코드 중 **사람이 실제로 만나는 것**만 옮긴다.
// 전부 옮기려 들면 서버가 짚어 준 사유를 버리게 된다 (§8.2 의 INVALID_REQUEST 가 그랬다).
//
// **말투는 마침표 없는 `~합니다` 로 맞춘다.** 설정 화면이 이미 그렇게 쓰고 있어서,
// 여기만 다르면 같은 화면에서 불러오기 실패와 저장 실패가 다른 말투로 뜬다
export const 오류말: Record<string, string> = {
  // 실행 결과·증적 주소는 사람이 메신저에 붙여 나누는 링크다 (§8.4).
  // 배정 안 받은 사람이 눌렀을 때 무슨 일인지와 빠져나갈 길을 같이 준다
  SERVICE_FORBIDDEN: '이 서비스에 배정받지 않았습니다. 운영 등급인 사람에게 배정을 요청합니다',
  UNAUTHENTICATED: '로그인이 풀렸습니다. 다시 로그인합니다',
  SERVICE_REQUIRED: '어느 서비스인지 고르지 않았습니다. 맨 위 띠에서 서비스를 고릅니다',

  RUN_NOT_FOUND: '그 실행을 찾지 못했습니다. 주소가 틀렸거나 지워진 기록입니다',
  RUN_ITEM_NOT_FOUND: '그 실행 항목을 찾지 못했습니다',
  EVIDENCE_NOT_FOUND: '그 증적 문서를 찾지 못했습니다',
  EVIDENCE_FILE_NOT_FOUND: '증적 문서 파일이 서버에 없습니다. 다시 만듭니다',
  CASE_NOT_FOUND: '그 케이스를 찾지 못했습니다. 스캔에서 빠졌을 수 있습니다',
  PARAM_SET_NOT_FOUND: '그 입력값 묶음을 찾지 못했습니다',
  SCREENSHOT_NOT_FOUND: '그 화면 사진을 찾지 못했습니다',
  SOURCE_NOT_FOUND: '그 테스트 코드 파일을 읽지 못했습니다. 캐시가 낡았을 수 있습니다',

  // 화면이 버튼을 잠그는 것과 서버가 막는 것 사이의 틈에서 만난다 — 새로고침 직후나 두 탭.
  // 이게 없으면 서버가 보낸 detail 인 'RUNNING' 이 영문 그대로 화면에 뜬다 (SPEC §7)
  RUN_NOT_FINISHED: '아직 도는 중인 실행입니다. 끝난 뒤에 증적 문서를 만듭니다',

  MIXED_SERVICE: '한 실행에는 한 서비스의 케이스만 담습니다',
  ENV_NOT_FOUND: '그 대상 서버가 이 서비스에 없습니다. 설정에서 먼저 넣습니다',
  TOO_MANY_ITEMS: '한 번에 만들 수 있는 항목 수를 넘었습니다',

  // 설정 화면이 쓰던 것. 표를 합쳐 둔다
  PREFIX_TAKEN: '그 접두사는 이미 다른 서비스가 쓰고 있습니다',
  PREFIX_SHAPE: '접두사 모양이 다릅니다. 대문자로 시작하는 영문·숫자 12자 이내입니다',
  PREFIX_IMMUTABLE: '접두사는 만든 뒤에 바꿀 수 없습니다. 케이스 번호 안에 이미 박혀 있습니다',
  USERNAME_TAKEN: '그 아이디는 이미 있습니다',
  LAST_ADMIN: '마지막 운영 계정입니다. 먼저 다른 사람을 운영으로 올립니다',
  NOT_FOUND: '그 항목을 찾지 못했습니다. 다른 사람이 지웠을 수 있습니다',
  INVALID_REQUEST: '넣은 값 중에 모양이 다른 것이 있습니다',
};

const 등급표: Record<string, string> = {
  viewer: '보기만',
  operator: '실행까지',
  admin: '운영',
};

/**
 * 등급이 모자란 자리는 서버가 `need` 로 필요한 등급을 알려 준다 (`gate.ts` 의 FORBIDDEN).
 * **아는 등급일 때만 이름을 적는다** — 모르는 값을 그대로 끼워 넣으면
 * 「이 일에는 '요청이 실패했다 (403)' 등급이 필요합니다」 같은 문장이 나온다 (2026-09-19 실측)
 */
function 등급문장(need: string): string {
  const 이름 = 등급표[need];
  return 이름 === undefined ? '이 일을 할 수 있는 등급이 아닙니다' : `이 일에는 '${이름}' 등급이 필요합니다`;
}

/**
 * `code` 는 서버가 낸 `error` 값, `detail` 은 그 옆에 실려 온 설명이다.
 *
 * **모르는 코드면 서버가 준 설명을 그대로** 쓴다 — 우리가 지어낸 말로 덮으면
 * 어느 칸이 문제인지 서버만 아는 정보를 버리게 된다.
 * **아는 코드여도 `detail` 을 버리지 않는다.** 「그 케이스를 찾지 못했습니다」만 뜨면
 * 여러 건을 걸었을 때 **어느 케이스인지** 알 길이 없다.
 */
export function 요청오류문장(code: string, detail?: string): string {
  if (code === 'FORBIDDEN') return 등급문장(detail ?? '');

  const 말 = 오류말[code];
  if (말 === undefined) {
    return detail !== undefined && detail !== '' ? detail : `요청이 실패했습니다 (${code})`;
  }
  return detail === undefined || detail === '' ? 말 : `${말} — ${detail}`;
}

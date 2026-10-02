// 서버 오류 문장과 증적 버튼 글자의 영어 (SPEC §8.4 · errorText.ts). 키는 한국어 원문이다
// 오류 문장을 따로 둔 이유는 하나다 — 한 화면에 속하지 않고 **어느 화면에서든 뜬다**

export const 오류영어: Record<string, string> = {
  // 배정과 세션
  '이 서비스에 배정받지 않았습니다. 운영 계정인 사람에게 배정을 요청합니다':
    'You are not assigned to this service. Ask an admin to assign you.',
  '로그인이 풀렸습니다. 다시 로그인합니다': 'Your session ended. Please sign in again.',
  '어느 서비스인지 고르지 않았습니다. 맨 위 띠에서 서비스를 고릅니다':
    'No service selected. Choose one in the sidebar.',

  // 못 찾은 것들
  '그 실행을 찾지 못했습니다. 주소가 틀렸거나 지워진 기록입니다':
    'Run not found. The link may be wrong or the record was removed.',
  '그 실행 항목을 찾지 못했습니다': 'Run item not found',
  '그 증적 문서를 찾지 못했습니다': 'Evidence document not found',
  '증적 문서 파일이 서버에 없습니다. 다시 만듭니다':
    'The evidence file is missing on the server. Generate it again.',
  '그 케이스를 찾지 못했습니다. 스캔에서 빠졌을 수 있습니다':
    'Case not found. It may have dropped out of the last scan.',
  '그 입력값 묶음을 찾지 못했습니다': 'Parameter set not found',
  '그 화면 사진을 찾지 못했습니다': 'Screenshot not found',
  '그 테스트 코드 파일을 읽지 못했습니다. 캐시가 오래되었을 수 있습니다':
    'Could not read the test file. The cache may be stale.',
  '그 항목을 찾지 못했습니다. 다른 사람이 지웠을 수 있습니다':
    'Not found. Someone else may have removed it.',

  // 실행
  '아직 진행 중인 실행입니다. 끝난 뒤에 증적 문서를 만듭니다':
    'This run is still going. Generate evidence after it finishes.',
  '한 실행에는 한 서비스의 케이스만 담을 수 있습니다': 'A run holds cases from one service only',
  'UI 테스트와 기능 테스트는 따로 실행합니다. 한쪽만 골라 주세요': 'Run UI tests and functional tests separately. Pick one kind',
  '그 대상 서버가 이 서비스에 없습니다. 설정에서 먼저 넣습니다':
    'That target server is not in this service. Add it in Settings first.',
  '한 번에 만들 수 있는 항목 수를 넘었습니다': 'Too many items for one run',

  // 설정
  '그 접두사는 이미 다른 서비스가 쓰고 있습니다': 'Another service already uses that prefix',
  '접두사 형식이 맞지 않습니다. 대문자로 시작하는 영문·숫자 12자 이내여야 합니다':
    'Bad prefix. Start with a capital letter, letters and digits, 12 characters or fewer.',
  '접두사는 만든 뒤에 바꿀 수 없습니다. 케이스 번호에 이미 들어가 있습니다':
    'A prefix cannot change once set. It is baked into case IDs.',
  '그 아이디는 이미 있습니다': 'That username is taken',
  '아이디는 영문 소문자·숫자·.·_·- 로 2~32자입니다':
    'Usernames are 2 to 32 lowercase letters, digits, dots, underscores or hyphens',
  '비밀번호를 먼저 바꿔야 합니다. 비밀번호 변경 화면에서 바꿉니다':
    'You must change your password first. Use the password change screen.',
  '아직 승인 대기 중인 계정입니다. 운영자가 수락하면 로그인할 수 있습니다':
    'This account is waiting for approval. You can sign in once an admin approves it.',
  '승인 대기 계정은 고칠 수 없습니다. 먼저 수락하거나 거절합니다':
    'A pending account cannot be edited. Approve or reject it first.',
  '이미 수락된 계정입니다. 다른 운영자가 먼저 처리했습니다':
    'This account is already approved. Another admin handled it first.',
  '이미 승인된 계정이라 거절할 수 없습니다': 'This account is already approved and cannot be rejected',
  '마지막 운영 계정입니다. 먼저 다른 사람을 운영으로 올립니다':
    'This is the last admin. Promote someone else first.',
  '입력한 값 중에 형식이 맞지 않는 것이 있습니다': 'Some values are not in the right shape',

  // 등급과 마지막 폴백
  '이 일을 할 수 있는 등급이 아닙니다': 'Your role cannot do this',
  '이 일에는 「{등급}」 등급이 필요합니다': 'This needs the {등급} role',
  '이 서비스에서 케이스 읽기 권한이 없습니다': 'You do not have read access to cases in this service',
  '이 서비스에서 케이스 쓰기 권한이 없습니다': 'You do not have write access to cases in this service',
  '이 서비스에서 실행 읽기 권한이 없습니다': 'You do not have read access to runs in this service',
  '이 서비스에서 실행 쓰기 권한이 없습니다': 'You do not have write access to runs in this service',
  '이 서비스에서 작성 읽기 권한이 없습니다': 'You do not have read access to authoring in this service',
  '이 서비스에서 작성 쓰기 권한이 없습니다': 'You do not have write access to authoring in this service',
  '요청이 실패했습니다 ({코드})': 'Request failed ({코드})',

  // 증적 문서 버튼 — 문서 **내용**은 한국어 고정이고 이건 버튼 글자다
  '증적 문서': 'Evidence document',
  엑셀: 'Excel',
  '{라벨} 만들기': 'Generate {라벨}',
  '{라벨} 다시 만들기': 'Regenerate {라벨}',
  '{라벨} 만드는 중': 'Generating {라벨}…',
  '알 수 없는 사유로 만들지 못했습니다': 'Failed for an unknown reason',
  '실행이 끝나면 증적 문서를 만들 수 있습니다': 'Evidence can be generated once the run finishes',
  '열기 ↗': 'Open ↗',
  받기: 'Download',
  '이 요청은 이미 다른 실행이 대기 중이거나 작성 중입니다. 새로 고쳐 보세요':
    'Another run of this request is queued or writing. Refresh the page',
  '이 요청에 더 최근 실행이 있습니다. 새로 고친 뒤 최신 실행에서 반영하세요':
    'This request has a newer run. Refresh and merge from the latest run',
  // 남은 요구로 이어 작성 (도메인/작성 §3.6 「★ 원장」) — 영어는 follow-up. continue 는 이어서 작성(재개)에만 쓴다
  '이 요청은 아직 반영되지 않았습니다. 테스트를 반영한 뒤에 이어 작성할 수 있습니다':
    'This request is not merged yet. Merge the tests first, then start a follow-up',
  '이미 남은 요구를 넘겨받은 요청이 있습니다. 화면을 새로 고칩니다': 'Another request already took the remaining requirements. Refresh the page',
  '이어 작성할 남은 요구가 없습니다': 'No requirements are left for a follow-up',
  '원본 요청이 폐기됐거나 아직 준비 중입니다. 화면을 새로 고칩니다': 'The original request was discarded or is still being prepared. Refresh the page',
  // 케이스 고치기 (도메인/작성 §3.6 「★ 케이스 고치기」)
  '고칠 내용을 받을 수 없는 케이스나 칸이 있습니다': 'A case or field cannot take this change',
  '같은 케이스를 고치는 요청이 이미 열려 있습니다. 그 요청을 반영하거나 폐기한 뒤 다시 요청합니다':
    'Another open request already changes the same case. Merge or discard it, then request again',
  // 반영 때 겹침 (도메인/작성 §3.6 「★ 반영 때 겹침 검사」)
  '겹치는 케이스를 아직 다 고르지 않아 반영할 수 없습니다': 'Overlapping cases are not all decided yet, so the merge cannot start',
  '이 반영의 겹침 목록에 없는 케이스입니다. 새로 고쳐 보세요': 'This case is not in the overlap list of this merge. Refresh the page',
  '반영이 대기 중이거나 진행 중이라 지금은 고를 수 없습니다': 'A merge is queued or running, so you cannot decide now',
};

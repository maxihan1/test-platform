// 서버 오류 문장과 증적 버튼 글자의 영어 (SPEC §8.4 · errorText.ts). 키는 한국어 원문이다
// 오류 문장을 따로 둔 이유는 하나다 — 한 화면에 속하지 않고 **어느 화면에서든 뜬다**

export const 오류영어: Record<string, string> = {
  // 배정과 세션
  '이 서비스에 배정받지 않았습니다. 운영 등급인 사람에게 배정을 요청합니다':
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
  '그 테스트 코드 파일을 읽지 못했습니다. 캐시가 낡았을 수 있습니다':
    'Could not read the test file. The cache may be stale.',
  '그 항목을 찾지 못했습니다. 다른 사람이 지웠을 수 있습니다':
    'Not found. Someone else may have removed it.',

  // 실행
  '아직 진행 중인 실행입니다. 끝난 뒤에 증적 문서를 만듭니다':
    'This run is still going. Generate evidence after it finishes.',
  '한 실행에는 한 서비스의 케이스만 담습니다': 'A run holds cases from one service only',
  '그 대상 서버가 이 서비스에 없습니다. 설정에서 먼저 넣습니다':
    'That target server is not in this service. Add it in Settings first.',
  '한 번에 만들 수 있는 항목 수를 넘었습니다': 'Too many items for one run',

  // 설정
  '그 접두사는 이미 다른 서비스가 쓰고 있습니다': 'Another service already uses that prefix',
  '접두사 모양이 다릅니다. 대문자로 시작하는 영문·숫자 12자 이내입니다':
    'Bad prefix. Start with a capital letter, letters and digits, 12 characters or fewer.',
  '접두사는 만든 뒤에 바꿀 수 없습니다. 케이스 번호 안에 이미 박혀 있습니다':
    'A prefix cannot change once set. It is baked into case IDs.',
  '그 아이디는 이미 있습니다': 'That username is taken',
  '마지막 운영 계정입니다. 먼저 다른 사람을 운영으로 올립니다':
    'This is the last admin. Promote someone else first.',
  '넣은 값 중에 모양이 다른 것이 있습니다': 'Some values are not in the right shape',

  // 등급과 마지막 폴백
  '이 일을 할 수 있는 등급이 아닙니다': 'Your role cannot do this',
  '이 일에는 「{등급}」 등급이 필요합니다': 'This needs the {등급} role',
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
};

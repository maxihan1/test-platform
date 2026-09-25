// 실행 설정·실행 결과·실행 기록 화면 글자의 영어 (SPEC §8.2·§8.3·§8.7). 키는 한국어 원문이다
//
// 괄호 꼬리가 붙은 키는 **같은 한국어가 자리마다 다른 영어**여야 할 때만 쓴다.
// 꼬리는 화면에 안 나오고, 꼬리를 뗀 한국어가 다른 자리에 그대로 있어야 한다 (i18n.ts)

export const 실행말: Record<string, string> = {
  // 판정과 상태
  '진행 중': 'Running',
  '완료': 'Finished',
  '중단': 'Aborted',
  '중단§버튼': 'Stop',
  '중단하는 중': 'Stopping…',
  '통과': 'Passed',
  '실패': 'Failed',
  '미실행': 'Not run',
  '남음': 'Left',
  '미확정': 'Unconfirmed',
  '미확정 {수}({칸})': 'Unconfirmed {수} ({칸})',
  '통과 {수}': '{수} passed',
  '실패 {수}': '{수} failed',
  '미실행 {수}': '{수} not run',
  '전체': 'All',
  '전체§집계': 'Total',
  '성공': 'All passed',
  '실패§실행': 'Has failures',
  '판정': 'Verdict',
  '디바이스': 'Device',
  '상태': 'Status',

  // 실행 기록 목록 (§8.7)
  '실행 기록': 'Run history',
  '모두 {건수}건': '{건수} in total',
  '실행 제목으로 찾기': 'Search by run title',
  '찾기': 'Search',
  '조건 지우기': 'Clear filters',
  '조건에 맞는 실행이 없습니다': 'No runs match the filters',
  '검색어나 상태를 바꿔 보세요': 'Try a different search or status',
  '이 서비스에서 아직 실행한 기록이 없습니다': 'No runs yet in this service',
  '케이스를 골라 실행하면 여기에 쌓입니다': 'Pick cases and run them — they show up here',
  '케이스 목록으로': 'Go to case list',
  '실행 횟수': 'Runs',
  '평균 소요': 'Avg duration',
  '끝난 {회수}회 기준': 'Across {회수} finished runs',
  '전체의 {몫}%': '{몫}% of all',
  '대상 서버 {서버}': 'Target {서버}',
  '실행자 {이름}': 'By {이름}',
  '결과 보기': 'View results',
  '이전': 'Previous',
  '다음': 'Next',
  '{쪽}쪽': 'Page {쪽}',

  // 실행 설정 (§8.2)
  '사전조건': 'Preconditions',
  '선언된 사전조건이 없습니다.': 'No preconditions declared.',
  '입력값': 'Inputs',
  '기대결과': 'Expected result',
  '저장된 입력값 세트 불러오기': 'Load a saved input set',
  '입력값은 이번 실행 기록에 그대로 저장됩니다.': 'Inputs are stored with this run record.',
  '대상 서버': 'Target server',
  '선택하세요': 'Select',
  '고르세요': 'Select',
  '실행자': 'Run by',
  '반복': 'Repeat',
  '반복 횟수': 'Repeat count',
  '끝나면 Slack 으로 알리기': 'Notify Slack when done',
  '자리를 뜰 때만 켜세요. 자기 확인용까지 팀 채널에 흘리면 채널이 소음이 됩니다':
    'Turn this on only when you step away. Self-checks in the team channel are just noise',
  '실행 제목': 'Run title',
  '세트 이름': 'Set name',
  '이 값을 묶음으로 저장': 'Save these values as a set',
  '실행': 'Run',
  '{케이스} 실행': 'Run {케이스}',
  '{케이스} 외 {나머지}건 실행': 'Run {케이스} and {나머지} more',
  '입력값을 바꿔 다시 실행해도 코드는 고치지 않습니다.': 'Changing inputs and rerunning never touches the code.',
  '실행할 디바이스를 하나 이상 고르세요.': 'Pick at least one device to run.',
  '이 케이스는 지금 보고 있는 서비스의 것이 아닙니다. 맨 위에서 서비스를 바꾸세요.':
    'This case belongs to another service. Switch services at the top.',
  '대상 서버를 고르세요. 어느 서버에 쐈는지가 증적의 전제입니다.':
    'Pick a target server. Evidence records which server was hit.',
  '저장할 이름을 적으세요.': 'Enter a name to save.',
  '{이름}으로 저장했습니다.': 'Saved as {이름}.',
  '입력값이 명세와 맞지 않습니다.': 'Inputs do not match the schema.',
  '이 서비스에 등록된 대상 서버가 없습니다. 설정에서 추가해야 실행할 수 있습니다':
    'This service has no target servers. Add one in Settings before running',
  '지금 보고 있는 서비스가 {서비스}인데 이 케이스는 {접두사} 것입니다. 맨 위에서 서비스를 바꾸거나 그 서비스의 케이스 목록에서 다시 여세요':
    'You are viewing {서비스} but this case belongs to {접두사}. Switch services at the top, or reopen it from the case list of that service',
  '한 번에 {상한}건까지 만들 수 있습니다 (지금 {지금}건)': 'Up to {상한} items per run ({지금} right now)',
  '실행 항목이 {건수}건 생깁니다': '{건수} run items will be created',

  // 여러 건 실행 모달 (§8.10)
  '실행할 케이스 {건수}건': '{건수} cases to run',
  '선언된 입력값이 없습니다. 그대로 실행됩니다': 'No inputs declared. It runs as is',
  '실행을 거는 중': 'Starting…',
  '취소': 'Cancel',
  '실행할 케이스가 없습니다. 고른 것이 전부 비활성이거나 걸러졌습니다':
    'Nothing to run. Everything picked is inactive or filtered out',
  '목록이 너무 길어 앞 {모은수}건까지만 담았습니다. 검색으로 좁혀서 다시 거세요':
    'The list is too long — only the first {모은수} were taken. Narrow it with search and try again',
  '고른 {고른수}건 중 {담을수}건이 대상입니다. 나머지는 비활성이라 뺐습니다':
    '{담을수} of the {고른수} picked will run. The rest are inactive and were dropped',

  // 실행 결과 (§8.3)
  '진행 중 {건수}건': '{건수} running',
  '진행 중 {케이스}': 'Running {케이스}',
  '실행 중단': 'Stop run',
  '조건에 맞는 결과가 없습니다.': 'No results match the filters.',
  'RUN {번호} 을 멈출까요?': 'Stop RUN {번호}?',
  '아직 시작하지 않은 항목은 대기줄에서 빼고, 이미 돌고 있는 항목은 끊습니다.':
    'Items not started yet leave the queue, and running ones are cut off.',
  '되돌릴 수 없습니다.': 'This cannot be undone.',
  '아니오': 'No',
  '상세': 'Details',
  '{시간} 평균': '{시간} avg',
  '실행자 미상 (인증 도입 이전)': 'Unknown — before sign-in',

  // 견주기와 사유 묶음 (§8.3 → /runs/:runId/insights)
  '직전 실행과 견줌': 'Compared with the previous run',
  '직전 실행과 견주지 못했습니다.': 'Could not compare with the previous run.',
  '직전 실행은 다른 주소에서 돌았습니다': 'The previous run used a different URL',
  '새로깨짐': 'Newly broken',
  '계속깨짐': 'Still failing',
  '고쳐짐': 'Fixed',
  '그대로': 'Unchanged',
  '나머지 {건수}건은 직전 실행과 같은 통과입니다': '{건수} more passed, same as the previous run',
  '직전 실행에 있었으나 이번에 돌지 않은 케이스 {건수}건': '{건수} cases ran last time but not this time',
  '같은 사유로 묶은 실패': 'Failures grouped by cause',
  '실패 항목 {건수}건': '{건수} failed items',

  // 진행·완료 모달 (§8.9)
  'RUN {번호} 이 진행 중입니다': 'RUN {번호} is running',
  'RUN {번호} 이 끝났습니다': 'RUN {번호} finished',
  'RUN {번호} 이 멈췄습니다': 'RUN {번호} was stopped',
  '{끝난} / {전체} 완료': '{끝난} / {전체} done',
  '절차 {번호}': 'Step {번호}',
  '{시간}째': '{시간} in',
  '제한 {시간}': 'limit {시간}',
  '{초}초': '{초}s',
  '{분}분': '{분}m',
  '{분}분 {초}초': '{분}m {초}s',
  '방금 끝난 것': 'Just finished',
  '실패한 케이스': 'Failed cases',
  '외 {건수}건': 'and {건수} more',
  '닫기': 'Close',

  // 돌지 못한 항목의 사유 (§8.3)
  '사용자가 멈춤': 'Stopped by user',
  '러너에 닿지 못했습니다': 'Could not reach the runner',

  // 항목 상세 (§8.4)
  '이력 {번호}': 'History {번호}',
  '실행이 멈춘 사유': 'Why the run stopped',
  '입력 없음': 'No input',
  '시험 절차': 'Test steps',
  '실행된 절차가 없습니다.': 'No steps were run.',
  '이 화면의 구성이 증적 문서에 그대로 출력됩니다.': 'This layout is what the evidence document prints.',
  '실행 결과': 'Run results',
  '값 바꿔 재실행': 'Rerun with new values',
  '예': 'Yes',
  '기대 {값}': 'Expected {값}',
  '실제': 'Actual',
  '실행 중단§막음': 'Halted here',
  '{절차} 실패 시점 화면': 'Screenshot when {절차} failed',
  '요청·응답 원문': 'Raw request and response',
  '실패 지점 코드': 'Code at failure',
  '불러오는 중입니다.': 'Loading.',
};

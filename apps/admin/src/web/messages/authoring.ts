// 테스트 작성 화면 글자의 영어 (SPEC §8 · 도메인/작성 §3.6). 키는 한국어 원문이다
// 여기에 넣은 키는 화면 어딘가가 실제로 써야 한다 — messages.test.ts 가 양방향으로 센다

export const 작성말: Record<string, string> = {
  // 줄의 종류와 상태
  작성: 'Author',
  재실행: 'Rerun',
  머지: 'Merge',
  '자료 올리는 중': 'Uploading files',
  '대기 중': 'Queued',
  '작성 중': 'Writing',
  // 서버가 주는 상태가 아니다. 신호가 오래 끊긴 것을 화면이 판정했다 — 까닭은 모르니 끊긴 사실만 말한다
  '응답 없음': 'No response',
  끝남: 'Ended',
  '기록 없음': 'No record',
  실패: 'Failed',

  // 빈 목록
  '아직 작성을 요청한 기록이 없습니다': 'No authoring requests yet',
  '기획서를 넣으면 여기에 줄이 생깁니다': 'Add a spec and a row appears here',
  '작성 요청이 들어오면 여기에 줄이 생깁니다': 'A row appears here when authoring is requested',

  // 새 요청 폼 — 파일과 피그마 주소를 한 세트로 (도메인/작성 §7 「자료」)
  '기획서 파일': 'Spec files',
  '피그마 주소': 'Figma links',
  '한 줄에 하나씩': 'One per line',
  '테스트 작성 시작': 'Start writing tests',
  '시작하는 중…': 'Starting…',
  '지원하지 않는 파일입니다. PDF · 워드 · md · txt 만 올릴 수 있습니다': 'File type not accepted. Only PDF · Word · md · txt',
  '이 요청은 대기열에 들어가지 못했습니다. 새 요청으로 다시 넣으세요': 'This request was not queued. Submit a new request',
  '이 요청은 대기열에 들어가지 못했습니다. 폐기하고 새 요청으로 다시 넣으세요': 'This request was not queued. Discard it and submit a new request',
  '파일 크기가 한 파일 상한을 넘었습니다': 'The file is larger than the per-file limit',
  '빈 파일은 올릴 수 없습니다': 'Empty files cannot be uploaded',
  '피그마 주소 형식이 맞지 않습니다. 피그마 디자인 파일의 링크를 넣으세요 (FigJam은 받지 않습니다)':
    'Not a Figma link we accept. Paste a Figma design file link (FigJam is not accepted)',
  '파일 이름에 쓸 수 없는 글자(따옴표 · 빗금 · ..)가 있습니다': 'The file name has characters that are not allowed (quotes · slashes · ..)',
  '한 요청에 넣을 수 있는 자료 개수를 넘었습니다': 'Too many attachments for one request',
  '자료가 하나도 없습니다. 파일이나 피그마 주소를 넣으세요': 'No attachments. Add a file or a Figma link',
  '요청한 사람만 자료를 올릴 수 있습니다': 'Only the requester can upload attachments',

  // 상세
  '지금 하는 일': 'Now doing',
  '요청한 사람': 'Requested by',
  '작성 에이전트': 'Agent',
  '요청한 시각': 'Requested at',
  번호: 'No.',
  '요청 정보': 'Request',
  '대조할 화면': 'Screen to compare',
  '넣은 자료': 'Inputs given',
  '{수}건': '{수}',

  // 시작 모달 (DESIGN.md 「모달」 ①)
  '테스트 작성을 시작했습니다': 'Test writing started',
  '상세 페이지로': 'Open details',
  '#{번호} 요청이 접수됐습니다.': 'Request #{번호} was accepted.',
  '창을 닫아도 작성은 계속됩니다. 테스트 작성 목록의 #{번호} 줄을 누르면 언제든 다시 볼 수 있습니다.':
    'Writing continues after you close this. Click the #{번호} row in the test writing list to see it again any time.',

  // Status 카드 (DESIGN.md 「작성 상태」)
  '반영 중': 'Merging',
  '기획서 {수}': 'Specs {수}',
  '피그마 {수}': 'Figma {수}',
  단계: 'Steps',
  준비: 'Prepare',
  '자료 받기': 'Fetch inputs',
  '케이스 작성': 'Write cases',
  '올리기·PR': 'Upload · PR',
  '에이전트 순서를 기다리는 중': 'Waiting for an agent',
  '자료 올리기가 끝나지 않았습니다': 'File upload did not finish',
  '{번호} / {전체} 단계 · {퍼센트}%': 'Step {번호} / {전체} · {퍼센트}%',
  시간: 'Time',
  '{시간} 걸림 (시작 {시작})': 'took {시간} (started {시작})',
  '{지난} 지남 / 한도 {한도}': '{지난} elapsed / limit {한도}',
  '{지난} 지남': '{지난} elapsed',
  '시작 {시각}': 'started {시각}',
  '늦어도 {시각} 완료': 'done by {시각} at the latest',
  '만든 케이스 파일': 'Case files made',
  '훑은 화면': 'Screens explored',
  '토큰 (캐시 읽기 포함 · 지금까지)': 'Tokens incl. cache reads (so far)',
  '토큰 (캐시 읽기 포함)': 'Tokens incl. cache reads',
  '마지막 활동': 'Last activity',
  // 에이전트가 올리는 단계 글. 정본은 scripts/authoring-run.ts · authoring-upload.ts 의 손.단계('…')
  '작업방을 만드는 중': 'Preparing the workspace',
  '자료를 받는 중': 'Fetching inputs',
  '케이스를 만드는 중': 'Writing cases',
  '올리는 중': 'Uploading',
  '역방향 산출물을 올리는 중': 'Uploading reverse outputs',
  '원본에 차이를 표시하는 중': 'Marking differences on the original',

  // 목록 한 줄 — 날것 단계 글 대신 (authoringStatus.ts 의 목록글)
  '진행 상황': 'Progress',
  '{단계} 단계에서 멈췄습니다': 'Stopped at {단계}',
  '테스트 반영 완료': 'Tests merged',
  '시작 전에 멈췄습니다': 'Stopped before it started',
  '케이스 파일 {수}개를 만들었습니다': 'Made {수} case files',
  '테스트 코드를 PR 로 올렸습니다': 'Opened the test code as a PR',

  // 다음 단계 (2026-09-28 「해야 할 일」에서 바꿨다 — 고르는 상황에 시키는 말투가 안 맞았다)
  '다음 단계': 'Next steps',
  '에이전트 응답이 끊겼습니다. 작성 중단을 누른 뒤 이어서 작성하세요':
    'The agent stopped responding. Press Stop writing, then continue writing',
  '지금은 없습니다. 작성이 끝나면 여기에 검토할 것이 생깁니다. 이 페이지를 닫아도 됩니다.':
    'Nothing for now. Things to review appear here when writing ends. You can close this page.',
  '아직 시작 전이라 누르면 바로 취소됩니다.': 'It has not started, so it is cancelled right away.',
  '중단하면 30초 안에 멈춥니다. 만든 것은 남겨 두어 이어서 작성할 수 있습니다.':
    'Stopping takes up to 30 seconds. What was made is kept so you can continue writing.',
  '테스트가 반영됐습니다. 케이스 목록에서 새 케이스를 볼 수 있습니다.': 'The tests were merged. The new cases are in the case list.',
  '올라간 PR 이 없습니다. 아래 만든 것을 확인하세요.': 'No PR was opened. Check the outputs below.',
  '만든 테스트 코드 검토': 'Review the test code',
  '초안 PR로 올라갔습니다. 읽어 보고 이상하면 PR에 댓글을 남기세요.':
    'It was opened as a draft PR. Read it and leave a comment on the PR if something looks wrong.',
  '만든 테스트 코드 보기 (PR)': 'View the test code (PR)',
  '기획서와 다른 곳 {수}건 확인': 'Check {수} differences from the spec',
  '화면에서 본 값으로 만든 케이스라 미확정 표시가 붙었습니다. 기획자에게 어느 쪽이 맞는지 물어보세요.':
    'These cases use values seen on screen, so they are marked unconfirmed. Ask the planner which side is right.',
  '표시한 기획서 내려받기': 'Download the marked spec',
  '테스트 반영하기': 'Merge the tests',
  '검토가 끝나면 PR을 합쳐 케이스 목록에 올립니다.': 'After review, merge the PR to add the cases to the list.',
  '반영하는 중': 'Merging…',
  '반영은 운영 권한이 있는 사람이 합니다.': 'Someone with admin rights merges it.',
  '같은 자료로 다시 작성': 'Write again with the same inputs',
  '아직 배정 전': 'Not assigned yet',
  '{번호}단계 진행 중 · {퍼센트}%': 'Step {번호} in progress · {퍼센트}%',
  '{번호}단계에서 멈춤 · {퍼센트}%': 'Stopped at step {번호} · {퍼센트}%',
  '다시 작성은 실행 권한이 있는 사람만 할 수 있습니다.': 'Someone with run rights can write it again.',
  '원인을 먼저 고친 뒤 누르세요. 넣었던 자료 그대로 같은 요청에서 처음부터 다시 돌립니다.':
    'Fix the cause first. This runs the same request again from the start with the same inputs.',
  '대상 서버와 시작 주소도 원본 그대로 씁니다.': 'It uses the same target server and start URL as the original.',
  '넣었던 자료 그대로 같은 요청에서 처음부터 다시 돌립니다. 지금까지의 실행은 실행 기록에 남습니다.':
    'This runs the same request again from the start with the same inputs. Earlier runs stay in the run history.',

  // 이어하기 (도메인/작성 §7 「이어하기」)
  '이어서 작성': 'Continue writing',
  '이 요청은 이어서 작성할 수 없습니다. 이미 이어받았거나 보관 기간이 지났습니다. 새로 고쳐 보세요':
    'This request cannot be continued. It was already continued or its keep period is over. Refresh the page',
  '중단 전까지 만든 테스트 {수}개를 이어받아 남은 작업을 계속합니다.':
    'Takes over the {수} tests made before the stop and continues the rest.',
  '중단된 자리부터 남은 작업을 이어서 합니다.': 'Continues the rest from where it stopped.',
  '{날}까지 이어갈 수 있습니다.': 'You can continue until {날}.',
  '이미 이어서 작성했습니다. 아래 실행 기록을 보세요.': 'Already continued. See the run history below.',
  '보관 기간이 지나 작성 결과를 지웠습니다. 처음부터 다시 작성하세요.':
    'The keep period is over and what was made was deleted. Write again from the start.',
  '목록에서 사라집니다. 보관한 작업물도 지웁니다. 통계와 토큰 기록은 남습니다.':
    'It disappears from the list and the kept work is deleted. Stats and token records stay.',

  // 진척 · 중단 · 폐기 (도메인/작성 §7 「중단 · 폐기 · 진척」). 상태 라벨 「중단」은 실행과 같은 키(runs)를 쓴다
  진척: 'Progress',
  '{분}분': '{분} min',
  '{수}장': '{수}',
  '{수}개': '{수}',
  '{시간} 전': '{시간} ago',
  시스템: 'System',
  '사용자가 멈춤': 'Stopped by user',
  '시간초과': 'Timed out',
  '구독 한도': 'Subscription limit',
  '에이전트 재시작': 'Agent restarted',
  '에이전트 응답 없음': 'Agent not responding',
  '작성 중 끊김': 'Cut off while writing',
  '올리기 거절': 'Upload rejected',
  '작성 중단': 'Stop writing',
  폐기: 'Discard',
  '폐기하는 중': 'Discarding…',
  폐기됨: 'Discarded',
  '올리는 중 — 멈출 수 없습니다': 'Uploading — cannot be stopped',
  '작성을 멈출까요?': 'Stop writing?',
  '이 요청을 폐기할까요?': 'Discard this request?',
  '{분}분 동안 만든 것은 남겨 두어 나중에 이어서 작성할 수 있습니다.':
    'What was made in {분} min is kept so you can continue writing later.',
  '아직 시작 전이라 바로 취소됩니다.': 'It has not started yet, so it is cancelled right away.',
  '목록에서 사라집니다. 통계와 토큰 기록은 남습니다.': 'It disappears from the list. Stats and token records stay.',

  // 역방향 — 기획서와 실제 화면을 대조한다 (도메인/작성 §3.6 「★ 역방향」)
  '실제 화면과 대조': 'Compare with the live screen',
  '화면과 대조': 'Screen compare',
  '시작 주소': 'Start URL',
  '비우면 기획서에 나온 화면에서 시작합니다. 기획서 없이 시작 주소만 넣으면 그 화면을 훑어 역기획서를 만듭니다':
    'Leave empty to start from the screen the spec describes. With only a start URL and no spec, that screen is explored and a reverse spec is written',
  '이 서비스에는 대상 서버가 없습니다. 설정 > 서비스에서 먼저 넣으세요':
    'This service has no target servers. Add one in Settings > Services first',
  '이 대상 서버에는 테스트 계정이 없습니다. 설정 > 서비스에서 테스트 계정을 넣으세요':
    'This target server has no test account. Add one in Settings > Services',
  '시작 주소는 고른 대상 서버와 같은 주소(도메인 · 포트)여야 합니다':
    'The start URL must be on the same address (domain · port) as the chosen target server',
  '기획서에 나온 화면에서 시작': 'Starts from the screen the spec describes',
  '화면만 — 기획서 없이 이 화면을 훑습니다': 'Screen only — explores this screen without a spec',
  '원본 요청 #{번호}의 입력을 그대로 씁니다': 'Uses the inputs of the original request #{번호} as they are',
  '원본 요청 #{번호}의 자료': 'Input of the original request #{번호}',
  '입력 자료': 'Inputs',
  산출물: 'Outputs',
  '표시 사본': 'Marked copy',
  역기획서: 'Reverse spec',
  '기획서와 화면의 차이': 'Differences between spec and screen',
  종류: 'Kind',
  자리: 'Where',
  기획서: 'Spec',
  화면: 'Screen',
  케이스: 'Case',
  표시함: 'Marked',
  '표시 못 함': 'Not marked',
  '이유 기록 없음': 'No reason recorded',
  '기획서와 다름': 'Differs from spec',
  '화면에만 있음': 'Only on screen',
  '문서에만 있음': 'Only in spec',
  '알 수 없는 종류': 'Unknown kind',
  // 실행 기록 (도메인/작성 §7 「실행 기록」) — 번호는 하나, 실행은 차로 쌓인다
  '{차}차': 'Run {차}',
  차: 'Run',
  방식: 'How',
  처음: 'First',
  처음부터: 'From scratch',
  이어서: 'Continued',
  시작: 'Started',
  결과: 'Result',
  테스트: 'Tests',
  입력: 'Input',
  출력: 'Output',
  '캐시 읽기': 'Cache read',
  '캐시 쓰기': 'Cache write',
  '끊겨 하한': 'cut off, lower bound',
  // 보류 케이스 (도메인/작성 §3.6 「★ 보류 케이스」 · 시안 A)
  '보류 케이스': 'Held cases',
  '{수}건 · 값을 넣거나 제거하세요': '{수} · fill in values or remove',
  '판정 불가는 기획서에 판정 기준이 없는 케이스, 보류는 전제를 만들 수 없는 케이스입니다. 넣은 값은 테스트의 기본값이 되고, 실행할 때 바꿀 수 있습니다.':
    'Undecidable means the spec had no pass criterion; on hold means the precondition could not be built. Values you enter become the test defaults and can be changed at run time.',
  '무엇을 확인하나': 'What it checks',
  '왜 보류됐나': 'Why it is held',
  '판정 불가': 'Undecidable',
  보류: 'On hold',
  '값 필요': 'Needs values',
  '값 채움': 'Filled',
  제거함: 'Removed',
  '값 넣기': 'Fill in',
  접기: 'Collapse',
  제거: 'Remove',
  되돌리기: 'Undo',
  '넣을 값': 'Input',
  '기대 결과': 'Expected',
  숫자: 'Number',
  글자: 'Text',
  '숫자를 넣으세요': 'Enter a number',
  저장했습니다: 'Saved',
  '칸을 벗어나면 바로 저장됩니다': 'Saved as soon as you leave the field',
  '보류 케이스 {전체}건 중 {처리}건 처리': '{처리} of {전체} held cases handled',
  '값 채움 {채움} · 제거 {제거}': 'filled {채움} · removed {제거}',
  '보류 케이스로 가기': 'Go to held cases',
  '보류 케이스 {수}건이 남아 있어 아직 반영할 수 없습니다.': '{수} held cases remain, so this cannot be merged yet.',
  '반영하면 넣은 값을 테스트 코드에 적고, 값을 채운 케이스를 3번 돌려 모두 통과해야 합칩니다.':
    'Merging writes your values into the test code, runs each filled case 3 times, and merges only if all pass.',
  '보류 케이스가 남아 있어 아직 반영할 수 없습니다. 새로 고쳐 보세요': 'Held cases remain, so this cannot be merged yet. Try refreshing.',
  '반영이 대기 중이거나 진행 중이라 지금은 값을 바꿀 수 없습니다': 'A merge is queued or running, so values cannot be changed now',
  '넣은 값이 이 케이스의 칸과 맞지 않습니다': 'The values do not match this case’s fields',
  '보류 케이스를 읽지 못했습니다. 같은 자료로 다시 작성하세요.': 'Could not read the held cases. Run it again with the same materials.',
  '테스트 계정을 넣은 대상 서버가 없습니다. 설정 > 서비스에서 넣으세요.':
    'No target server has a test account. Add one in Settings > Services.',
};

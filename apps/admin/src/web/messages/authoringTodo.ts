// 테스트 작성 목록 · 상태 표시 글자의 영어 (⑫-9 · 도메인/작성 §7). 키는 한국어 원문이다 — authoring.ts 가 300줄을 넘어 뗐다
// 여기에 넣은 키는 화면 어딘가가 실제로 써야 한다 — messages.test.ts 가 양방향으로 센다

export const 작성할일말: Record<string, string> = {
  // ⑫-9 작성 목록과 상태 표시 (2026-10-19 · 점검 11.1 · 11.2 · 11.3 · 11.6 · 12.1 · 12.7 · 12.16 · N2)
  '손이 필요한 것': 'Needs action',
  '사람 손이 필요한 요청이 없습니다': 'No requests need action',
  '반영 대기': 'Waiting to apply',
  '반영 실패': 'Apply failed',
  '반영 완료': 'Applied',
  '값 필요 {수}': '{수} need values',
  '겹침 {수}': '{수} overlaps',
  '{이름} 외 {수}개': '{이름} and {수} more',
  '화면만 — 기획서 없이 대조': 'Screens only — compared without a spec',
  '자료 없음': 'No files',
  반영: 'Apply',
  '케이스 등록': 'Cases registered',
  '화면에서 읽은 기획서': 'Spec read from the screens',
  '차이를 표시한 기획서': 'Spec with differences marked',
  '다시 작성은 작성 쓰기 권한이 있는 사람만 할 수 있습니다.': 'Only someone with authoring write rights can write it again.',
  '이 대상 서버에는 테스트 계정이 없거나 운영 서버로 체크돼 있습니다. 운영자에게 확인을 요청하세요':
    'This target server has no test account or is marked as production. Ask an operator to check it',
  '이 서비스에는 대상 서버가 없습니다. 운영자에게 대상 서버를 넣어 달라고 요청하세요':
    'This service has no target server. Ask an operator to add one',
  '목록에 남은 그 줄은 폐기하세요': 'Discard the row left in the list.',
  // 에이전트 실패 글을 옮긴 것 (authoringFailText.ts). 에이전트 글의 정본은 scripts/authoring-*.ts 의 끝내기 error
  '작성 도구가 끝나지 않아 결과를 올리지 않았습니다. 같은 자료로 다시 작성하세요':
    'The writing tool did not exit, so nothing was uploaded. Write again with the same files',
  '작성 도구가 직접 저장한 변경이 있어 올리지 않았습니다. 같은 자료로 다시 작성하세요':
    'The writing tool committed changes itself, so nothing was uploaded. Write again with the same files',
  '작성 에이전트가 꺼져 멈췄습니다. 같은 자료로 다시 작성하세요': 'The agent shut down and stopped. Write again with the same files',
  '케이스를 만들다 끊겼습니다. 같은 자료로 다시 작성하세요': 'Writing cases was cut off. Write again with the same files',
  '반영하지 못했습니다. 다른 변경과 부딪혔거나 저장소 규칙에 막혔습니다':
    'Could not apply. It conflicted with another change or was blocked by repository rules',
  '이미 있는 케이스와 겹치는 케이스가 {1}건입니다. 아래 표에서 고른 뒤 다시 반영하세요':
    '{1} cases overlap existing ones. Choose in the table below, then apply again',
  '검사 결과를 읽지 못해 반영을 멈췄습니다. 다시 반영하세요': 'Could not read the check results, so applying stopped. Apply again',
  '피그마 토큰이 없어 피그마 자료를 읽지 못했습니다. 운영자에게 피그마 토큰을 넣어 달라고 요청하세요':
    'No Figma token, so the Figma files could not be read. Ask an operator to add a Figma token',
  '피그마 토큰이 없어 피그마 자료를 읽지 못했습니다. 설정 > 서비스에서 피그마 토큰을 넣으세요':
    'No Figma token, so the Figma files could not be read. Add one in Settings > Services',
  '대상 서버 「{1}」은 운영 서버라 작성하지 않습니다. 다른 대상 서버로 새 요청을 넣으세요':
    'Target server "{1}" is production, so nothing is written. Send a new request with another target server',
  '대상 서버 「{1}」에 테스트 계정이 없습니다. 운영자에게 테스트 계정을 넣어 달라고 요청하세요':
    'Target server "{1}" has no test account. Ask an operator to add one',
  '대상 서버 「{1}」에 테스트 계정이 없습니다. 설정 > 서비스에서 넣은 뒤 새 요청을 넣으세요':
    'Target server "{1}" has no test account. Add one in Settings > Services, then send a new request',
  '대상 서버 「{1}」을 찾을 수 없거나 주소가 맞지 않습니다. 운영자에게 확인을 요청하세요':
    'Target server "{1}" is missing or its address is invalid. Ask an operator to check it',
  '대상 서버 「{1}」을 찾을 수 없거나 주소가 맞지 않습니다. 설정 > 서비스를 확인한 뒤 새 요청을 넣으세요':
    'Target server "{1}" is missing or its address is invalid. Check Settings > Services, then send a new request',
  '시작 주소가 대상 서버와 다릅니다. 새 요청으로 넣으세요': 'The start address does not match the target server. Send a new request',
  '{1}은 옛 워드(.doc) 파일이라 읽지 못했습니다. .docx 나 PDF 로 저장해 새 요청으로 넣으세요':
    '{1} is an old Word (.doc) file and could not be read. Save it as .docx or PDF and send a new request',
  '읽을 자료가 없습니다. 기획서나 피그마 주소를 넣어 새 요청을 넣으세요': 'There is nothing to read. Add a spec or a Figma link and send a new request',
  '만든 테스트가 없어 올리지 않았습니다': 'No tests were made, so nothing was uploaded',
  '남은 요구가 없습니다. 앞 요청들이 모두 케이스로 만들었거나 제외했습니다. 이 요청은 폐기해도 됩니다':
    'No requirements are left. Earlier requests covered or excluded them all. You can discard this request',
  '앞 요청의 요구 목록이 없어 남은 요구를 알 수 없습니다. 이 요청은 폐기해도 됩니다':
    'The earlier request has no requirement list, so what is left is unknown. You can discard this request',
  '반영할 것이 없습니다. 지금 버전의 요구가 이미 테스트에 들어 있습니다. 이 요청은 폐기해도 됩니다':
    'Nothing to apply. This version of the requirements is already in the tests. You can discard this request',
  '기획서에 없는 화면이 없습니다. 이 요청은 폐기해도 됩니다': 'Every screen is in the spec. You can discard this request',
};

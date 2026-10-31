// 가입·비밀번호 변경·승인 대기 화면 글자의 영어 (SPEC 도메인/인증 §8.6·§8.8). 키는 한국어 원문이다

export const 계정말: Record<string, string> = {
  // 로그인 화면에 더한 것 (§8.6)
  회원가입: 'Sign up',
  '가입 신청을 검토하고 있습니다. 운영자가 수락하면 로그인할 수 있습니다':
    'Your sign-up is under review. You can sign in once an admin accepts it.',

  // maxihan 계정(SSO)이 켜진 설치의 로그인 화면 (§8.6)
  'QA Hub 통합계정으로 로그인': 'Sign in with QA Hub account',
  '로그인하면 맡은 애플리케이션이 열립니다.': 'Sign in to open your applications.',
  '이 플랫폼에서 쓸 수 없는 아이디입니다. 운영자가 확인해야 합니다': 'This ID cannot be used here. An admin needs to check it.',
  '로그인하지 못했습니다. 버튼을 다시 누르면 됩니다': 'Sign-in failed. Press the button again.',
  로그아웃했습니다: 'Signed out',
  '이 계정으로 로그인': 'Sign in with this account',
  '다른 계정으로 로그인': 'Sign in with another account',

  // 회원가입 화면
  '가입 신청': 'Request access',
  '계정을 신청합니다': 'Request an account',
  '운영자가 수락하면 로그인할 수 있습니다.': 'You can sign in once an admin accepts it.',
  이름: 'Name',
  '비밀번호 확인': 'Confirm password',
  '보내는 중': 'Sending',
  '가입 신청을 보냈습니다. 운영자가 수락하면 로그인할 수 있습니다':
    'Sign-up sent. You can sign in once an admin accepts it.',
  '로그인 화면으로': 'Back to sign in',
  '이미 쓰는 아이디입니다': 'That ID is already taken',
  '영문 소문자·숫자·. _ - 로 2~32자, 첫 글자는 소문자나 숫자입니다':
    'Lowercase letters, digits, . _ - only, 2–32 characters, starting with a letter or digit',
  '두 비밀번호가 다릅니다': 'The two passwords do not match',
  '비밀번호는 8자 이상이어야 합니다': 'Passwords must be at least 8 characters',
  '비밀번호를 채웁니다': 'Fill in the password',

  // 비밀번호 변경 화면 (강제 · 스스로)
  '비밀번호 변경': 'Change password',
  '처음 받은 비밀번호를 바꿔야 계속할 수 있습니다': 'Change the password you were given to continue',
  '현재 비밀번호': 'Current password',
  '새 비밀번호': 'New password',
  '새 비밀번호 확인': 'Confirm new password',
  '비밀번호 바꾸기': 'Update password',
  '비밀번호를 바꿨습니다': 'Password updated',
  '바꾸는 중': 'Changing',
  '현재 비밀번호를 채웁니다': 'Fill in the current password',
  '현재 비밀번호가 맞지 않습니다': 'The current password is incorrect',
  '새 비밀번호는 현재 비밀번호와 달라야 합니다': 'Enter a password different from the current one',

  // 설정의 승인 대기 묶음 (§8.8)
  '승인 대기 {건수}': 'Pending approval {건수}',
  수락: 'Accept',
  거절: 'Decline',
  수락한다: 'Accept now',
  '가입 신청을 지웁니다. 되돌릴 수 없습니다': 'This deletes the sign-up request. It cannot be undone',
  지운다: 'Delete now',
  '다른 운영자가 먼저 처리했습니다': 'Another admin already handled this',

  // 계정 메뉴 「디바이스 팜 토큰」 창 (§8.6 · 2026-10-29 APP-F1-13)
  '통합계정 토큰': 'QA Hub account token',
  '내가 누른 실행이 디바이스 팜의 폰을 빌릴 때와 {bts} 자동 설정을 할 때 이 토큰을 씁니다':
    'Used when runs you start borrow device farm phones and when you set up {bts} automatically',
  '통합계정 「내 계정」 화면에서 개인 액세스 토큰을 발급해 붙여 넣습니다':
    'Issue a personal access token on the QA Hub account "My account" page and paste it here',
  '없음 — 서버 토큰으로 빌립니다': 'None — phones are borrowed with the server token',
  '넣음 (…{끝})': 'Set (…{끝})',
  '토큰 지우기': 'Remove token',
  '새 토큰': 'New token',
  '지금 토큰(…{끝})을 버리고 새 토큰으로 바꿀까요?': 'Replace the current token (…{끝}) with the new one?',
  '지금 토큰(…{끝})을 지울까요? 지우면 서버 토큰으로 빌립니다': 'Remove the current token (…{끝})? Phones will be borrowed with the server token',
  'pat_ 로 시작하는 토큰이 아닙니다': 'This is not a token starting with pat_',
  '통합계정이 받지 않는 토큰입니다 — 폐기했거나 기간이 끝났을 수 있습니다':
    'The QA Hub account does not accept this token — it may be revoked or expired',
  '다른 사람의 토큰입니다 — 내 계정에서 발급한 토큰만 넣을 수 있습니다': "This is someone else's token — only tokens issued from your own account work",
  '통합계정에 닿지 못해 토큰을 확인하지 못했습니다 — 잠시 뒤 저장을 다시 눌러 주세요':
    'Could not reach the QA Hub account to check the token — save again in a moment',
};

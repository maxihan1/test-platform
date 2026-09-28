// 가입·비밀번호 변경·승인 대기 화면 글자의 영어 (SPEC 도메인/인증 §8.6·§8.8). 키는 한국어 원문이다

export const 계정말: Record<string, string> = {
  // 로그인 화면에 더한 것 (§8.6)
  회원가입: 'Sign up',
  '가입 신청을 검토하고 있습니다. 운영자가 수락하면 로그인할 수 있습니다':
    'Your sign-up is under review. You can sign in once an admin accepts it.',

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
  '비밀번호는 8자 이상입니다': 'Passwords must be at least 8 characters',
  '비밀번호를 채웁니다': 'Fill in the password',
};

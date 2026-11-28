export function 새사용자명(접두사: string): string {
  return `${접두사}_${Date.now().toString(36)}`.slice(0, 30);
}

export function 길이글(길이: number, 글자 = 'a'): string {
  return 글자.repeat(길이);
}

export function 길이이메일(총길이: number): string {
  const 앞 = 'a'.repeat(64);
  const 바탕길이 = 총길이 - 앞.length - 1 - 4;
  let 바탕 = '';
  for (let i = 1; i <= 바탕길이; i++) 바탕 += i % 62 === 0 && i < 바탕길이 ? '.' : 'b';
  return `${앞}@${바탕}.com`;
}

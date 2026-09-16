#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."
echo "→ 프로젝트 루트: $(pwd)"

[ -d .git ] || git init -q
cp setup/pre-push .git/hooks/pre-push
chmod +x .git/hooks/pre-push
echo "→ pre-push 훅 설치 완료"

echo ""
echo "→ 훅 동작 확인"
echo '{"tool_input":{"file_path":"packages/kit/src/types.ts"}}' \
  | node .claude/scripts/guard.mjs protected >/dev/null 2>&1 && CODE=0 || CODE=$?
[ "$CODE" = "2" ] && echo "   protected 정상 (차단됨)" || echo "   [!] protected 이상 (exit=$CODE)"

echo '{"tool_input":{"command":"git push --force"}}' \
  | node .claude/scripts/guard.mjs bash >/dev/null 2>&1 && CODE=0 || CODE=$?
[ "$CODE" = "2" ] && echo "   bash 정상 (차단됨)" || echo "   [!] bash 이상 (exit=$CODE)"

echo ""
echo "완료. 다음 명령으로 시작하세요:"
echo "  git add -A && git commit -m '프로젝트 문서와 규칙 설정' && git tag g0-docs"
echo ""
echo "Phase 0는 보호 파일을 처음 만드는 단계라 예외 스위치를 켜고 시작합니다."
echo "환경변수를 앞에 붙이는 방식은 데몬 구조 때문에 전달되지 않습니다. 설정 파일에 넣으세요."
echo "  printf '{\\n  \"env\": { \"ALLOW_PROTECTED\": \"1\" }\\n}\\n' > .claude/settings.local.json"
echo "  claude"
echo "G1을 통과하면 rm .claude/settings.local.json 으로 반드시 지우세요."

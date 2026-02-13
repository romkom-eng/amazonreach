#!/bin/bash
# Railway Firebase 환경 변수 설정 스크립트

echo "🔧 Railway Firebase 환경 변수 생성 중..."
echo ""

# serviceAccountKey.json을 한 줄로 변환
JSON_ONE_LINE=$(cat backend/serviceAccountKey.json | tr -d '\n')

echo "✅ Firebase 서비스 계정 JSON 변환 완료"
echo ""
echo "📋 Railway Variables에 다음 환경 변수를 추가하세요:"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "변수명: FIREBASE_SERVICE_ACCOUNT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "$JSON_ONE_LINE"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 복사 방법:"
echo "1. 위의 JSON 전체를 복사 (━ 라인 사이의 내용만)"
echo "2. Railway Dashboard → Variables 탭"
echo "3. 변수명: FIREBASE_SERVICE_ACCOUNT"
echo "4. 값: (복사한 JSON 붙여넣기)"
echo "5. Add 클릭"
echo ""
echo "🚀 다음 단계:"
echo "1. Railway에서 Redeploy"
echo "2. Logs에서 '✅ Firebase Admin Initialized' 확인"
echo ""

# 클립보드에 복사 (macOS)
echo "$JSON_ONE_LINE" | pbcopy
echo "✅ JSON이 클립보드에 복사되었습니다!"
echo "   Railway Variables에 바로 붙여넣기 하세요."

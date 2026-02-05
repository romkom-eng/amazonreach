# Cloudflare Pages 배포 가이드

## 🚀 Cloudflare Pages 배포 방법

### 1단계: Cloudflare Dashboard

```
1. https://dash.cloudflare.com 로그인
2. Workers & Pages 클릭
3. Create application → Pages → Connect to Git
```

### 2단계: GitHub 연결

```
Repository: romkom-eng/amazonreach
Branch: main
```

### 3단계: Build 설정

```
Framework preset: None
Build command: (비워두기)
Build output directory: frontend
Root directory: /
```

### 4단계: 환경 변수 추가

**Production 환경 변수**:
```
FIREBASE_API_KEY=AIzaSyBVdLKvsw1Ck11N9mdrCEKPNfak7vDQJDA
FIREBASE_PROJECT_ID=nextgate-kor
FIREBASE_AUTH_DOMAIN=nextgate-kor.firebaseapp.com
FIREBASE_STORAGE_BUCKET=nextgate-kor.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=1066049963062
FIREBASE_APP_ID=1:1066049963062:web:b23ba60b0ba7e22e99c6ab

GEMINI_API_KEY=YOUR_GEMINI_KEY_HERE

GOOGLE_SHEETS_CREDENTIALS=YOUR_CREDENTIALS_JSON
HELIUM10_SHEET_ID=YOUR_SHEET_ID

SENDGRID_API_KEY=YOUR_SENDGRID_KEY
SENDGRID_FROM_EMAIL=contact@amazonreach.com

SLACK_WEBHOOK_URL=YOUR_SLACK_WEBHOOK

AFTERSHIP_API_KEY=YOUR_AFTERSHIP_KEY

JWT_SECRET=amazonreach-jwt-secret-2026
SESSION_SECRET=amazonreach-session-secret-2026
```

### 5단계: 배포!

```
Save and Deploy 클릭!
```

---

## 🔧 Cron Triggers 설정

### Workers 배포 후:

```
1. Workers & Pages → amazonreach
2. Settings → Triggers → Cron Triggers
3. Add Cron Trigger:
   - Schedule: 0 0 * * *
   - Description: Daily auto-reorder
   
4. Add Cron Trigger:
   - Schedule: 0 9 * * 1
   - Description: Weekly report (Monday 9 AM)
```

---

## 🌐 커스텀 도메인 연결

### Cloudflare에서 도메인 구매 후:

```
1. Pages → amazonreach → Custom domains
2. Add a domain
3. 입력: amazonreach.com
4. Continue → Activate domain
```

자동으로 DNS 설정됩니다!

---

## 📧 이메일 설정

### Email Routing 활성화:

```
1. Cloudflare Dashboard → Email → Email Routing
2. Enable Email Routing
3. Create address:
   - contact@amazonreach.com → your.gmail@gmail.com
   - support@amazonreach.com → your.gmail@gmail.com
   - admin@amazonreach.com → your.gmail@gmail.com
```

### Gmail에서 보내기 설정:

```
1. Gmail → 설정 → 계정 및 가져오기
2. "다른 주소에서 메일 보내기" → 주소 추가
3. 이름: AmazonReach Support
4. 이메일: contact@amazonreach.com
5. SMTP 서버:
   - smtp.gmail.com
   - 포트: 587
   - 사용자명: your.gmail@gmail.com
   - 비밀번호: Gmail 앱 비밀번호
```

---

## ✅ 배포 완료 체크리스트

- [ ] Cloudflare Pages 배포 성공
- [ ] 환경 변수 모두 설정
- [ ] Cron Triggers 활성화
- [ ] 커스텀 도메인 연결
- [ ] SSL 인증서 발급 확인 (자동)
- [ ] Email Routing 설정
- [ ] Gmail 발송 테스트

---

## 🧪 테스트

### API 테스트:
```bash
curl https://amazonreach.com/api/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"message":"Hello"}'
```

### Cron 수동 트리거:
```
Workers → amazonreach → Triggers → Cron Triggers → Run now
```

### 이메일 테스트:
```
contact@amazonreach.com으로 이메일 발송
→ Gmail에서 수신 확인
```

---

## 💰 최종 비용

```
Cloudflare Pages: $0 (무료!)
Cloudflare Workers: $0 (무료!)
Cron Triggers: $0 (무료!)
Email Routing: $0 (무료!)
도메인 (amazonreach.com): $10/년

총: $10/년
vs Vercel Pro: $240/년
절약: $230/년! 🎉
```

---

## 🎯 다음 단계

1. Cloudflare 계정 생성
2. 도메인 구매 (`amazonreach.com`)
3. Pages 배포 (위 단계 따라하기)
4. NextGate도 동일하게 진행

준비되셨으면 시작하세요! 🚀

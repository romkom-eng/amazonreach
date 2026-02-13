# Cloudflare Pages 배포 수정 가이드

## 🔍 문제 원인

AmazonReach는 **풀스택 애플리케이션**입니다:
- **프론트엔드**: 정적 HTML/CSS/JS 파일 (`/frontend` 폴더)
- **백엔드**: Node.js Express 서버 (`/backend` 폴더)

**Cloudflare Pages는 정적 사이트만 호스팅 가능**하므로, 백엔드를 포함한 전체 프로젝트를 빌드하려고 하면 실패합니다.

## ✅ 해결 방법

### 아키텍처
```
프론트엔드 (Cloudflare Pages) → 백엔드 API (Railway)
```

### Cloudflare Pages 설정 (프론트엔드만 배포)

1. **Cloudflare Dashboard** 접속
   - Workers & Pages → 프로젝트 → Settings → Builds & deployments

2. **빌드 설정 변경**:
   ```
   Framework preset: None
   Build command: (비워두기)
   Build output directory: frontend
   Root directory: /
   ```

3. **환경 변수** (필요시):
   ```
   NODE_VERSION=18
   ```

### Railway 백엔드 설정 (별도 필요)

현재 Railway 백엔드가 502 에러를 반환하고 있습니다. Railway에서 백엔드를 다시 배포해야 합니다:

1. **Railway Dashboard** 접속
2. 프로젝트 선택
3. **Environment Variables** 확인:
   - `FIREBASE_SERVICE_ACCOUNT` (JSON 형식)
   - `STRIPE_SECRET_KEY`
   - `JWT_SECRET`
   - `SESSION_SECRET`
   - 기타 필요한 환경 변수들

4. **Deploy** 버튼 클릭하여 재배포

## 📁 추가된 파일

### `frontend/_headers`
보안 및 캐싱 헤더 설정 파일 (이미 생성됨)

### `frontend/_redirects`
리다이렉트 규칙 파일 (이미 생성됨)

## 🧪 배포 확인 방법

### 1. Railway 백엔드 테스트
```bash
curl https://amazonreach-production.up.railway.app/api/health
```
**예상 결과**: `{"status":"OK",...}` JSON 응답

### 2. Cloudflare Pages 배포 후
- 프론트엔드 URL 접속
- 로그인 페이지 작동 확인
- 브라우저 콘솔(F12)에서 API 호출 확인
- CORS 에러 없는지 확인

## 🚨 일반적인 에러 해결

### "Build failed" 에러
**해결**: Build command를 비우고 Framework를 "None"으로 설정

### "No such file or directory" 에러
**해결**: Build output directory가 `frontend`로 설정되어 있는지 확인

### "Module not found" 에러
**해결**: Cloudflare Pages는 정적 파일만 필요합니다. 백엔드를 빌드하려고 하지 마세요.

### API 호출 실패
**해결**: Railway 백엔드가 실행 중인지 확인하고 CORS 설정 확인

## 📝 체크리스트

- [ ] Cloudflare Pages 빌드 설정 변경 (위 설정대로)
- [ ] Railway 백엔드 재배포 및 환경 변수 확인
- [ ] Railway 백엔드 health check 성공
- [ ] Cloudflare Pages 재배포
- [ ] 프론트엔드 접속 확인
- [ ] 로그인 기능 테스트
- [ ] 대시보드 API 호출 확인

## 💡 중요 사항

> **Cloudflare Pages는 프론트엔드만 배포합니다.**  
> 백엔드는 Railway (또는 다른 Node.js 호스팅)에 별도로 배포해야 합니다.

> Railway 백엔드가 현재 작동하지 않고 있습니다 (502 에러).  
> Railway Dashboard에서 백엔드를 먼저 수정/재배포한 후 Cloudflare Pages를 배포하세요.

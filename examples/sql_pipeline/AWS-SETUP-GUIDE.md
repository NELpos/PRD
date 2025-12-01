# Environment Configuration

## .env.local (개발 환경)

```env
# AWS Bedrock Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key

# Optional: 특정 Bedrock 엔드포인트 사용 시
# AWS_BEDROCK_ENDPOINT=https://bedrock-runtime.us-east-1.amazonaws.com

# Database (실제 SQL 실행 시)
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Redis (결과 캐싱 시)
REDIS_URL=redis://localhost:6379

# Application
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## .env.production (프로덕션 환경)

```env
# AWS Bedrock - IAM Role 사용 (EC2, ECS, Lambda 등)
AWS_REGION=us-east-1
# AWS_ACCESS_KEY_ID는 IAM Role 사용 시 불필요
# AWS_SECRET_ACCESS_KEY는 IAM Role 사용 시 불필요

DATABASE_URL=postgresql://user:password@prod-db.example.com:5432/dbname
REDIS_URL=redis://prod-redis.example.com:6379

NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## AWS IAM 정책 설정

### 1. Bedrock 접근 정책 생성

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "BedrockInvokeModel",
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": [
        "arn:aws:bedrock:*:*:foundation-model/anthropic.claude-3-5-haiku-20241022-v1:0"
      ]
    }
  ]
}
```

### 2. IAM 사용자 생성 (개발 환경)

1. AWS Console → IAM → Users → Create user
2. User name: `sql-pipeline-dev`
3. Attach policies directly → 위에서 생성한 정책 선택
4. Create user
5. Security credentials → Create access key
6. Access key와 Secret key를 `.env.local`에 저장

### 3. IAM Role 생성 (프로덕션 환경 - ECS/EC2)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

## Bedrock 모델 접근 권한 활성화

### 1. AWS Console에서 Bedrock 활성화

1. AWS Console → Amazon Bedrock
2. 왼쪽 메뉴 → Model access
3. "Manage model access" 클릭
4. "Anthropic - Claude 3.5 Haiku" 체크
5. Request model access

### 2. 모델 사용 가능 여부 확인

```bash
aws bedrock list-foundation-models \
  --region us-east-1 \
  --query "modelSummaries[?contains(modelId, 'claude-3-5-haiku')].{ModelId:modelId, ModelName:modelName}"
```

예상 결과:
```json
[
  {
    "ModelId": "anthropic.claude-3-5-haiku-20241022-v1:0",
    "ModelName": "Claude 3.5 Haiku"
  }
]
```

## AWS CLI 설정 (로컬 개발)

### 1. AWS CLI 설치

```bash
# macOS
brew install awscli

# Windows
choco install awscli

# Linux
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

### 2. Credentials 설정

```bash
aws configure

# 입력:
# AWS Access Key ID: your-access-key-id
# AWS Secret Access Key: your-secret-access-key
# Default region name: us-east-1
# Default output format: json
```

### 3. 연결 테스트

```bash
# Bedrock 모델 리스트 확인
aws bedrock list-foundation-models --region us-east-1

# Claude Haiku 4.5로 테스트 호출
aws bedrock-runtime invoke-model \
  --model-id anthropic.claude-3-5-haiku-20241022-v1:0 \
  --region us-east-1 \
  --body '{"anthropic_version":"bedrock-2023-05-31","max_tokens":100,"messages":[{"role":"user","content":"Hello"}]}' \
  --cli-binary-format raw-in-base64-out \
  output.json

cat output.json
```

## Docker 환경 설정

### Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

# AWS CLI 설치 (선택사항)
RUN apk add --no-cache aws-cli

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# 환경 변수는 런타임에 주입
ENV AWS_REGION=us-east-1

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - AWS_REGION=us-east-1
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
      - DATABASE_URL=${DATABASE_URL}
    env_file:
      - .env.local
```

## 비용 모니터링 설정

### CloudWatch Alarms 설정

```bash
# Bedrock 사용량 알람 설정
aws cloudwatch put-metric-alarm \
  --alarm-name bedrock-high-usage \
  --alarm-description "Bedrock API 호출이 많을 때 알림" \
  --metric-name InvocationsCount \
  --namespace AWS/Bedrock \
  --statistic Sum \
  --period 3600 \
  --evaluation-periods 1 \
  --threshold 1000 \
  --comparison-operator GreaterThanThreshold
```

### Cost Explorer API로 비용 추적

```typescript
// lib/cost-tracker.ts
import { CostExplorerClient, GetCostAndUsageCommand } from "@aws-sdk/client-cost-explorer"

async function getBedrockCost() {
  const client = new CostExplorerClient({ region: 'us-east-1' })
  
  const command = new GetCostAndUsageCommand({
    TimePeriod: {
      Start: '2024-01-01',
      End: '2024-01-31'
    },
    Granularity: 'DAILY',
    Metrics: ['UnblendedCost'],
    Filter: {
      Dimensions: {
        Key: 'SERVICE',
        Values: ['Amazon Bedrock']
      }
    }
  })
  
  const response = await client.send(command)
  return response.ResultsByTime
}
```

## 보안 Best Practices

### 1. Secrets Manager 사용 (프로덕션)

```typescript
// lib/secrets.ts
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager"

async function getBedrockCredentials() {
  const client = new SecretsManagerClient({ region: 'us-east-1' })
  
  const command = new GetSecretValueCommand({
    SecretId: 'prod/sql-pipeline/bedrock-credentials'
  })
  
  const response = await client.send(command)
  return JSON.parse(response.SecretString!)
}
```

### 2. VPC Endpoint 사용 (프라이빗 네트워크)

```bash
# VPC Endpoint 생성
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-xxxxx \
  --service-name com.amazonaws.us-east-1.bedrock-runtime \
  --route-table-ids rtb-xxxxx
```

### 3. 환경 변수 암호화 (ECS)

```json
{
  "containerDefinitions": [
    {
      "name": "sql-pipeline",
      "secrets": [
        {
          "name": "AWS_ACCESS_KEY_ID",
          "valueFrom": "arn:aws:secretsmanager:region:account-id:secret:secret-name"
        }
      ]
    }
  ]
}
```

## 트러블슈팅

### 1. "Model not found" 에러

**원인:** Bedrock 모델 접근 권한 미활성화

**해결:**
1. AWS Console → Bedrock → Model access
2. Claude 3.5 Haiku 모델 활성화

### 2. "AccessDeniedException" 에러

**원인:** IAM 권한 부족

**해결:**
```json
{
  "Effect": "Allow",
  "Action": [
    "bedrock:InvokeModel"
  ],
  "Resource": "*"
}
```

### 3. "ThrottlingException" 에러

**원인:** API 호출 제한 초과

**해결:**
- `batch_size` 줄이기
- 호출 간 딜레이 추가
- Quota 증가 요청

### 4. "ValidationException: Invalid region" 에러

**원인:** Bedrock 미지원 리전

**해결:**
- 지원 리전 사용: us-east-1, us-west-2, eu-central-1 등
- AWS_REGION 환경 변수 확인

## 개발 환경 설정 체크리스트

- [ ] Node.js 20+ 설치
- [ ] AWS CLI 설치 및 설정
- [ ] AWS 계정에 Bedrock 접근 권한 설정
- [ ] Claude 3.5 Haiku 모델 접근 활성화
- [ ] `.env.local` 파일 생성 및 credentials 설정
- [ ] `npm install` 실행
- [ ] AWS 연결 테스트 (`aws bedrock list-foundation-models`)
- [ ] 로컬 서버 실행 (`npm run dev`)

## 프로덕션 배포 체크리스트

- [ ] IAM Role 생성 (ECS/EC2용)
- [ ] Bedrock 정책 연결
- [ ] VPC Endpoint 설정 (선택사항)
- [ ] CloudWatch Logs 설정
- [ ] Cost Explorer 알람 설정
- [ ] Secrets Manager에 credentials 저장
- [ ] 환경 변수 검증
- [ ] 부하 테스트 실행
- [ ] 모니터링 대시보드 설정

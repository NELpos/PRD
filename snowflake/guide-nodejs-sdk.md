# Snowflake Node.js SDK - 완전 가이드

## 목차
- [개요](#개요)
- [설치](#설치)
- [연결 설정](#연결-설정)
- [쿼리 실행](#쿼리-실행)
- [Statement 객체와 메타데이터](#statement-객체와-메타데이터)
- [쿼리 정보 조회](#쿼리-정보-조회)
- [세션 상태 및 웨어하우스 정보](#세션-상태-및-웨어하우스-정보)
- [결과 처리](#결과-처리)
- [비동기 쿼리](#비동기-쿼리)
- [멀티 스테이트먼트 쿼리](#멀티-스테이트먼트-쿼리)
- [에러 처리](#에러-처리)
- [연결 옵션](#연결-옵션)
- [베스트 프랙티스](#베스트-프랙티스)

---

## 개요

Snowflake Node.js SDK(`snowflake-sdk`)는 Node.js 애플리케이션에서 Snowflake 데이터 웨어하우스에 연결하고 쿼리를 실행할 수 있게 해주는 공식 드라이버입니다.

### 주요 기능
- Snowflake 데이터베이스 연결 및 인증
- SQL 쿼리 실행 (동기/비동기)
- 쿼리 메타데이터 및 실행 정보 조회
- 스트리밍 결과 처리
- 멀티 스테이트먼트 쿼리 지원
- PUT/GET 명령어 지원 (파일 업로드/다운로드)

---

## 설치

```bash
npm install snowflake-sdk
```

또는

```bash
yarn add snowflake-sdk
```

---

## 연결 설정

### 기본 연결

```javascript
const snowflake = require('snowflake-sdk');

// Connection 객체 생성
const connection = snowflake.createConnection({
  account: 'your_account',
  username: 'your_username',
  password: 'your_password',
  warehouse: 'your_warehouse',
  database: 'your_database',
  schema: 'your_schema'
});

// 연결
connection.connect((err, conn) => {
  if (err) {
    console.error('Unable to connect: ' + err.message);
  } else {
    console.log('Successfully connected');
    console.log('Connection ID: ' + conn.getId());
  }
});
```

### Promise 기반 연결

```javascript
async function connectToSnowflake() {
  return new Promise((resolve, reject) => {
    connection.connect((err, conn) => {
      if (err) {
        reject(err);
      } else {
        resolve(conn);
      }
    });
  });
}

// 사용
try {
  const conn = await connectToSnowflake();
  console.log('Connected with ID:', conn.getId());
} catch (error) {
  console.error('Connection failed:', error.message);
}
```

### 다양한 인증 방법

```javascript
// 1. 기본 인증 (Username/Password)
const connection = snowflake.createConnection({
  account: 'your_account',
  username: 'your_username',
  password: 'your_password',
  authenticator: 'SNOWFLAKE' // 기본값
});

// 2. OAuth 인증
const connection = snowflake.createConnection({
  account: 'your_account',
  username: 'your_username',
  token: 'your_oauth_token',
  authenticator: 'OAUTH'
});

// 3. Okta 인증
const connection = snowflake.createConnection({
  account: 'your_account',
  username: 'your_okta_username',
  password: 'your_okta_password',
  authenticator: 'https://<okta_account_name>.okta.com'
});

// 4. Key Pair 인증
const connection = snowflake.createConnection({
  account: 'your_account',
  username: 'your_username',
  authenticator: 'SNOWFLAKE_JWT',
  privateKey: 'your_private_key',
  privateKeyPath: '/path/to/private/key',
  privateKeyPass: 'your_private_key_passphrase'
});
```

---

## 쿼리 실행

### 기본 쿼리 실행

```javascript
connection.execute({
  sqlText: 'SELECT * FROM my_table LIMIT 10',
  complete: function(err, stmt, rows) {
    if (err) {
      console.error('Failed to execute statement: ' + err.message);
    } else {
      console.log('Successfully executed statement: ' + stmt.getSqlText());
      console.log('Number of rows: ' + rows.length);
      console.log('Rows:', rows);
    }
  }
});
```

### Promise 기반 쿼리 실행

```javascript
function executeQuery(sqlText) {
  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText: sqlText,
      complete: function(err, stmt, rows) {
        if (err) {
          reject(err);
        } else {
          resolve({ stmt, rows });
        }
      }
    });
  });
}

// 사용
try {
  const { stmt, rows } = await executeQuery('SELECT * FROM my_table');
  console.log('Query ID:', stmt.getQueryId());
  console.log('Results:', rows);
} catch (error) {
  console.error('Query failed:', error.message);
}
```

### 파라미터 바인딩

```javascript
connection.execute({
  sqlText: 'SELECT * FROM my_table WHERE id = ? AND name = ?',
  binds: [123, 'John Doe'],
  complete: function(err, stmt, rows) {
    if (err) {
      console.error('Error:', err.message);
    } else {
      console.log('Results:', rows);
    }
  }
});
```

---

## Statement 객체와 메타데이터

`Statement` 객체는 쿼리 실행 후 다양한 메타데이터와 결과 정보를 제공합니다.

### Statement 주요 메서드

| 메서드 | 반환 타입 | 설명 |
|--------|-----------|------|
| `getSqlText()` | `string` | 실행된 SQL 텍스트 반환 |
| `getQueryId()` | `string` | Snowflake Query ID 반환 (쿼리 추적용) |
| `getRequestId()` | `string` | Request ID 반환 |
| `getStatementId()` | `string` | Statement ID 반환 (deprecated, getQueryId 사용 권장) |
| `getNumRows()` | `number` | 결과 행 수 반환 |
| `getNumUpdatedRows()` | `number \| undefined` | 업데이트된 행 수 반환 (INSERT/UPDATE/DELETE) |
| `getSessionState()` | `object \| undefined` | 세션 상태 정보 반환 (warehouse, database, schema 등) |
| `getColumns()` | `Column[]` | 모든 컬럼 메타데이터 배열 반환 |
| `getColumn(identifier)` | `Column` | 특정 컬럼 정보 반환 (인덱스 또는 이름으로) |
| `isColumnNullable(colIdx)` | `boolean` | 컬럼이 NULL 값을 허용하는지 확인 (1-based index) |
| `isColumnText(colIdx)` | `boolean` | 컬럼이 텍스트 타입인지 확인 (1-based index) |
| `streamRows(options)` | `Readable` | 결과를 스트림으로 반환 |
| `cancel(callback)` | `void` | 실행 중인 쿼리 취소 |
| `hasNext()` | `boolean` | 다음 결과 세트가 있는지 확인 (멀티 스테이트먼트) |
| `nextResult()` | `void` | 다음 결과 세트로 이동 (멀티 스테이트먼트) |

### 예제: Statement 메서드 사용

```javascript
connection.execute({
  sqlText: 'SELECT id, name, email FROM users WHERE active = true',
  complete: function(err, stmt, rows) {
    if (err) {
      console.error('Error:', err.message);
      return;
    }

    // SQL 텍스트
    console.log('Executed SQL:', stmt.getSqlText());
    
    // Query ID (Snowflake UI에서 쿼리 추적 가능)
    console.log('Query ID:', stmt.getQueryId());
    
    // Request ID
    console.log('Request ID:', stmt.getRequestId());
    
    // 결과 행 수
    console.log('Number of rows:', stmt.getNumRows());
    
    // 컬럼 정보
    const columns = stmt.getColumns();
    console.log('Columns:');
    columns.forEach((col, idx) => {
      console.log(`  Column ${idx + 1}:`, col.getName(), '-', col.getType());
    });
    
    // 특정 컬럼 정보
    const firstColumn = stmt.getColumn(0); // 인덱스로
    const nameColumn = stmt.getColumn('name'); // 이름으로
    
    // 컬럼이 nullable인지 확인 (1-based index)
    console.log('First column nullable:', stmt.isColumnNullable(1));
    
    // 컬럼이 텍스트 타입인지 확인
    console.log('Second column is text:', stmt.isColumnText(2));
    
    // 세션 상태 (웨어하우스, 데이터베이스 등)
    const sessionState = stmt.getSessionState();
    console.log('Session State:', sessionState);
  }
});
```

---

## 쿼리 정보 조회

### Query ID를 사용한 쿼리 추적

```javascript
let queryId;

// 쿼리 실행
connection.execute({
  sqlText: 'SELECT COUNT(*) FROM large_table',
  complete: function(err, stmt, rows) {
    if (!err) {
      queryId = stmt.getQueryId();
      console.log('Query ID:', queryId);
      
      // 이 Query ID로 Snowflake UI의 Query History에서
      // 쿼리 실행 상세 정보 확인 가능
      console.log(`View in Snowflake UI: https://<account>.snowflakecomputing.com/console#/monitoring/queries/detail?queryId=${queryId}`);
    }
  }
});
```

### DML 쿼리 결과 확인

```javascript
connection.execute({
  sqlText: 'UPDATE users SET status = ? WHERE last_login < ?',
  binds: ['inactive', '2023-01-01'],
  complete: function(err, stmt, rows) {
    if (!err) {
      console.log('Query ID:', stmt.getQueryId());
      console.log('Rows updated:', stmt.getNumUpdatedRows());
      console.log('SQL executed:', stmt.getSqlText());
    }
  }
});
```

---

## 세션 상태 및 웨어하우스 정보

`getSessionState()` 메서드는 쿼리 실행 완료 시점의 세션 컨텍스트 정보를 반환합니다.

### 세션 상태 확인

```javascript
connection.execute({
  sqlText: 'SELECT * FROM my_table',
  complete: function(err, stmt, rows) {
    if (!err) {
      const sessionState = stmt.getSessionState();
      
      if (sessionState) {
        console.log('Current Warehouse:', sessionState.warehouse);
        console.log('Current Database:', sessionState.database);
        console.log('Current Schema:', sessionState.schema);
        console.log('Current Role:', sessionState.role);
        
        // 전체 세션 상태 정보
        console.log('Full Session State:', JSON.stringify(sessionState, null, 2));
      }
    }
  }
});
```

### 실행 중 세션 컨텍스트 변경

```javascript
// 웨어하우스 변경
connection.execute({
  sqlText: 'USE WAREHOUSE compute_wh',
  complete: function(err, stmt, rows) {
    if (!err) {
      console.log('Warehouse changed');
      
      // 이후 쿼리는 새 웨어하우스 사용
      connection.execute({
        sqlText: 'SELECT * FROM large_table',
        complete: function(err, stmt, rows) {
          const sessionState = stmt.getSessionState();
          console.log('Current Warehouse:', sessionState.warehouse);
        }
      });
    }
  }
});

// 데이터베이스 및 스키마 변경
connection.execute({
  sqlText: 'USE DATABASE production; USE SCHEMA public;',
  complete: function(err, stmt, rows) {
    if (!err) {
      const sessionState = stmt.getSessionState();
      console.log('Database:', sessionState.database);
      console.log('Schema:', sessionState.schema);
    }
  }
});
```

---

## 결과 처리

### 1. 전체 결과를 배열로 받기

```javascript
connection.execute({
  sqlText: 'SELECT * FROM users LIMIT 100',
  complete: function(err, stmt, rows) {
    if (!err) {
      // rows는 배열
      console.log('Total rows:', rows.length);
      rows.forEach(row => {
        console.log(row);
      });
    }
  }
});
```

### 2. 스트리밍으로 결과 처리 (대용량 데이터)

```javascript
connection.execute({
  sqlText: 'SELECT * FROM large_table',
  streamResult: true, // 스트리밍 활성화
  complete: function(err, stmt, rows) {
    if (err) {
      console.error('Error:', err.message);
      return;
    }
    
    console.log('Query ID:', stmt.getQueryId());
    console.log('Total rows:', stmt.getNumRows());
    
    // 스트림 생성
    const stream = stmt.streamRows({
      start: 0,
      end: stmt.getNumRows() - 1
    });
    
    let rowCount = 0;
    
    stream.on('data', function(row) {
      rowCount++;
      console.log('Row', rowCount, ':', row);
    });
    
    stream.on('end', function() {
      console.log('Stream finished. Total rows processed:', rowCount);
    });
    
    stream.on('error', function(err) {
      console.error('Stream error:', err.message);
    });
  }
});
```

### 3. 행 단위 처리 (fetchRows)

```javascript
connection.execute({
  sqlText: 'SELECT * FROM my_table',
  complete: function(err, stmt, rows) {
    if (!err) {
      // 특정 범위의 행만 가져오기
      stmt.fetchRows({
        start: 0,
        end: 99, // 처음 100개 행
        each: function(err, row, rowIdx) {
          console.log(`Row ${rowIdx}:`, row);
        },
        end: function() {
          console.log('All rows fetched');
        }
      });
    }
  }
});
```

### 4. 결과 형식 지정

```javascript
// rowMode 옵션으로 결과 형식 지정
connection.execute({
  sqlText: 'SELECT id, name, email FROM users',
  rowMode: 'object', // 'array', 'object', 'object_with_renamed_duplicated_columns'
  complete: function(err, stmt, rows) {
    if (!err) {
      // rowMode: 'object'인 경우
      // rows[0] = { id: 1, name: 'John', email: 'john@example.com' }
      
      // rowMode: 'array'인 경우
      // rows[0] = [1, 'John', 'john@example.com']
      
      console.log(rows);
    }
  }
});
```

---

## 비동기 쿼리

장시간 실행되는 쿼리의 경우 비동기 실행을 사용하여 연결을 차단하지 않을 수 있습니다.

### 비동기 쿼리 실행 및 폴링

```javascript
let queryId;
let statement;

// 1. asyncExec: true로 쿼리 실행
await new Promise((resolve) => {
  statement = connection.execute({
    sqlText: 'CALL SYSTEM$WAIT(30, \'SECONDS\')', // 30초 대기
    asyncExec: true, // 비동기 실행
    complete: async function(err, stmt, rows) {
      if (err) {
        console.error('Error:', err.message);
        resolve();
      } else {
        queryId = stmt.getQueryId();
        console.log('Query started with ID:', queryId);
        resolve();
      }
    }
  });
});

// 2. 쿼리 상태 폴링
const pollIntervalSeconds = 2;
let status = await connection.getQueryStatus(queryId);

while (connection.isStillRunning(status)) {
  console.log(`Query status: ${status}, waiting ${pollIntervalSeconds} seconds...`);
  await new Promise(resolve => setTimeout(resolve, pollIntervalSeconds * 1000));
  status = await connection.getQueryStatus(queryId);
}

console.log(`Query finished with status: ${status}`);

// 3. Query ID로 결과 조회
connection.getResultsFromQueryId({
  queryId: queryId,
  complete: function(err, stmt, rows) {
    if (err) {
      console.error('Error getting results:', err.message);
    } else {
      console.log('Results:', rows);
      console.log('Number of rows:', stmt.getNumRows());
    }
  }
});
```

### Promise 기반 비동기 쿼리

```javascript
async function executeAsyncQuery(sqlText) {
  // 1. 비동기 쿼리 시작
  const queryId = await new Promise((resolve, reject) => {
    connection.execute({
      sqlText: sqlText,
      asyncExec: true,
      complete: function(err, stmt, rows) {
        if (err) {
          reject(err);
        } else {
          resolve(stmt.getQueryId());
        }
      }
    });
  });
  
  console.log('Query ID:', queryId);
  
  // 2. 쿼리 완료 대기
  let status;
  do {
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2초 대기
    status = await connection.getQueryStatus(queryId);
    console.log('Current status:', status);
  } while (connection.isStillRunning(status));
  
  // 3. 결과 조회
  return new Promise((resolve, reject) => {
    connection.getResultsFromQueryId({
      queryId: queryId,
      complete: function(err, stmt, rows) {
        if (err) {
          reject(err);
        } else {
          resolve({ stmt, rows });
        }
      }
    });
  });
}

// 사용
try {
  const { stmt, rows } = await executeAsyncQuery('SELECT COUNT(*) FROM huge_table');
  console.log('Query completed:', stmt.getQueryId());
  console.log('Results:', rows);
} catch (error) {
  console.error('Async query failed:', error.message);
}
```

### 쿼리 취소

```javascript
let statement;

statement = connection.execute({
  sqlText: 'SELECT * FROM very_large_table',
  asyncExec: true,
  complete: function(err, stmt, rows) {
    console.log('Query completed or cancelled');
  }
});

// 쿼리 취소
setTimeout(() => {
  statement.cancel(function(err) {
    if (err) {
      console.error('Failed to cancel:', err.message);
    } else {
      console.log('Query cancelled successfully');
    }
  });
}, 5000); // 5초 후 취소
```

---

## 멀티 스테이트먼트 쿼리

여러 SQL 문을 세미콜론으로 구분하여 한 번에 실행할 수 있습니다.

### 기본 멀티 스테이트먼트

```javascript
connection.execute({
  sqlText: `
    CREATE OR REPLACE TABLE test(n INT);
    INSERT INTO test VALUES(1), (2), (3);
    SELECT * FROM test ORDER BY n;
  `,
  parameters: {
    MULTI_STATEMENT_COUNT: 3 // 실행할 문의 개수
  },
  complete: function(err, stmt, rows) {
    if (err) {
      console.error('Error:', err.message);
      return;
    }
    
    console.log('First statement completed');
    console.log('SQL:', stmt.getSqlText());
    console.log('Query ID:', stmt.getQueryId());
    
    // 첫 번째 결과 (CREATE TABLE) - 보통 rows가 없음
    if (rows && rows.length > 0) {
      console.log('Rows:', rows);
    }
    
    // 다음 결과 세트가 있는지 확인
    if ('hasNext' in stmt && stmt.hasNext()) {
      // 다음 결과로 이동 (재귀적으로 처리)
      stmt.nextResult();
    } else {
      console.log('All statements completed');
      connection.destroy();
    }
  }
});
```

### 모든 스테이트먼트 결과 수집

```javascript
function executeMultiStatement(sqlText, count) {
  return new Promise((resolve, reject) => {
    const results = [];
    
    connection.execute({
      sqlText: sqlText,
      parameters: { MULTI_STATEMENT_COUNT: count },
      complete: function processResult(err, stmt, rows) {
        if (err) {
          reject(err);
          return;
        }
        
        // 현재 결과 저장
        results.push({
          queryId: stmt.getQueryId(),
          sqlText: stmt.getSqlText(),
          rows: rows || [],
          numRows: stmt.getNumRows(),
          numUpdatedRows: stmt.getNumUpdatedRows()
        });
        
        // 다음 결과가 있으면 처리
        if (stmt.hasNext && stmt.hasNext()) {
          stmt.nextResult();
        } else {
          // 모든 결과 반환
          resolve(results);
        }
      }
    });
  });
}

// 사용
try {
  const results = await executeMultiStatement(`
    CREATE OR REPLACE TABLE test(id INT, name STRING);
    INSERT INTO test VALUES(1, 'Alice'), (2, 'Bob');
    SELECT * FROM test;
    DROP TABLE test;
  `, 4);
  
  results.forEach((result, idx) => {
    console.log(`\nStatement ${idx + 1}:`);
    console.log('Query ID:', result.queryId);
    console.log('SQL:', result.sqlText);
    console.log('Rows:', result.numRows);
    console.log('Updated:', result.numUpdatedRows);
    if (result.rows.length > 0) {
      console.log('Data:', result.rows);
    }
  });
} catch (error) {
  console.error('Multi-statement execution failed:', error.message);
}
```

### 동적 멀티 스테이트먼트 (카운트 자동)

```javascript
// MULTI_STATEMENT_COUNT를 0으로 설정하면 자동으로 모든 문 실행
connection.execute({
  sqlText: 'ALTER SESSION SET MULTI_STATEMENT_COUNT=0',
  complete: function(err, stmt, rows) {
    if (!err) {
      // 이제 카운트 지정 없이 멀티 스테이트먼트 실행 가능
      connection.execute({
        sqlText: `
          SELECT 1;
          SELECT 2;
          SELECT 3;
        `,
        complete: function(err, stmt, rows) {
          // 결과 처리
        }
      });
    }
  }
});
```

---

## 에러 처리

### 기본 에러 처리

```javascript
connection.execute({
  sqlText: 'SELECT * FROM non_existent_table',
  complete: function(err, stmt, rows) {
    if (err) {
      console.error('Error occurred:');
      console.error('  Message:', err.message);
      console.error('  Code:', err.code);
      console.error('  SQL State:', err.sqlState);
      
      // 스택 트레이스
      console.error('  Stack:', err.stack);
      
      return;
    }
    
    // 정상 처리
    console.log('Query succeeded');
  }
});
```

### Try-Catch를 사용한 에러 처리

```javascript
async function safeExecuteQuery(sqlText) {
  try {
    return await new Promise((resolve, reject) => {
      connection.execute({
        sqlText: sqlText,
        complete: function(err, stmt, rows) {
          if (err) {
            reject(err);
          } else {
            resolve({ stmt, rows });
          }
        }
      });
    });
  } catch (error) {
    console.error('Query execution failed:');
    console.error('  SQL:', sqlText);
    console.error('  Error:', error.message);
    throw error; // 또는 적절한 에러 처리
  }
}

// 사용
try {
  const { stmt, rows } = await safeExecuteQuery('SELECT * FROM users');
  console.log('Success:', stmt.getQueryId());
} catch (error) {
  // 에러 처리
}
```

### 연결 에러 처리

```javascript
connection.connect((err, conn) => {
  if (err) {
    // 연결 실패 원인 분석
    if (err.message.includes('Incorrect username or password')) {
      console.error('Authentication failed: Check credentials');
    } else if (err.message.includes('does not exist')) {
      console.error('Account does not exist');
    } else if (err.message.includes('timeout')) {
      console.error('Connection timeout: Check network');
    } else {
      console.error('Connection failed:', err.message);
    }
    
    return;
  }
  
  console.log('Connected successfully');
});
```

### 재시도 로직

```javascript
async function executeWithRetry(sqlText, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries}`);
      
      return await new Promise((resolve, reject) => {
        connection.execute({
          sqlText: sqlText,
          complete: function(err, stmt, rows) {
            if (err) {
              reject(err);
            } else {
              resolve({ stmt, rows });
            }
          }
        });
      });
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt} failed:`, error.message);
      
      // 재시도 가능한 에러인지 확인
      if (error.code === '390144' || // Query execution timeout
          error.message.includes('timeout')) {
        if (attempt < maxRetries) {
          // 지수 백오프
          const waitTime = Math.pow(2, attempt) * 1000;
          console.log(`Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
      } else {
        // 재시도 불가능한 에러
        throw error;
      }
    }
  }
  
  throw new Error(`Query failed after ${maxRetries} attempts: ${lastError.message}`);
}

// 사용
try {
  const { stmt, rows } = await executeWithRetry('SELECT * FROM large_table');
  console.log('Query succeeded:', stmt.getQueryId());
} catch (error) {
  console.error('Final failure:', error.message);
}
```

---

## 연결 옵션

### 주요 연결 옵션

```javascript
const connection = snowflake.createConnection({
  // 필수 옵션
  account: 'your_account',
  username: 'your_username',
  password: 'your_password',
  
  // 선택 옵션 - 세션 컨텍스트
  warehouse: 'compute_wh',
  database: 'production',
  schema: 'public',
  role: 'analyst',
  
  // 선택 옵션 - 연결 설정
  timeout: 60000, // 연결 타임아웃 (밀리초)
  clientSessionKeepAlive: true, // 세션 유지
  clientSessionKeepAliveHeartbeatFrequency: 3600, // 하트비트 주기 (초)
  
  // 선택 옵션 - 결과 처리
  rowMode: 'object', // 'array', 'object', 'object_with_renamed_duplicated_columns'
  fetchAsString: ['Number', 'Date'], // 특정 타입을 문자열로
  
  // 선택 옵션 - 성능
  clientPrefetchThreads: 4, // 프리페치 스레드 수 (1-10)
  
  // 선택 옵션 - 보안
  insecureConnect: false, // HTTPS 사용
  
  // 선택 옵션 - 프록시
  proxyHost: 'proxy.company.com',
  proxyPort: 8080,
  proxyProtocol: 'http',
  proxyUser: 'proxy_user',
  proxyPassword: 'proxy_password',
  
  // 선택 옵션 - 쿼리 태그
  queryTag: 'my_app_v1.0'
});
```

### Execute 옵션

```javascript
connection.execute({
  // SQL 문
  sqlText: 'SELECT * FROM my_table WHERE id = ?',
  
  // 바인딩 파라미터
  binds: [123],
  
  // 완료 콜백
  complete: function(err, stmt, rows) { },
  
  // 스트리밍
  streamResult: true,
  
  // 비동기 실행
  asyncExec: true,
  
  // 결과 형식
  rowMode: 'object',
  
  // 특정 타입을 문자열로 변환
  fetchAsString: ['Number'],
  
  // 멀티 스테이트먼트
  parameters: {
    MULTI_STATEMENT_COUNT: 3
  },
  
  // 작업 디렉토리 (PUT/GET 명령용)
  cwd: '/path/to/working/directory',
  
  // Describe only (메타데이터만 조회)
  describeOnly: true
});
```

---

## 베스트 프랙티스

### 1. 연결 재사용

```javascript
// ❌ 나쁜 예: 매번 새 연결 생성
async function badQuery() {
  const connection = snowflake.createConnection({ /* ... */ });
  await connection.connect(/* ... */);
  await connection.execute(/* ... */);
  connection.destroy();
}

// ✅ 좋은 예: 연결 재사용
let globalConnection;

async function getConnection() {
  if (!globalConnection) {
    globalConnection = snowflake.createConnection({ /* ... */ });
    await new Promise((resolve, reject) => {
      globalConnection.connect((err, conn) => {
        if (err) reject(err);
        else resolve(conn);
      });
    });
  }
  return globalConnection;
}

async function goodQuery() {
  const connection = await getConnection();
  // 쿼리 실행
}
```

### 2. Promise 래퍼 사용

```javascript
// 재사용 가능한 헬퍼 함수
function executePromise(connection, options) {
  return new Promise((resolve, reject) => {
    connection.execute({
      ...options,
      complete: function(err, stmt, rows) {
        if (err) {
          reject(err);
        } else {
          resolve({ stmt, rows });
        }
      }
    });
  });
}

// 사용
const { stmt, rows } = await executePromise(connection, {
  sqlText: 'SELECT * FROM users'
});
```

### 3. 트랜잭션 관리

```javascript
async function executeTransaction(queries) {
  try {
    // 트랜잭션 시작
    await executePromise(connection, { sqlText: 'BEGIN' });
    
    // 쿼리 실행
    for (const query of queries) {
      const { stmt } = await executePromise(connection, { sqlText: query });
      console.log('Executed:', stmt.getQueryId());
    }
    
    // 커밋
    await executePromise(connection, { sqlText: 'COMMIT' });
    console.log('Transaction committed');
    
  } catch (error) {
    // 롤백
    console.error('Transaction failed, rolling back:', error.message);
    await executePromise(connection, { sqlText: 'ROLLBACK' });
    throw error;
  }
}

// 사용
await executeTransaction([
  "INSERT INTO orders VALUES (1, 'Product A', 100)",
  "UPDATE inventory SET quantity = quantity - 1 WHERE product = 'Product A'",
  "INSERT INTO audit_log VALUES (NOW(), 'Order created')"
]);
```

### 4. 대용량 데이터 처리

```javascript
// 스트리밍 사용
async function processLargeDataset() {
  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText: 'SELECT * FROM huge_table',
      streamResult: true,
      complete: function(err, stmt, rows) {
        if (err) {
          reject(err);
          return;
        }
        
        const stream = stmt.streamRows();
        let processedCount = 0;
        
        stream.on('data', function(row) {
          // 행 단위 처리
          processRow(row);
          processedCount++;
          
          if (processedCount % 10000 === 0) {
            console.log(`Processed ${processedCount} rows...`);
          }
        });
        
        stream.on('end', function() {
          console.log(`Total processed: ${processedCount} rows`);
          resolve(processedCount);
        });
        
        stream.on('error', function(err) {
          reject(err);
        });
      }
    });
  });
}
```

### 5. 쿼리 로깅 및 모니터링

```javascript
async function executeWithLogging(sqlText, binds = []) {
  const startTime = Date.now();
  
  try {
    console.log('Executing query:', sqlText);
    if (binds.length > 0) {
      console.log('Bindings:', binds);
    }
    
    const { stmt, rows } = await executePromise(connection, {
      sqlText: sqlText,
      binds: binds
    });
    
    const duration = Date.now() - startTime;
    
    console.log('Query completed:');
    console.log('  Query ID:', stmt.getQueryId());
    console.log('  Duration:', duration, 'ms');
    console.log('  Rows returned:', stmt.getNumRows());
    console.log('  Rows updated:', stmt.getNumUpdatedRows());
    
    const sessionState = stmt.getSessionState();
    if (sessionState) {
      console.log('  Warehouse:', sessionState.warehouse);
    }
    
    return { stmt, rows };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('Query failed:');
    console.error('  SQL:', sqlText);
    console.error('  Duration:', duration, 'ms');
    console.error('  Error:', error.message);
    throw error;
  }
}
```

### 6. 연결 풀링 (커스텀 구현)

```javascript
class SnowflakeConnectionPool {
  constructor(config, poolSize = 5) {
    this.config = config;
    this.poolSize = poolSize;
    this.connections = [];
    this.available = [];
  }
  
  async initialize() {
    for (let i = 0; i < this.poolSize; i++) {
      const conn = snowflake.createConnection(this.config);
      await new Promise((resolve, reject) => {
        conn.connect((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      this.connections.push(conn);
      this.available.push(conn);
    }
    console.log(`Pool initialized with ${this.poolSize} connections`);
  }
  
  async getConnection() {
    while (this.available.length === 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return this.available.shift();
  }
  
  releaseConnection(conn) {
    this.available.push(conn);
  }
  
  async execute(options) {
    const conn = await this.getConnection();
    try {
      return await executePromise(conn, options);
    } finally {
      this.releaseConnection(conn);
    }
  }
  
  destroy() {
    this.connections.forEach(conn => conn.destroy());
  }
}

// 사용
const pool = new SnowflakeConnectionPool({
  account: 'your_account',
  username: 'your_username',
  password: 'your_password'
}, 5);

await pool.initialize();

// 쿼리 실행
const { stmt, rows } = await pool.execute({
  sqlText: 'SELECT * FROM users'
});
```

### 7. 환경 변수 사용

```javascript
require('dotenv').config();

const connection = snowflake.createConnection({
  account: process.env.SNOWFLAKE_ACCOUNT,
  username: process.env.SNOWFLAKE_USER,
  password: process.env.SNOWFLAKE_PASSWORD,
  warehouse: process.env.SNOWFLAKE_WAREHOUSE,
  database: process.env.SNOWFLAKE_DATABASE,
  schema: process.env.SNOWFLAKE_SCHEMA,
  role: process.env.SNOWFLAKE_ROLE
});
```

### 8. Graceful Shutdown

```javascript
let connection;

async function initialize() {
  connection = snowflake.createConnection({ /* ... */ });
  await new Promise((resolve, reject) => {
    connection.connect((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function shutdown() {
  if (connection) {
    console.log('Closing Snowflake connection...');
    await new Promise((resolve) => {
      connection.destroy((err) => {
        if (err) {
          console.error('Error closing connection:', err.message);
        }
        resolve();
      });
    });
    console.log('Connection closed');
  }
}

// 프로세스 종료 시그널 처리
process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  await shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  await shutdown();
  process.exit(0);
});
```

---

## 추가 리소스

### 공식 문서
- [Snowflake Node.js Driver Documentation](https://docs.snowflake.com/en/developer-guide/node-js/nodejs-driver)
- [GitHub Repository](https://github.com/snowflakedb/snowflake-connector-nodejs)

### 주요 참고 사항
- 최대 요청 페이로드 크기: 128MB
- Query ID는 Snowflake UI에서 쿼리 추적에 사용 가능
- 비동기 쿼리는 장시간 실행 쿼리에 권장
- 대용량 데이터는 스트리밍 방식 사용 권장
- 연결은 재사용하고 종료 시 명시적으로 닫기

### TypeScript 지원
```typescript
import * as snowflake from 'snowflake-sdk';

const connection: snowflake.Connection = snowflake.createConnection({
  account: 'your_account',
  username: 'your_username',
  password: 'your_password'
});

connection.execute({
  sqlText: 'SELECT * FROM users',
  complete: (err: Error | undefined, stmt: snowflake.Statement, rows: any[] | undefined) => {
    if (err) {
      console.error(err.message);
    } else {
      console.log(rows);
    }
  }
});
```

---

## 마치며

이 가이드는 Snowflake Node.js SDK의 주요 기능과 사용법을 다룹니다. 특히 쿼리 실행 후 Query ID, SQL 텍스트, 세션 상태(웨어하우스, 데이터베이스 등) 등의 메타데이터를 확인하는 방법에 중점을 두었습니다.

실제 프로덕션 환경에서는:
- 적절한 에러 처리 구현
- 연결 재사용 및 풀링
- 로깅 및 모니터링
- 보안 best practice 준수
- 성능 최적화 (스트리밍, 비동기 등)

를 고려하여 구현하시기 바랍니다.

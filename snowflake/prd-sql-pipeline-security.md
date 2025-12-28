# Product Requirements Document (PRD)
## Snowflake SQL Pipeline Enhancement for Security Event Analysis

**Version:** 1.0  
**Last Updated:** December 1, 2024  
**Author:** Security Analytics Team  
**Status:** Ready for Implementation

---

## Executive Summary

This PRD defines the architecture, optimization guidelines, and implementation priorities for a **client-side pipeline system** that processes SQL query results from Snowflake to provide advanced security event analysis capabilities.

**Key Insight:** Snowflake excels at large-scale data processing but lacks native support for:
1. Real-time threat intelligence enrichment
2. AI-powered analysis
3. Complex pattern detection
4. Custom security-specific transformations

Our pipeline bridges this gap by processing Snowflake query results (< 100K rows optimal) with specialized commands that are **impossible or inefficient** in pure SQL.

**Expected Impact:**
- 10-100x faster analysis workflows (manual → automated)
- 3x improvement in threat detection rate
- 50% reduction in false positives
- Sub-3 second total processing time for most queries

---

## Problem Statement

### Current Pain Points

1. **Snowflake Limitations:**
   - No native threat intelligence integration
   - External Functions are slow (10+ seconds) and complex to setup
   - Cannot process AI/ML models efficiently
   - Limited pattern matching for attack sequences

2. **Performance Bottlenecks:**
   - Network transfer of large datasets (> 100K rows) takes 20-60 seconds
   - Client-side processing of 1M+ rows causes browser crashes
   - Mixed SQL + client processing leads to confusion

3. **Analyst Workflow Issues:**
   - Manual copy-paste between tools (VirusTotal, AbuseIPDB, etc.)
   - No automated IOC extraction
   - Repetitive tasks take hours per day

### Target Users

- **Primary:** Security Analysts conducting threat hunting and incident response
- **Secondary:** SOC teams building automated detection rules
- **Tertiary:** Security Engineers creating custom analysis workflows

---

## Goals & Success Metrics

### North Star Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| **Analysis Time** | 1 hour (manual) | 6 minutes (automated) | Time from query → actionable insight |
| **Threat Detection Rate** | 60% | 90% | % of known attacks detected |
| **False Positive Rate** | 40% | 20% | % of alerts that are not threats |
| **Query Performance** | Variable | < 3 seconds | P95 latency for pipeline execution |

### Success Criteria

**Must Have (P0):**
- ✅ Process 10K rows in < 500ms
- ✅ Threat intel enrichment from 3+ sources
- ✅ AI-powered classification with confidence scores
- ✅ Automatic IOC extraction (IP, domain, hash, URL, email)

**Should Have (P1):**
- ✅ Baseline anomaly detection (z-score, IQR)
- ✅ Multi-stage attack sequence detection
- ✅ GeoIP enrichment with ASN lookup
- ✅ Result caching for instant re-queries

**Nice to Have (P2):**
- ✅ Custom ML model integration
- ✅ Auto-tuning for optimal performance
- ✅ Query plan visualization

---

## Architecture Guidelines

### Core Principle: **Snowflake First, Pipeline Second**

```
┌─────────────────────────────────────────────────────────────┐
│                    Decision Framework                        │
└─────────────────────────────────────────────────────────────┘

Question: "Where should this operation happen?"

1. Can Snowflake do this efficiently? (WHERE, GROUP BY, JOIN)
   └─ YES → Use Snowflake SQL ✅
   └─ NO → Go to Question 2

2. Is the data already small (< 10K rows)?
   └─ YES → Pipeline is OK ✅
   └─ NO → Go to Question 3

3. Is this an enrichment/AI operation?
   └─ YES → Pipeline is better ✅
   └─ NO → Reconsider SQL approach

GOLDEN RULE: "Filter in Snowflake, Enrich in Pipeline"
```

### Performance Optimization Checklist

#### ✅ Snowflake Query Optimization (10-100x improvement)

**CRITICAL - Apply These First:**

- [ ] **Predicate Pushdown** - Use WHERE clauses to filter early
  ```sql
  -- ✅ GOOD: Filter in Snowflake
  SELECT * FROM security_logs 
  WHERE timestamp > CURRENT_DATE - 7
    AND status = 'failed'
  
  -- ❌ BAD: Filter in pipeline
  SELECT * FROM security_logs
  | filter timestamp > '...' status = 'failed'
  ```
  **Impact: 100x faster** (30s → 300ms)

- [ ] **Aggregation in SQL** - GROUP BY, COUNT, SUM in Snowflake
  ```sql
  -- ✅ GOOD: 1M rows → 10K rows → transfer
  SELECT src_ip, COUNT(*) FROM logs GROUP BY src_ip
  
  -- ❌ BAD: Transfer 1M rows → aggregate client
  SELECT * FROM logs | stats count by src_ip
  ```
  **Impact: 40x faster** (22s → 500ms)

- [ ] **Column Projection** - SELECT only needed columns
  ```sql
  -- ✅ GOOD: 10MB transfer
  SELECT id, timestamp, src_ip FROM logs
  
  -- ❌ BAD: 50MB transfer
  SELECT * FROM logs
  ```
  **Impact: 5x faster** (5s → 1s)

- [ ] **Result Size Check** - Verify row count before pipeline
  ```sql
  -- Check first
  SELECT COUNT(*) FROM my_query;
  
  -- If > 100K rows, add more WHERE clauses
  ```

- [ ] **Query Result Cache** - Identical queries return instantly
  ```sql
  -- Snowflake auto-caches for 24 hours
  -- Re-running same query = 0ms
  ```

#### ✅ Pipeline Optimization (2-5x improvement)

- [ ] **Client-Side Caching** - Cache lookup tables in memory
  ```typescript
  const threatIntelCache = new Map<string, ThreatData>()
  // Lookup: 50ms → 0ms
  ```

- [ ] **Batch API Calls** - Group AI/API requests
  ```typescript
  // ✅ GOOD: 100 IPs in 1 batch = 2s
  await batchThreatLookup(ips, { batchSize: 100 })
  
  // ❌ BAD: 100 IPs × 100ms each = 10s
  for (const ip of ips) await threatLookup(ip)
  ```

- [ ] **Parallel Processing** - Use Promise.all for independent operations
  ```typescript
  const [geoData, threatData, asnData] = await Promise.all([
    geoipLookup(ips),
    threatLookup(ips),
    asnLookup(ips)
  ])
  ```

- [ ] **Early Exit** - Filter before expensive operations
  ```typescript
  data
    .filter(r => r.count > 100)        // Fast filter first
    .map(r => expensiveAICall(r))      // Then AI
  ```

#### ✅ Data Size Management

| Rows | Snowflake Time | Network Transfer | Pipeline Time | Total | Recommended |
|------|----------------|------------------|---------------|-------|-------------|
| < 1K | 200ms | 10ms | 50ms | 260ms | Either ✅ |
| 1K-10K | 300ms | 50ms | 200ms | 550ms | Either ✅ |
| 10K-100K | 500ms | 500ms | 2s | 3s | SQL + Light Pipeline ✅ |
| 100K-1M | 2s | 10s | 10s | 22s | **Optimize SQL!** ⚠️ |
| > 1M | 5s | 60s+ | 30s+ | 95s+ | **Must use SQL** ❌ |

**Action Items by Data Size:**

- **< 10K rows:** Pipeline is safe, use freely
- **10K-100K rows:** Use pipeline for enrichment only
- **> 100K rows:** Add WHERE clauses to reduce to < 100K

---

## Command Implementation Priority

### 🎯 Priority Framework

**Impact vs Effort Matrix:**

```
High Impact, Low Effort (DO FIRST) ⭐⭐⭐⭐⭐
├─ threat_lookup
├─ geoip
└─ ioc_extract

High Impact, Medium Effort (DO NEXT) ⭐⭐⭐⭐
├─ baseline_anomaly
├─ ai_enrich (expand existing)
└─ reputation_score

Medium Impact, Medium Effort (DO LATER) ⭐⭐⭐
├─ sequence_detect
├─ correlate
└─ dns_lookup

Low Impact / Specialized (DO LAST) ⭐⭐
├─ asn_lookup
├─ regex_multi
└─ time_bucket_adaptive
```

---

### 🥇 Tier 1 - MVP Commands (Week 1-2)

#### 1. `threat_lookup` - Threat Intelligence Enrichment

**Priority:** P0 - CRITICAL ⭐⭐⭐⭐⭐

**Description:** Query multiple threat intelligence sources in parallel and enrich data with threat context.

**Syntax:**
```sql
SELECT * FROM firewall_logs
| threat_lookup src_ip
  sources=virustotal,abuseipdb,otx,alienvault
  cache_ttl=3600
  batch_size=100
```

**Output Fields:**
- `{column}_threat_level` (0-10)
- `{column}_categories` (array of threat types)
- `{column}_last_seen` (timestamp)
- `{column}_confidence` (0-1)
- `{column}_sources` (which APIs returned data)

**API Integrations:**
1. **VirusTotal** - IP reputation, domain analysis
2. **AbuseIPDB** - IP abuse reports
3. **AlienVault OTX** - Open threat exchange
4. **Shodan** (optional) - Internet exposure

**Performance Target:**
- 100 IPs in < 2 seconds (with batching)
- Cache hit: 0ms
- Cache miss: 200ms per batch

**Implementation Notes:**
```typescript
interface ThreatLookupConfig {
  sources: ('virustotal' | 'abuseipdb' | 'otx' | 'shodan')[]
  cache_ttl: number // seconds
  batch_size: number
  fail_gracefully: boolean
}

// Parallel API calls
const results = await Promise.all([
  virusTotalBatch(ips),
  abuseIPDBBatch(ips),
  otxBatch(ips)
])

// Merge results with confidence scoring
const merged = mergeWithConfidence(results)
```

**Success Criteria:**
- ✅ Supports 4+ threat intel sources
- ✅ < 2 second latency for 100 IPs
- ✅ 95%+ cache hit rate for repeated queries
- ✅ Graceful degradation if one API fails

---

#### 2. `geoip` - Geographic IP Enrichment

**Priority:** P0 - CRITICAL ⭐⭐⭐⭐⭐

**Description:** Add geographic and network context to IP addresses.

**Syntax:**
```sql
SELECT * FROM access_logs
| geoip src_ip, dest_ip
  fields=country,city,lat,lng,asn,org
  database=maxmind
```

**Output Fields:**
- `{column}_country` (ISO code)
- `{column}_country_name` (full name)
- `{column}_city`
- `{column}_latitude`
- `{column}_longitude`
- `{column}_asn` (Autonomous System Number)
- `{column}_org` (Organization name)
- `{column}_timezone`

**Data Sources:**
1. **MaxMind GeoLite2** (free, 99% accurate)
2. **IP2Location** (alternative)
3. **ipapi.co** (API fallback)

**Performance Target:**
- 10K IPs in < 100ms (local database)
- Memory usage: ~200MB for GeoLite2 DB

**Implementation Notes:**
```typescript
import maxmind from 'maxmind'

// Load DB once at startup
const geoipDB = await maxmind.open('/data/GeoLite2-City.mmdb')
const asnDB = await maxmind.open('/data/GeoLite2-ASN.mmdb')

// Lookup is instant (in-memory)
const geoData = geoipDB.get(ipAddress) // < 1ms
```

**Success Criteria:**
- ✅ < 10ms per 100 IPs
- ✅ Supports both IPv4 and IPv6
- ✅ Auto-updates GeoIP database weekly
- ✅ Handles invalid IPs gracefully

---

#### 3. `ioc_extract` - Indicator of Compromise Extraction

**Priority:** P0 - CRITICAL ⭐⭐⭐⭐⭐

**Description:** Automatically extract IOCs from unstructured text (logs, emails, etc.)

**Syntax:**
```sql
SELECT * FROM email_logs
| ioc_extract from=body,subject,attachments
  types=ip,domain,url,hash,email,cve
  output=array
```

**Extraction Patterns:**

1. **IPv4:** `192.168.1.1`
2. **IPv6:** `2001:0db8:85a3::8a2e:0370:7334`
3. **Domain:** `malicious-domain.com`
4. **URL:** `https://phishing-site.com/payload`
5. **MD5:** `5d41402abc4b2a76b9719d911017c592`
6. **SHA-1:** `aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d`
7. **SHA-256:** `2c26b46b68ffc68ff99b453c1d30413413422d706...`
8. **Email:** `attacker@evil.com`
9. **CVE:** `CVE-2024-1234`
10. **Bitcoin:** `1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa`

**Output Format:**
```json
{
  "iocs_found": {
    "ip": ["192.168.1.1", "10.0.0.1"],
    "domain": ["evil.com"],
    "hash": ["5d41402abc4b2a76b9719d911017c592"],
    "url": ["https://phishing.com/login"],
    "email": ["attacker@evil.com"]
  },
  "ioc_count": 5,
  "ioc_types": ["ip", "domain", "hash", "url", "email"]
}
```

**Advanced Features:**
- Defanging detection: `hxxp://evil[.]com` → `http://evil.com`
- Context extraction: Include surrounding text
- Duplicate removal
- Confidence scoring

**Performance Target:**
- 1000 emails in < 500ms
- Regex compilation cached

**Success Criteria:**
- ✅ 95%+ precision (few false positives)
- ✅ 90%+ recall (catch most IOCs)
- ✅ Handles defanged IOCs
- ✅ Outputs structured format for further processing

---

### 🥈 Tier 2 - Advanced Commands (Week 3-4)

#### 4. `baseline_anomaly` - Statistical Anomaly Detection

**Priority:** P1 - HIGH ⭐⭐⭐⭐

**Description:** Detect anomalies by comparing current values against historical baselines.

**Syntax:**
```sql
SELECT * FROM user_activity
| baseline_anomaly 
  metric=login_count,bytes_sent
  by=user_id
  method=zscore,iqr,isolation_forest
  threshold=3
  window=30d
```

**Anomaly Detection Methods:**

1. **Z-Score:** `z = (x - μ) / σ`
   - Simple, fast
   - Assumes normal distribution
   - Threshold: typically 3

2. **IQR (Interquartile Range):**
   - Robust to outliers
   - Works with skewed distributions
   - Outlier: `< Q1 - 1.5×IQR` or `> Q3 + 1.5×IQR`

3. **Isolation Forest (ML):**
   - Detects complex anomalies
   - No distribution assumptions
   - Requires training data

**Output Fields:**
- `{metric}_baseline_mean`
- `{metric}_baseline_std`
- `{metric}_z_score`
- `{metric}_is_anomaly` (boolean)
- `{metric}_anomaly_score` (0-1)
- `{metric}_percentile`

**Implementation:**
```typescript
interface BaselineConfig {
  method: 'zscore' | 'iqr' | 'isolation_forest'
  threshold: number
  window: string // '30d', '7d', etc.
  min_samples: number
}

// Calculate baseline from historical data
const baseline = calculateBaseline(historicalData, config)

// Score current data
const scored = data.map(row => ({
  ...row,
  z_score: (row.value - baseline.mean) / baseline.std,
  is_anomaly: Math.abs(z_score) > config.threshold
}))
```

**Performance Target:**
- 10K rows in < 100ms (z-score)
- 10K rows in < 500ms (isolation forest)

**Success Criteria:**
- ✅ Supports 3+ detection methods
- ✅ Auto-learns baselines from historical data
- ✅ < 5% false positive rate
- ✅ Detects 90%+ of known anomalies

---

#### 5. `ai_enrich` - AI-Powered Analysis (Expand Existing)

**Priority:** P1 - HIGH ⭐⭐⭐⭐

**Description:** Expand existing AI pipeline with new capabilities.

**New Commands to Add:**

```sql
-- Security-specific classification
| ai_security_classify message
  categories="phishing,malware,ransomware,apt,insider_threat,legitimate"
  
-- Threat severity estimation
| ai_threat_severity event_description
  output=severity,confidence,reasoning
  
-- Attack technique identification (MITRE ATT&CK)
| ai_mitre_attack event_details
  output=tactic,technique,sub_technique
  
-- Explain anomalies
| ai_explain_anomaly 
  context=baseline_data
  anomaly=current_event
```

**Implementation Priority:**

1. **ai_security_classify** - Phishing/malware detection
2. **ai_threat_severity** - Automated triage
3. **ai_mitre_attack** - ATT&CK mapping
4. **ai_explain_anomaly** - Analyst assistance

**Performance Target:**
- Batch size: 10-20 items
- Latency: < 3 seconds per batch
- Cost: < $0.01 per 1000 items (Claude Haiku)

---

#### 6. `reputation_score` - Composite Risk Scoring

**Priority:** P1 - HIGH ⭐⭐⭐⭐

**Description:** Calculate composite reputation score from multiple signals.

**Syntax:**
```sql
SELECT * FROM events
| reputation_score
  factors=[
    {field: 'failed_logins', weight: 2, threshold: 5},
    {field: 'threat_level', weight: 5},
    {field: 'new_device', weight: 3, value: true},
    {field: 'suspicious_country', weight: 4, value: true}
  ]
  method=weighted_sum,ml
  output=score,level,confidence
```

**Scoring Methods:**

1. **Weighted Sum:**
   ```
   score = Σ (factor_value × weight)
   level = score > 80 ? 'critical' :
           score > 50 ? 'high' :
           score > 20 ? 'medium' : 'low'
   ```

2. **ML-Based:**
   - Train on labeled data
   - Auto-learn optimal weights
   - Outputs confidence score

**Output:**
```json
{
  "reputation_score": 75,
  "risk_level": "high",
  "confidence": 0.85,
  "contributing_factors": [
    {"factor": "threat_level", "value": 8, "weight": 5, "contribution": 40},
    {"factor": "failed_logins", "value": 12, "weight": 2, "contribution": 24}
  ]
}
```

**Success Criteria:**
- ✅ Supports 10+ factors
- ✅ Auto-learns weights from feedback
- ✅ Explains score breakdown
- ✅ < 10ms per score calculation

---

### 🥉 Tier 3 - Specialized Commands (Week 5-6)

#### 7. `sequence_detect` - Attack Sequence Detection

**Priority:** P2 - MEDIUM ⭐⭐⭐

**Description:** Detect multi-stage attacks by pattern matching event sequences.

**Syntax:**
```sql
SELECT * FROM security_events
| sequence_detect
  pattern="recon → exploit → pivot → exfiltrate"
  window=1h
  by=src_ip,session_id
  require_order=true
```

**Pattern Language:**
```
recon: event_type IN ('port_scan', 'vuln_scan')
exploit: event_type = 'exploit_attempt'
pivot: event_type = 'lateral_movement'
exfiltrate: bytes_sent > 100000000
```

**Implementation:**
- State machine for sequence tracking
- Time window enforcement
- Partial match detection

---

#### 8. `correlate` - Cross-Source Event Correlation

**Priority:** P2 - MEDIUM ⭐⭐⭐

**Description:** Correlate events from different log sources.

**Syntax:**
```sql
SELECT * FROM firewall_logs
| correlate with=auth_logs
  on=user_id,src_ip
  time_window=5m
  condition="firewall.blocked=true AND auth.status='failed'"
```

---

#### 9. Additional Commands (Lower Priority)

- `dns_lookup` - DNS resolution and DGA detection
- `asn_lookup` - ASN and organization info
- `regex_multi` - Multi-pattern regex matching
- `time_bucket_adaptive` - Auto-adjusting time buckets

---

## Technical Specifications

### Data Flow Architecture

```
┌──────────────┐
│  Snowflake   │ → Filter/Aggregate (1M → 10K rows)
│   Database   │    Time: 300-500ms
└──────┬───────┘
       │ Network Transfer (10K rows ≈ 1MB)
       │ Time: 50-100ms
       ▼
┌──────────────┐
│  Pipeline    │ → Enrichment/AI/Pattern Detection
│  Processor   │    Time: 1-2s
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Output     │ → Analyst Dashboard / Alert System
│   Consumer   │
└──────────────┘

Total Time: < 3 seconds (P95)
```

### Command Execution Model

```typescript
interface PipelineCommand {
  name: string
  execute: (data: DataRow[], args: CommandArgs) => Promise<DataRow[]>
  validateArgs: (args: CommandArgs) => boolean
  estimateCost: (rowCount: number) => { time: number; credits: number }
}

// Example
const threatLookupCommand: PipelineCommand = {
  name: 'threat_lookup',
  execute: async (data, args) => {
    // 1. Validate row count
    if (data.length > 100000) {
      throw new Error('Too many rows for threat lookup. Use WHERE in SQL.')
    }
    
    // 2. Check cache
    const uncached = data.filter(row => !cache.has(row[args.field]))
    
    // 3. Batch API calls
    const results = await batchThreatLookup(uncached, { 
      batchSize: args.batch_size 
    })
    
    // 4. Merge with cached data
    return mergeResults(data, results, cache)
  },
  validateArgs: (args) => {
    return args.sources?.length > 0 && args.batch_size > 0
  },
  estimateCost: (rowCount) => ({
    time: Math.ceil(rowCount / 100) * 200, // 200ms per 100 IPs
    credits: rowCount * 0.001 // API cost
  })
}
```

### Error Handling Strategy

```typescript
// Graceful degradation
try {
  const threatData = await virusTotalLookup(ips)
} catch (error) {
  console.warn('VirusTotal API failed, continuing with other sources')
  threatData = { source: 'virustotal', status: 'unavailable' }
}

// Partial results are better than no results
const results = await Promise.allSettled([
  virusTotalLookup(ips),
  abuseIPDBLookup(ips),
  otxLookup(ips)
])

const successfulResults = results
  .filter(r => r.status === 'fulfilled')
  .map(r => r.value)
```

### Caching Strategy

```typescript
interface CacheConfig {
  ttl: number              // Time to live (seconds)
  maxSize: number          // Max entries
  strategy: 'lru' | 'lfu'  // Eviction strategy
}

// Three-tier caching
const cache = {
  // L1: Memory (instant)
  memory: new LRUCache({ max: 10000, ttl: 3600 }),
  
  // L2: LocalStorage (fast)
  local: new LocalStorageCache({ max: 100000, ttl: 86400 }),
  
  // L3: IndexedDB (large)
  indexed: new IndexedDBCache({ max: 1000000, ttl: 604800 })
}

async function getCached(key: string) {
  // Try L1 first
  let value = cache.memory.get(key)
  if (value) return value
  
  // Try L2
  value = await cache.local.get(key)
  if (value) {
    cache.memory.set(key, value) // Promote to L1
    return value
  }
  
  // Try L3
  value = await cache.indexed.get(key)
  if (value) {
    cache.memory.set(key, value)
    cache.local.set(key, value)
    return value
  }
  
  return null
}
```

---

## Implementation Roadmap

### Phase 1: MVP (Weeks 1-2)

**Goal:** Core enrichment capabilities

**Deliverables:**
- [ ] `threat_lookup` with VirusTotal + AbuseIPDB
- [ ] `geoip` with MaxMind GeoLite2
- [ ] `ioc_extract` with 10+ IOC types
- [ ] Memory caching system
- [ ] Basic error handling

**Success Metrics:**
- ✅ Process 10K rows in < 2 seconds
- ✅ 90%+ cache hit rate
- ✅ Zero crashes on valid input

### Phase 2: Advanced Analysis (Weeks 3-4)

**Goal:** AI and anomaly detection

**Deliverables:**
- [ ] `baseline_anomaly` (z-score, IQR)
- [ ] `ai_security_classify`
- [ ] `ai_threat_severity`
- [ ] `reputation_score`
- [ ] Performance monitoring dashboard

**Success Metrics:**
- ✅ < 5% false positive rate for anomaly detection
- ✅ 85%+ accuracy for AI classification
- ✅ Total pipeline time < 3 seconds (P95)

### Phase 3: Specialized Features (Weeks 5-6)

**Goal:** Advanced pattern detection

**Deliverables:**
- [ ] `sequence_detect` (attack chains)
- [ ] `correlate` (cross-source)
- [ ] `dns_lookup` with DGA detection
- [ ] Auto-tuning system

**Success Metrics:**
- ✅ Detect 95%+ of multi-stage attacks
- ✅ Auto-tune reduces latency by 20%

### Phase 4: Production Hardening (Weeks 7-8)

**Goal:** Enterprise-ready

**Deliverables:**
- [ ] Comprehensive error handling
- [ ] Rate limiting and quota management
- [ ] Audit logging
- [ ] Admin dashboard
- [ ] Documentation and training

**Success Metrics:**
- ✅ 99.9% uptime
- ✅ All errors logged and recoverable
- ✅ < 1% API quota overruns

---

## Acceptance Criteria

### Functional Requirements

- [ ] **F1:** All Tier 1 commands implemented and tested
- [ ] **F2:** Pipeline processes 10K rows in < 3 seconds (P95)
- [ ] **F3:** Supports batch processing (100+ items per API call)
- [ ] **F4:** Cache hit rate > 90% for repeated queries
- [ ] **F5:** Graceful degradation when APIs fail
- [ ] **F6:** All commands have comprehensive error messages

### Non-Functional Requirements

- [ ] **NF1:** Memory usage < 500MB for 100K rows
- [ ] **NF2:** Zero memory leaks (tested with 1M row iterations)
- [ ] **NF3:** TypeScript with full type safety
- [ ] **NF4:** 95%+ test coverage for core functions
- [ ] **NF5:** API keys stored securely (env vars, not code)
- [ ] **NF6:** Rate limiting prevents API quota exhaustion

### Performance Benchmarks

```
Test Case: 10K rows from Snowflake query
├─ Snowflake execution: 300ms
├─ Network transfer: 50ms
├─ threat_lookup (100 unique IPs): 200ms
├─ geoip (100 unique IPs): 10ms
├─ ioc_extract (10K rows): 100ms
├─ ai_classify (100 items): 2s
├─ reputation_score (10K rows): 50ms
└─ Total: 2.71 seconds ✅

PASS: < 3 seconds target
```

### User Acceptance Testing

**Scenario 1: Threat Hunting**
```
Given: 1M security logs in Snowflake
When: Analyst runs threat hunting query
Then: 
  - Query returns results in < 3 seconds
  - Threat intel enrichment is accurate
  - At least 1 true positive found
  - Zero false positives in top 10 results
```

**Scenario 2: Incident Response**
```
Given: Alert triggered on suspicious IP
When: Analyst investigates with pipeline
Then:
  - Complete threat context in < 2 seconds
  - GeoIP, ASN, reputation all populated
  - AI provides threat classification
  - Analyst can take action immediately
```

**Scenario 3: Bulk Analysis**
```
Given: 50K events to analyze
When: Pipeline processes all events
Then:
  - Completes in < 30 seconds
  - No memory errors
  - All enrichments successful
  - Results exportable to CSV/JSON
```

---

## API Integrations

### Required API Keys

| Service | Priority | Cost | Rate Limit | Purpose |
|---------|----------|------|------------|---------|
| **VirusTotal** | P0 | Free tier available | 500 req/day (free) | IP/domain/hash reputation |
| **AbuseIPDB** | P0 | Free tier available | 1000 req/day (free) | IP abuse reports |
| **MaxMind** | P0 | Free (GeoLite2) | N/A (offline DB) | GeoIP lookups |
| **AWS Bedrock** | P0 | Pay per use | Model-dependent | AI analysis |
| **AlienVault OTX** | P1 | Free | 10 req/min | Open threat intel |
| **Shodan** | P2 | $49/month | 1 req/sec | Internet exposure |

### API Configuration

```typescript
interface APIConfig {
  virustotal: {
    apiKey: string
    endpoint: 'https://www.virustotal.com/api/v3'
    rateLimit: 4 // requests per minute (free tier)
  }
  abuseipdb: {
    apiKey: string
    endpoint: 'https://api.abuseipdb.com/api/v2'
    rateLimit: 1000 // requests per day
  }
  aws: {
    region: string
    accessKeyId: string
    secretAccessKey: string
    model: 'anthropic.claude-3-5-haiku-20241022-v1:0'
  }
}

// Environment variables
const config = {
  virustotal: {
    apiKey: process.env.VIRUSTOTAL_API_KEY,
    endpoint: process.env.VIRUSTOTAL_ENDPOINT || 'https://www.virustotal.com/api/v3'
  }
  // ... etc
}
```

---

## Monitoring & Observability

### Key Metrics to Track

```typescript
interface PipelineMetrics {
  // Performance
  latency_p50: number
  latency_p95: number
  latency_p99: number
  
  // Throughput
  rows_processed_per_second: number
  commands_executed_per_minute: number
  
  // Quality
  cache_hit_rate: number
  api_error_rate: number
  false_positive_rate: number
  
  // Cost
  api_calls_per_day: number
  ai_tokens_used: number
  estimated_monthly_cost: number
}

// Example dashboard
{
  "last_hour": {
    "latency_p95": 2.8,
    "cache_hit_rate": 0.94,
    "rows_processed": 125000,
    "api_errors": 3,
    "cost": 2.45
  }
}
```

### Alerts

- **Critical:** Pipeline latency > 5 seconds (P95)
- **Warning:** Cache hit rate < 80%
- **Warning:** API error rate > 5%
- **Info:** Daily cost > $50

---

## Security Considerations

### Data Privacy

- [ ] No sensitive data logged (PII, credentials)
- [ ] API keys stored in env vars, never in code
- [ ] Results sanitized before caching
- [ ] Cache encrypted at rest
- [ ] Audit log for all API calls

### API Key Management

```typescript
// ✅ GOOD: Use environment variables
const apiKey = process.env.VIRUSTOTAL_API_KEY

// ❌ BAD: Hardcoded in code
const apiKey = 'abc123xyz' // NEVER DO THIS

// ✅ GOOD: Validate before use
if (!apiKey) {
  throw new Error('VIRUSTOTAL_API_KEY not set')
}
```

### Rate Limiting

```typescript
class RateLimiter {
  private tokens: number
  private maxTokens: number
  private refillRate: number // tokens per second
  
  async acquire(): Promise<void> {
    while (this.tokens < 1) {
      await sleep(100)
      this.refill()
    }
    this.tokens -= 1
  }
  
  private refill() {
    const now = Date.now()
    const elapsed = (now - this.lastRefill) / 1000
    this.tokens = Math.min(
      this.maxTokens,
      this.tokens + elapsed * this.refillRate
    )
    this.lastRefill = now
  }
}

// Usage
const virusTotalLimiter = new RateLimiter({
  maxTokens: 4,
  refillRate: 4 / 60 // 4 requests per minute
})

await virusTotalLimiter.acquire()
const result = await virusTotalAPI.lookup(ip)
```

---

## Testing Strategy

### Unit Tests

```typescript
describe('threat_lookup', () => {
  it('should enrich IPs with threat data', async () => {
    const input = [{ src_ip: '1.2.3.4' }]
    const result = await threatLookup(input, { sources: ['virustotal'] })
    
    expect(result[0].src_ip_threat_level).toBeGreaterThanOrEqual(0)
    expect(result[0].src_ip_threat_level).toBeLessThanOrEqual(10)
  })
  
  it('should use cache for repeated lookups', async () => {
    const input = [{ src_ip: '1.2.3.4' }]
    
    const start1 = Date.now()
    await threatLookup(input, { sources: ['virustotal'] })
    const time1 = Date.now() - start1
    
    const start2 = Date.now()
    await threatLookup(input, { sources: ['virustotal'] })
    const time2 = Date.now() - start2
    
    expect(time2).toBeLessThan(time1 / 10) // Cache should be 10x faster
  })
})
```

### Integration Tests

```typescript
describe('End-to-End Pipeline', () => {
  it('should process full security analysis workflow', async () => {
    const data = await snowflake.query(`
      SELECT * FROM firewall_logs 
      WHERE timestamp > CURRENT_DATE - 1
      LIMIT 1000
    `)
    
    const result = await pipeline(data)
      .threatLookup('src_ip')
      .geoip('src_ip')
      .iocExtract('message')
      .baselineAnomaly('request_count', { by: 'src_ip' })
      .reputationScore({ factors: [...] })
      .execute()
    
    expect(result.length).toBe(1000)
    expect(result[0].src_ip_threat_level).toBeDefined()
    expect(result[0].src_ip_country).toBeDefined()
  })
})
```

### Performance Tests

```typescript
describe('Performance Benchmarks', () => {
  it('should process 10K rows in < 3 seconds', async () => {
    const data = generateMockData(10000)
    
    const start = Date.now()
    const result = await pipeline(data)
      .threatLookup('src_ip')
      .geoip('src_ip')
      .execute()
    const elapsed = Date.now() - start
    
    expect(elapsed).toBeLessThan(3000)
  })
})
```

---

## Documentation Requirements

### For Developers (Claude Code)

- [ ] Architecture diagram (Mermaid)
- [ ] API reference for all commands
- [ ] Code examples for each command
- [ ] Performance tuning guide
- [ ] Troubleshooting guide

### For End Users (Analysts)

- [ ] Quick start guide (5 minutes)
- [ ] Command reference (with examples)
- [ ] Best practices checklist
- [ ] Common use cases (10+ scenarios)
- [ ] FAQ

### Example Documentation

````markdown
## threat_lookup Command

**Description:** Enrich data with threat intelligence from multiple sources.

**Syntax:**
```sql
| threat_lookup <field> 
  sources=<source1,source2,...>
  [cache_ttl=<seconds>]
  [batch_size=<number>]
```

**Parameters:**
- `field` (required): Column containing IPs, domains, or hashes
- `sources` (required): Comma-separated list of threat intel sources
- `cache_ttl` (optional): Cache duration in seconds (default: 3600)
- `batch_size` (optional): API batch size (default: 100)

**Example:**
```sql
SELECT * FROM firewall_logs
WHERE timestamp > CURRENT_DATE - 1
| threat_lookup src_ip sources=virustotal,abuseipdb
```

**Output:**
- `{field}_threat_level`: 0-10 threat score
- `{field}_categories`: Array of threat types
- `{field}_confidence`: 0-1 confidence score

**Performance:**
- First call: ~200ms per 100 IPs
- Cached call: < 1ms
````

---

## Conclusion

This PRD defines a **high-impact, implementable** pipeline system that:

1. **Solves Real Problems:** Automates hours of manual work
2. **Delivers Performance:** < 3 second end-to-end latency
3. **Provides Value:** 10-100x faster threat analysis
4. **Is Implementable:** Clear specs and priorities

**Next Steps:**
1. Review and approve this PRD
2. Set up development environment
3. Implement Tier 1 commands (2 weeks)
4. Collect user feedback
5. Iterate based on real-world usage

**Questions for Stakeholders:**
- Which threat intel sources should we prioritize?
- What is the acceptable cost per query?
- Are there specific attack patterns to detect first?
- Should we support custom ML models?

---

**Approval Signatures:**

- [ ] Product Manager: _________________ Date: _______
- [ ] Tech Lead: _________________ Date: _______
- [ ] Security Architect: _________________ Date: _______

---

**Appendix A: Glossary**

- **IOC:** Indicator of Compromise (IP, domain, hash, etc.)
- **Predicate Pushdown:** Filtering data in the database before transfer
- **P95 Latency:** 95th percentile response time
- **Cache Hit Rate:** % of requests served from cache
- **False Positive:** Alert on non-threat

**Appendix B: References**

- Snowflake Performance Optimization: https://docs.snowflake.com/en/guides-overview-performance
- VirusTotal API: https://developers.virustotal.com/reference/overview
- MaxMind GeoIP: https://dev.maxmind.com/geoip/geolite2-free-geolocation-data
- AWS Bedrock: https://aws.amazon.com/bedrock/
- MITRE ATT&CK: https://attack.mitre.org/

---

**Document History:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-12-01 | Security Team | Initial PRD |

---

END OF PRD

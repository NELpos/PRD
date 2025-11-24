# Claude Theme for shadcn/ui

Claude의 Light Mode와 Dark Mode 색상 체계를 shadcn/ui에 적용할 수 있는 CSS Variables 설정 가이드입니다.

---

## 테마 특징

| 모드 | 배경 | 액센트 | 특징 |
|------|------|--------|------|
| **Light Mode** | 따뜻한 크림/베이지 | 테라코타/오렌지 | 부드럽고 따뜻한 느낌 |
| **Dark Mode** | 깊은 회갈색 | 부드러운 오렌지 | 눈의 피로를 줄이는 따뜻한 다크 |

---

## 1. 기본 CSS Variables (Tailwind v3 / @layer base)

`globals.css` 또는 메인 CSS 파일에 추가하세요.

```css
@layer base {
  :root {
    /* ================================
       Claude Light Mode
       ================================ */
    --radius: 0.625rem;
    
    /* Background - 따뜻한 크림/베이지 */
    --background: oklch(0.98 0.01 85);
    --foreground: oklch(0.20 0.02 60);
    
    /* Card */
    --card: oklch(0.99 0.008 85);
    --card-foreground: oklch(0.20 0.02 60);
    
    /* Popover */
    --popover: oklch(0.99 0.008 85);
    --popover-foreground: oklch(0.20 0.02 60);
    
    /* Primary - Claude 테라코타/오렌지 */
    --primary: oklch(0.65 0.16 45);
    --primary-foreground: oklch(0.99 0.005 85);
    
    /* Secondary */
    --secondary: oklch(0.94 0.015 80);
    --secondary-foreground: oklch(0.25 0.02 60);
    
    /* Muted */
    --muted: oklch(0.94 0.015 80);
    --muted-foreground: oklch(0.50 0.02 60);
    
    /* Accent */
    --accent: oklch(0.94 0.015 80);
    --accent-foreground: oklch(0.25 0.02 60);
    
    /* Destructive */
    --destructive: oklch(0.577 0.245 27.325);
    
    /* Border & Input */
    --border: oklch(0.90 0.015 80);
    --input: oklch(0.90 0.015 80);
    --ring: oklch(0.65 0.16 45);
    
    /* Chart Colors */
    --chart-1: oklch(0.65 0.16 45);   /* 테라코타 */
    --chart-2: oklch(0.60 0.12 180);  /* 틸 */
    --chart-3: oklch(0.55 0.10 280);  /* 퍼플 */
    --chart-4: oklch(0.75 0.15 90);   /* 옐로우 */
    --chart-5: oklch(0.60 0.15 150);  /* 그린 */
    
    /* Sidebar */
    --sidebar: oklch(0.96 0.012 85);
    --sidebar-foreground: oklch(0.20 0.02 60);
    --sidebar-primary: oklch(0.65 0.16 45);
    --sidebar-primary-foreground: oklch(0.99 0.005 85);
    --sidebar-accent: oklch(0.92 0.02 80);
    --sidebar-accent-foreground: oklch(0.25 0.02 60);
    --sidebar-border: oklch(0.90 0.015 80);
    --sidebar-ring: oklch(0.65 0.16 45);
  }

  .dark {
    /* ================================
       Claude Dark Mode
       ================================ */
    
    /* Background - 깊은 회갈색 */
    --background: oklch(0.18 0.015 60);
    --foreground: oklch(0.92 0.01 85);
    
    /* Card */
    --card: oklch(0.22 0.015 60);
    --card-foreground: oklch(0.92 0.01 85);
    
    /* Popover */
    --popover: oklch(0.22 0.015 60);
    --popover-foreground: oklch(0.92 0.01 85);
    
    /* Primary - 부드러운 오렌지 */
    --primary: oklch(0.72 0.14 50);
    --primary-foreground: oklch(0.18 0.015 60);
    
    /* Secondary */
    --secondary: oklch(0.28 0.015 60);
    --secondary-foreground: oklch(0.92 0.01 85);
    
    /* Muted */
    --muted: oklch(0.28 0.015 60);
    --muted-foreground: oklch(0.65 0.01 70);
    
    /* Accent */
    --accent: oklch(0.28 0.015 60);
    --accent-foreground: oklch(0.92 0.01 85);
    
    /* Destructive */
    --destructive: oklch(0.704 0.191 22.216);
    
    /* Border & Input */
    --border: oklch(1 0 0 / 12%);
    --input: oklch(1 0 0 / 15%);
    --ring: oklch(0.72 0.14 50);
    
    /* Chart Colors (Dark) */
    --chart-1: oklch(0.72 0.14 50);
    --chart-2: oklch(0.65 0.15 180);
    --chart-3: oklch(0.65 0.15 280);
    --chart-4: oklch(0.78 0.14 90);
    --chart-5: oklch(0.65 0.14 150);
    
    /* Sidebar */
    --sidebar: oklch(0.16 0.012 60);
    --sidebar-foreground: oklch(0.92 0.01 85);
    --sidebar-primary: oklch(0.72 0.14 50);
    --sidebar-primary-foreground: oklch(0.18 0.015 60);
    --sidebar-accent: oklch(0.26 0.015 60);
    --sidebar-accent-foreground: oklch(0.92 0.01 85);
    --sidebar-border: oklch(1 0 0 / 10%);
    --sidebar-ring: oklch(0.72 0.14 50);
  }
}
```

---

## 2. Tailwind v4 설정 (@theme inline 방식)

Tailwind CSS v4를 사용하는 경우 아래 형식을 사용하세요.

```css
:root {
  /* Claude Light Mode */
  --radius: 0.625rem;
  --background: oklch(0.98 0.01 85);
  --foreground: oklch(0.20 0.02 60);
  --card: oklch(0.99 0.008 85);
  --card-foreground: oklch(0.20 0.02 60);
  --popover: oklch(0.99 0.008 85);
  --popover-foreground: oklch(0.20 0.02 60);
  --primary: oklch(0.65 0.16 45);
  --primary-foreground: oklch(0.99 0.005 85);
  --secondary: oklch(0.94 0.015 80);
  --secondary-foreground: oklch(0.25 0.02 60);
  --muted: oklch(0.94 0.015 80);
  --muted-foreground: oklch(0.50 0.02 60);
  --accent: oklch(0.94 0.015 80);
  --accent-foreground: oklch(0.25 0.02 60);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.90 0.015 80);
  --input: oklch(0.90 0.015 80);
  --ring: oklch(0.65 0.16 45);
  --chart-1: oklch(0.65 0.16 45);
  --chart-2: oklch(0.60 0.12 180);
  --chart-3: oklch(0.55 0.10 280);
  --chart-4: oklch(0.75 0.15 90);
  --chart-5: oklch(0.60 0.15 150);
  --sidebar: oklch(0.96 0.012 85);
  --sidebar-foreground: oklch(0.20 0.02 60);
  --sidebar-primary: oklch(0.65 0.16 45);
  --sidebar-primary-foreground: oklch(0.99 0.005 85);
  --sidebar-accent: oklch(0.92 0.02 80);
  --sidebar-accent-foreground: oklch(0.25 0.02 60);
  --sidebar-border: oklch(0.90 0.015 80);
  --sidebar-ring: oklch(0.65 0.16 45);
}

.dark {
  --background: oklch(0.18 0.015 60);
  --foreground: oklch(0.92 0.01 85);
  --card: oklch(0.22 0.015 60);
  --card-foreground: oklch(0.92 0.01 85);
  --popover: oklch(0.22 0.015 60);
  --popover-foreground: oklch(0.92 0.01 85);
  --primary: oklch(0.72 0.14 50);
  --primary-foreground: oklch(0.18 0.015 60);
  --secondary: oklch(0.28 0.015 60);
  --secondary-foreground: oklch(0.92 0.01 85);
  --muted: oklch(0.28 0.015 60);
  --muted-foreground: oklch(0.65 0.01 70);
  --accent: oklch(0.28 0.015 60);
  --accent-foreground: oklch(0.92 0.01 85);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 12%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.72 0.14 50);
  --chart-1: oklch(0.72 0.14 50);
  --chart-2: oklch(0.65 0.15 180);
  --chart-3: oklch(0.65 0.15 280);
  --chart-4: oklch(0.78 0.14 90);
  --chart-5: oklch(0.65 0.14 150);
  --sidebar: oklch(0.16 0.012 60);
  --sidebar-foreground: oklch(0.92 0.01 85);
  --sidebar-primary: oklch(0.72 0.14 50);
  --sidebar-primary-foreground: oklch(0.18 0.015 60);
  --sidebar-accent: oklch(0.26 0.015 60);
  --sidebar-accent-foreground: oklch(0.92 0.01 85);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.72 0.14 50);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
  --radius: var(--radius);
}
```

---

## 3. HEX 값 참고표 (디자인 툴용)

Figma, Sketch 등 디자인 툴에서 사용할 수 있는 HEX 값입니다.

### Light Mode

| 역할 | HEX | 설명 |
|------|-----|------|
| Background | `#FAF8F5` | 메인 배경 |
| Foreground | `#2D2A26` | 메인 텍스트 |
| Card | `#FDFCFA` | 카드 배경 |
| Primary | `#DA7756` | 주요 액센트 (버튼 등) |
| Primary Foreground | `#FDFCFA` | Primary 위 텍스트 |
| Secondary | `#EDE9E3` | 보조 배경 |
| Secondary Foreground | `#3A3632` | Secondary 위 텍스트 |
| Muted | `#EDE9E3` | 비활성 배경 |
| Muted Foreground | `#787166` | 비활성 텍스트 |
| Border | `#DDD8D0` | 테두리 |
| Ring | `#DA7756` | 포커스 링 |

### Dark Mode

| 역할 | HEX | 설명 |
|------|-----|------|
| Background | `#2B2926` | 메인 배경 |
| Foreground | `#EBE8E4` | 메인 텍스트 |
| Card | `#333028` | 카드 배경 |
| Primary | `#E89B7B` | 주요 액센트 (버튼 등) |
| Primary Foreground | `#2B2926` | Primary 위 텍스트 |
| Secondary | `#3D3935` | 보조 배경 |
| Secondary Foreground | `#EBE8E4` | Secondary 위 텍스트 |
| Muted | `#3D3935` | 비활성 배경 |
| Muted Foreground | `#9E9890` | 비활성 텍스트 |
| Border | `rgba(255,255,255,0.12)` | 테두리 |
| Ring | `#E89B7B` | 포커스 링 |

---

## 4. 색상 팔레트 시각화

```
Light Mode:
┌─────────────────────────────────────────┐
│  Background    #FAF8F5  ████████████    │
│  Card          #FDFCFA  ████████████    │
│  Secondary     #EDE9E3  ████████████    │
│  Border        #DDD8D0  ████████████    │
│  Muted FG      #787166  ████████████    │
│  Foreground    #2D2A26  ████████████    │
│  Primary       #DA7756  ████████████    │
└─────────────────────────────────────────┘

Dark Mode:
┌─────────────────────────────────────────┐
│  Background    #2B2926  ████████████    │
│  Card          #333028  ████████████    │
│  Secondary     #3D3935  ████████████    │
│  Muted FG      #9E9890  ████████████    │
│  Foreground    #EBE8E4  ████████████    │
│  Primary       #E89B7B  ████████████    │
└─────────────────────────────────────────┘
```

---

## 5. 사용 예시

### React 컴포넌트에서 사용

```tsx
// Tailwind 클래스로 테마 색상 적용
<div className="bg-background text-foreground">
  <h1 className="text-primary">Claude Theme</h1>
  <p className="text-muted-foreground">따뜻한 색감의 UI</p>
  <button className="bg-primary text-primary-foreground rounded-md px-4 py-2">
    버튼
  </button>
</div>
```

### 다크 모드 토글

```tsx
// next-themes 또는 직접 구현
<html className="dark">
  {/* .dark 클래스가 추가되면 자동으로 다크 모드 적용 */}
</html>
```

---

## 6. 추가 커스텀 색상 (선택사항)

Claude 테마에 어울리는 추가 색상을 정의할 수 있습니다.

```css
:root {
  /* Success - 따뜻한 그린 */
  --success: oklch(0.65 0.15 145);
  --success-foreground: oklch(0.99 0.005 85);
  
  /* Warning - 따뜻한 옐로우 */
  --warning: oklch(0.80 0.14 85);
  --warning-foreground: oklch(0.25 0.05 60);
  
  /* Info - 따뜻한 블루 */
  --info: oklch(0.60 0.12 240);
  --info-foreground: oklch(0.99 0.005 85);
}

.dark {
  --success: oklch(0.70 0.14 145);
  --success-foreground: oklch(0.18 0.015 60);
  
  --warning: oklch(0.75 0.12 85);
  --warning-foreground: oklch(0.20 0.03 60);
  
  --info: oklch(0.65 0.12 240);
  --info-foreground: oklch(0.18 0.015 60);
}

@theme inline {
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
  --color-info: var(--info);
  --color-info-foreground: var(--info-foreground);
}
```

---

## 참고사항

- **OKLCH 색상 형식**: 최신 CSS 색상 형식으로, 더 균일한 색상 인지를 제공합니다.
- **브라우저 지원**: OKLCH는 최신 브라우저에서 지원됩니다. 구형 브라우저 지원이 필요한 경우 HSL로 변환하세요.
- **다크 모드**: `prefers-color-scheme` 미디어 쿼리 또는 `.dark` 클래스로 전환할 수 있습니다.

---

*이 테마는 Claude의 공식 디자인 시스템을 참고하여 제작되었습니다.*

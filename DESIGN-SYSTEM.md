# Wevy Design System

## 🎨 Color Palette

### Main Colors
```scss
--ion-color-primary: #FFB088           // Orange clair (CTA buttons)
--ion-color-primary-contrast: #FFFFFF  // White text on CTA
--ion-color-secondary: #FFE4D6         // Secondary orange pastel
--ion-background-color: #FFF4ED        // Light orange pastel background
--ion-text-color: #2D2D2D              // Main text (dark gray)
```

### Semantic Colors
```scss
--ion-card-background: #FFFFFF         // Cards/containers (white)
--ion-color-muted: #F5F5F5            // Very light gray
--ion-border-color: #FFD4BA           // Pastel orange borders
--ion-border-subtle: #E5E5E5          // Subtle borders
```

### Grayscale
```scss
--gray-50: #F5F5F5    // Disabled backgrounds
--gray-100: #E5E5E5   // Subtle borders
--gray-400: #9CA3AF   // Secondary text
--gray-500: #6B7280   // Tertiary text
--gray-600: #4B5563   // Hover text
```

## 📐 Border Radius

```scss
--radius-xl: 12px      // Cards, inputs, small containers
--radius-2xl: 16px     // Main cards, sections
--radius-3xl: 24px     // Large cards (swipe, modals)
--radius-full: 9999px  // Round buttons, avatars, badges
```

### Usage by Element
- **CTA Buttons**: `rounded-xl` (12px)
- **Content Cards**: `rounded-2xl` (16px)
- **Bottom Sheet Modals**: `rounded-t-3xl` (24px top only)
- **Floating Buttons**: `rounded-full` (circle)
- **Badges/Tags**: `rounded-full` (pill shape)

## 📏 Spacing

```scss
--spacing-2: 8px   // gap-2  - Between small elements
--spacing-3: 12px  // gap-3  - Between medium elements
--spacing-4: 16px  // p-4    - Standard card padding
--spacing-6: 24px  // p-6/gap-6 - Modals & section spacing
--spacing-8: 32px  
```

### Common Usage
- Standard card padding: `p-4` (16px)
- Modal/section padding: `p-6` (24px)
- Small gaps: `gap-2` (8px)
- Medium gaps: `gap-3` (12px)
- Section gaps: `gap-6` (24px)

## 🔤 Typography

```scss
--text-3xl: 30px   // H1 - Main titles
--text-2xl: 24px   // H2 - Subtitles
--text-xl: 20px    // H3 - Section titles
--text-lg: 18px    // Accented text
--text-base: 16px  // Standard text
--text-sm: 14px    // Secondary text
--text-xs: 12px    // Small labels
```

### HTML Elements
```html
<h1>Main Title</h1>        <!-- 30px, bold -->
<h2>Subtitle</h2>          <!-- 24px, semibold -->
<h3>Section Title</h3>     <!-- 20px, semibold -->
<p class="text-lg">...</p> <!-- 18px -->
<p>Standard text</p>       <!-- 16px -->
<span class="text-sm">Secondary</span> <!-- 14px, gray-500 -->
<span class="text-xs">Label</span>     <!-- 12px, gray-400 -->
```

## 🎯 Shadows

```scss
--shadow-sm: ...   // Light cards
--shadow-base: ... // Standard elevation
--shadow-lg: ...   // Floating buttons
--shadow-xl: ...   // Important cards (swipe)
```

### Usage
```html
<div class="shadow-sm">Light card</div>
<div class="shadow-lg">Floating button</div>
<div class="shadow-xl">Swipe card</div>
```

## 🧩 Component Patterns

### Card
```html
<div class="card">
  <!-- 16px padding, rounded-2xl, shadow-base -->
</div>
```

### Swipe Card
```html
<div class="card-swipe">
  <!-- 24px padding, rounded-3xl, shadow-xl -->
</div>
```

### Badge
```html
<span class="badge badge-primary">Quotidien</span>
<span class="badge badge-outline">10 min</span>
```

### Bottom Sheet Modal
```html
<ion-modal class="modal-bottom-sheet">
  <!-- Rounded top corners (24px), shadow-xl -->
</ion-modal>
```

### Floating Action Button
```html
<button class="fab">
  <ion-icon name="add"></ion-icon>
</button>
```

## 📦 Utility Classes

### Spacing
```html
<div class="p-4">Padding 16px</div>
<div class="p-6">Padding 24px</div>
<div class="px-4">Horizontal padding 16px</div>
<div class="gap-3">Gap 12px</div>
<div class="mb-4">Margin bottom 16px</div>
```

### Layout
```html
<div class="flex items-center gap-3">
  <!-- Flexbox with centered items and 12px gap -->
</div>
<div class="flex flex-col justify-between">
  <!-- Vertical flex with space-between -->
</div>
```

### Colors
```html
<div class="bg-white">White background</div>
<div class="bg-muted">Gray background</div>
<span class="text-primary">Primary color text</span>
<span class="text-gray-500">Gray text</span>
```

## 🎨 Design Examples from Mockups

### Home Page Card
```html
<ion-card class="rounded-2xl shadow-xl">
  <div class="p-6">
    <h2>Pâtes Carbonara</h2>
    <div class="flex gap-2 mb-4">
      <span class="badge badge-primary">Quotidien</span>
      <span class="badge badge-outline">30 min</span>
    </div>
  </div>
</ion-card>
```

### Task Item
```html
<div class="flex items-center gap-3 p-4 bg-white rounded-xl">
  <div class="w-8 h-8 rounded-full bg-primary"></div>
  <div class="flex-1">
    <h3 class="text-base">Faire la vaisselle</h3>
    <span class="text-sm">Sophie</span>
  </div>
</div>
```

### Shopping List Item
```html
<div class="p-4 bg-white rounded-xl mb-3">
  <h3 class="text-lg">Lait</h3>
  <span class="text-sm text-gray-500">2L</span>
</div>
```

## 🚀 Quick Start

1. Use the design tokens in your SCSS:
```scss
.my-component {
  padding: var(--spacing-4);
  border-radius: var(--radius-2xl);
  background: var(--ion-card-background);
  box-shadow: var(--shadow-base);
}
```

2. Or use utility classes in your HTML:
```html
<div class="p-4 rounded-2xl bg-white shadow">
  Content
</div>
```

3. Follow the component patterns for consistency across pages.

## 📱 Ionic Component Defaults

All Ionic components have been styled with the design system:
- **ion-card**: `rounded-2xl`, `shadow-base`
- **ion-button**: `rounded-xl`, 48px height
- **ion-input**: `rounded-xl`, `spacing-4` padding
- **ion-tab-bar**: `rounded-t-2xl`, white background

You can override these with utility classes or custom styles.

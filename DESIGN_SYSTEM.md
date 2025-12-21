# CrowdStack Design System

## Overview

CrowdStack uses a dark-first, premium B2B design system inspired by Linear, Vercel, and Stripe dashboards. The system prioritizes clarity, consistency, and professional aesthetics suitable for infrastructure software.

## Brand Identity

### Theme
**"Control Room"** - A dark, focused environment for managing complex event operations.

### Core Principles
- **Dark-first**: All interfaces default to dark mode
- **Data-dense but readable**: Optimized for displaying large amounts of information
- **Mobile-first for attendee flows**: Door scanner and registration prioritize mobile UX
- **Consistent spacing rhythm**: Generous padding with clear visual hierarchy
- **Subtle interactions**: No flashy animations, focus on functional feedback

## Color Palette

### Primary Colors
```css
Background:     #0B0D10  /* Primary background */
Surface:        #141821  /* Cards, panels, elevated surfaces */
Border:         #2A2F3A  /* Borders, dividers */
```

### Accent Colors
```css
Primary:        #3B82F6  /* Buttons, links, primary actions */
Primary Hover:  #2563EB
Primary Active: #1D4ED8

Success:        #10B981  /* Success states, confirmations */
Warning:        #F59E0B  /* Warnings, pending states */
Error:          #EF4444  /* Errors, destructive actions */
```

### Foreground Colors
```css
Foreground:     #FFFFFF           /* Primary text */
Foreground Muted: rgba(255, 255, 255, 0.7)   /* Secondary text */
Foreground Subtle: rgba(255, 255, 255, 0.5)  /* Tertiary text, placeholders */
```

### Usage Guidelines
- **Background**: Use for main page backgrounds
- **Surface**: Use for cards, modals, dropdowns, sidebars
- **Border**: Use for all borders and dividers
- **Primary**: Use for CTAs, active states, links
- **Success/Warning/Error**: Use sparingly for status indicators

## Typography

### Font Family
**Inter** - Used throughout the entire application (headings, UI, body text)

### Font Sizes
```css
text-xs:    0.75rem   /* 12px - Labels, badges */
text-sm:    0.875rem  /* 14px - Body text, inputs */
text-base:  1rem      /* 16px - Default body */
text-lg:    1.125rem  /* 18px - Large body */
text-xl:    1.25rem   /* 20px - Small headings */
text-2xl:   1.5rem    /* 24px - Section headings */
text-3xl:   1.875rem  /* 30px - Page headings */
text-4xl:   2.25rem   /* 36px - Hero headings */
text-5xl:   3rem      /* 48px - Large hero */
text-6xl:   3.75rem   /* 60px - Extra large hero */
```

### Font Weights
- **Regular (400)**: Body text
- **Medium (500)**: Labels, buttons
- **Semibold (600)**: Subheadings
- **Bold (700)**: Headings, emphasis

### Line Height
- **Tight**: 1.2 (headings)
- **Normal**: 1.5 (body text)
- **Relaxed**: 1.75 (long-form content)

## Spacing

### Scale
Based on 4px base unit:
```css
0.5rem  /* 8px */
1rem    /* 16px */
1.5rem  /* 24px */
2rem    /* 32px */
3rem    /* 48px */
4rem    /* 64px */
6rem    /* 96px */
```

### Usage
- **Cards**: `p-6` (24px padding)
- **Sections**: `py-16` or `py-24` (64px or 96px vertical)
- **Gaps between elements**: `gap-6` (24px)
- **Container padding**: `px-4 sm:px-6 lg:px-8`

## Border Radius

```css
sm:  10px  /* Small elements */
md:  12px  /* Default (cards, inputs, buttons) */
lg:  14px  /* Large elements */
```

**Guideline**: Soft but not bubbly. Avoid overly rounded corners.

## Shadows

```css
subtle: 0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px -1px rgba(0, 0, 0, 0.3)
card:   0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.3)
```

**Guideline**: Use sparingly. Only for elevated surfaces (modals, dropdowns, hover states).

## Components

### Button
**Variants**: `primary`, `secondary`, `ghost`, `destructive`
**Sizes**: `sm`, `md`, `lg`

```tsx
<Button variant="primary" size="lg">Action</Button>
```

### Card
**Props**: `header`, `footer`, `hover`, `onClick`

```tsx
<Card header={<h3>Title</h3>} footer={<Button>Action</Button>}>
  Content
</Card>
```

### Input / Textarea / Select
**Props**: `label`, `error`, `helperText`

```tsx
<Input 
  label="Email" 
  type="email" 
  error="Invalid email"
  helperText="We'll never share your email"
/>
```

### Badge
**Variants**: `default`, `success`, `warning`, `error`, `primary`
**Sizes**: `sm`, `md`

```tsx
<Badge variant="success">Active</Badge>
```

### Table
**Components**: `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow hover>
      <TableCell>John Doe</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### Tabs
**Components**: `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`

```tsx
<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">Content</TabsContent>
</Tabs>
```

### Modal
**Props**: `isOpen`, `onClose`, `title`, `footer`, `size`

```tsx
<Modal 
  isOpen={isOpen} 
  onClose={() => setIsOpen(false)}
  title="Confirm Action"
  footer={<Button>Confirm</Button>}
>
  Content
</Modal>
```

### Dropdown
**Props**: `trigger`, `items`, `align`

```tsx
<Dropdown
  trigger={<Button>Menu</Button>}
  items={[
    { label: "Edit", onClick: () => {}, icon: <Edit /> },
    { label: "Delete", onClick: () => {}, destructive: true }
  ]}
/>
```

### EmptyState
**Props**: `icon`, `title`, `description`, `action`

```tsx
<EmptyState
  icon={<Calendar />}
  title="No events yet"
  description="Create your first event to get started"
  action={{ label: "Create Event", onClick: () => {} }}
/>
```

### Layout Components
- **Container**: Wraps content with max-width and padding
- **Section**: Provides consistent vertical spacing
- **Hero**: Landing page hero section

## Layout Patterns

### Dashboard Layout (apps/app)
- **Left sidebar**: Navigation (collapsible on mobile)
- **Top bar**: Environment badge, user menu
- **Main content**: Scrollable area with container padding

### Marketing Pages (apps/web)
- **Top navigation**: Logo, links, CTA
- **Hero section**: Large heading, description, CTAs
- **Content sections**: Alternating backgrounds
- **Footer**: Links, copyright

### Mobile-First Pages
- **Door scanner**: Full-screen, large tap targets
- **Registration**: Simplified forms, clear CTAs
- **QR pass**: High contrast, large QR code

## Accessibility

### Focus States
All interactive elements have visible focus rings:
```css
focus:ring-2 focus:ring-primary focus:ring-offset-2
```

### Keyboard Navigation
- Modals: ESC to close, Tab to navigate
- Dropdowns: Arrow keys to navigate
- Tables: Tab through cells

### Contrast
- All text meets WCAG AA standards
- Error states use high-contrast colors
- Interactive elements have clear hover states

## Icons

**Library**: Lucide React

**Usage**:
- Use consistent icon sizes: `h-4 w-4` (small), `h-5 w-5` (default), `h-6 w-6` (large)
- Match icon color to text color: `text-foreground`, `text-foreground-muted`
- Use semantic icons (e.g., `CheckCircle2` for success, `XCircle` for error)

## Responsive Breakpoints

```css
sm:  640px   /* Small tablets */
md:  768px   /* Tablets */
lg:  1024px  /* Desktops */
xl:  1280px  /* Large desktops */
```

**Mobile-first approach**: Design for mobile, enhance for larger screens.

## Component Location

All shared components are in `packages/ui/src/components/` and exported from `packages/ui/src/index.ts`.

## Usage Example

```tsx
import { Button, Card, Input, Container, Section } from "@crowdstack/ui";

export default function MyPage() {
  return (
    <Section spacing="lg">
      <Container>
        <Card>
          <h1 className="text-3xl font-bold text-foreground mb-4">Title</h1>
          <Input label="Name" />
          <Button variant="primary" className="mt-4">Submit</Button>
        </Card>
      </Container>
    </Section>
  );
}
```

## Best Practices

1. **Consistency**: Always use design system components instead of custom styles
2. **Spacing**: Use the spacing scale consistently
3. **Colors**: Use Tailwind color tokens (e.g., `bg-surface`, `text-foreground-muted`)
4. **Typography**: Use semantic HTML and consistent font sizes
5. **Accessibility**: Always include labels, focus states, and keyboard navigation
6. **Mobile**: Test all pages on mobile devices, especially attendee-facing flows

## Loading Components

CrowdStack uses branded loading animations featuring stacked bars that animate in a cascading pattern.

### Logo (with loading state)
The primary logo component supports a `loading` prop that adds orbital elements and pulsing animations.

```tsx
<Logo variant="icon" size="lg" loading={true} />
```

### LoadingSpinner
Full-featured loading spinner with optional text. Uses the animated logo.

```tsx
<LoadingSpinner text="Loading..." size="lg" />
<LoadingSpinner fullScreen={true} /> {/* Full-page overlay */}
```

### PageLoader
Full-page loading component with ambient glow and progress bar.

```tsx
<PageLoader message="Loading data..." showProgress={true} />
```

### InlineSpinner
Compact spinner for inline use (buttons, inputs, etc.). Drop-in replacement for Loader2.

```tsx
<InlineSpinner size="sm" /> {/* xs, sm, md, lg */}
```

### Button (with loading)
Buttons support a `loading` prop that shows the branded spinner.

```tsx
<Button loading={true}>Saving...</Button>
```

## Future Enhancements

- Toast notification system
- Skeleton loading states
- Data visualization components (charts, graphs)
- Advanced form validation patterns


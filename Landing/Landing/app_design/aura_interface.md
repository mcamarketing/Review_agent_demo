# Aura Interface Design System

## Core Philosophy
The "Aura" aesthetic is defined by:
1. **Deep Atmospherics**: Dark, void-like backgrounds (`#050505`) with subtle radial gradients.
2. **Luminous Accents**: Neon purples (`#7c3aed`) and blues (`#2563eb`) that glow against the dark void.
3. **Glassmorphism**: UI cards and panels use low-opacity white backgrounds with blur filters to feel like suspended glass.
4. **Motion**: Constant, fluid organic motion (floating orbs, smooth transitions) to denote a "living" engine.

## Color Palette
- **Void Black**: `#050505` (Background)
- **Starlight White**: `#FFFFFF` (Primary Text)
- **Ghost Grey**: `#AAAAAA` (Secondary Text)
- **Revival Purple**: `#7C3AED` (Primary Action)
- **Signal Blue**: `#2563EB` (Secondary Action)

## Typography
- **Headings**: Inter, Bold (700) - Tight tracking (-0.05em)
- **Body**: Inter, Regular (400) - Relaxed line height (1.6)

## Components
### Buttons
Buttons should have a "glint" effect and soft shadow glow matching their hue. Pill-shaped radius.

### Cards
Cards representing agents or data points should use the glassmorphism effect:
```css
background: rgba(255, 255, 255, 0.05);
backdrop-filter: blur(10px);
border: 1px solid rgba(255, 255, 255, 0.1);
```

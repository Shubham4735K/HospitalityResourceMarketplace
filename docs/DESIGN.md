# ResShare --- UI/UX Design System

> **Core direction:** Premium hospitality marketplace + serious B2B
> workflow + restrained, expressive motion.
>
> **Non-negotiable:** Remove the generic "AI-generated website" feel.
> ResShare should feel intentionally designed by a strong product/design
> team: confident, editorial, warm, tactile, useful, and commercially
> credible.

## 1. Product Identity

ResShare is a B2B hospitality resource marketplace where businesses
discover, evaluate, request, provide, and manage shared hospitality
resources.

### Brand personality

-   **Premium** --- refined hospitality quality without visual excess.
-   **Professional** --- credible for real business-to-business
    decisions.
-   **Human** --- warm imagery, natural copy, useful feedback, subtle
    personality.
-   **Efficient** --- users understand what to do immediately.
-   **Confident** --- strong hierarchy and decisive actions.
-   **Distinctive** --- memorable details instead of decorative
    gimmicks.

### Design sentence

> A refined hospitality marketplace that feels as considered as a
> premium hotel lobby and as efficient as a modern business tool.

------------------------------------------------------------------------

## 2. Inspiration Strategy

Do not imitate another company's visual identity. Borrow **principles**,
not branding.

### Airbnb --- discovery and hospitality

Use inspiration for: - image-led discovery - strong search affordance -
useful filters - natural spacing - visual confidence - marketplace card
hierarchy - photography as a product signal

Do not copy Airbnb colors, branding, typography, exact layouts, or
navigation.

### Uber / Base --- clarity and dependable interaction

Use inspiration for: - strong action hierarchy - predictable interaction
patterns - reusable components - clear status communication -
accessibility - disciplined responsive behavior - minimizing UI
variation

Adopt the **systems mindset**, not Uber's appearance.

### Linear --- information density without noise

Use inspiration for: - quiet navigation - focused content areas -
restrained borders - dense but readable business interfaces - subtle
state transitions - reducing visual competition

### Stripe --- B2B forms and confidence

Use inspiration for: - logical form grouping - clear validation - strong
focus states - progressive disclosure - trustworthy workflows - reducing
friction

### Luxury hospitality --- atmosphere

Use inspiration for: - photography - editorial composition -
material-inspired surfaces - warm accents - deliberate whitespace - calm
motion

------------------------------------------------------------------------

## 3. Anti-AI Design Rules

This section is mandatory.

### Never use as decoration

-   excessive purple/blue gradients
-   rainbow gradients
-   glowing blobs
-   floating glass cards everywhere
-   excessive glassmorphism
-   giant gradient headlines
-   random decorative circles
-   constantly animated backgrounds
-   excessive rounded pills
-   every element inside a rounded rectangle
-   emoji as primary navigation icons
-   generic sparkle icons
-   generic "Unlock / Supercharge / Revolutionize" copy
-   repetitive three-card feature sections
-   excessive shadows
-   neon accents
-   fake 3D effects
-   decorative parallax
-   animation on every hover
-   excessive blur
-   generic AI-dashboard visual language

### Prefer

-   real hospitality imagery
-   strong typography
-   editorial composition
-   intentional asymmetry
-   subtle borders
-   layered dark surfaces
-   restrained warm accents
-   meaningful iconography
-   clear hierarchy
-   tactile controls
-   quiet secondary UI
-   purposeful whitespace
-   occasional visual surprise
-   motion that explains state changes

> **Rule of restraint:** If removing an effect makes the interface
> clearer, remove the effect.

------------------------------------------------------------------------

## 4. Visual Foundation

### Backgrounds

``` text
Base:       #090D14
Surface:    #101722
Elevated:   #172131
Interactive:#1C2838
Modal:      #202C3D
```

The UI should feel layered rather than flat. Not every section should
become a card.

### Brand accent

``` text
Primary:    #D9A441
Highlight:  #F0C56A
```

Use amber selectively for: - primary CTAs - active states - important
focus states - selected filters - key marketplace signals

Do not flood the interface with amber.

### Semantic colors

``` text
Success: #39B982
Warning: #E7B85C
Danger:  #E26D6D
Info:    #70A9C8
```

Semantic colors communicate meaning, not decoration.

------------------------------------------------------------------------

## 5. Typography

Keep **Plus Jakarta Sans** if practical.

Use typography as a major source of premium character.

``` text
Display:       48â€“64px / 700â€“800
Page heading:  32â€“40px / 700
Section:       22â€“28px / 650â€“700
Card title:    17â€“20px / 650
Body:          14â€“16px / 400â€“500
Metadata:      12â€“13px / 500
```

Do not make every heading huge. Premium interfaces create hierarchy
through contrast, not constant scale.

------------------------------------------------------------------------

## 6. Spacing & Geometry

Use a 4px base scale:

``` text
4  8  12  16  20  24  32  40  48  64  80  96
```

Primary geometry:

``` text
Small controls: 8px
Cards / fields: 12px
Major surfaces: 18px
```

Pills are reserved for statuses, compact filters, tags, and role
indicators. Ordinary buttons should not all be pill-shaped.

------------------------------------------------------------------------

## 7. Borders & Shadows

Prefer borders over heavy shadows.

``` text
Default border: 1px solid rgba(255,255,255,0.08)
Strong border:  1px solid rgba(255,255,255,0.13)
Shadow:         0 12px 32px rgba(0,0,0,0.28)
```

Use depth sparingly.

------------------------------------------------------------------------

## 8. Header & Navigation

### Desktop

Create a calm, compact navigation bar:

``` text
ResShare
   |
Browse Resources
My Activity
Weather Simulator
                    Notifications
                    + List Resource
                    Profile
```

Rules: - no emoji in primary navigation - use one consistent line-icon
family - active navigation uses a restrained accent indicator -
navigation items should not all look like buttons - secondary actions
recede - profile/auth actions belong in one account control

### Profile menu

``` text
Full Name
Business Name
Role
----------------
Change Role
Sign Out
```

### Mobile

Use a compact top bar and slide-over navigation sheet rather than a
crowded two-row desktop header.

Opening: - opacity fade + side translation - background scrim

Closing: - reverse animation

------------------------------------------------------------------------

## 9. Hero & Discovery

The current hero is too marketing-heavy and too disconnected from
discovery.

Combine identity + search.

Example:

``` text
Share hospitality resources.
Find what your business needs.

[ Search resources, venues, kitchens... ]

[ Location ] [ Category ] [ Availability ] [ Search ]
```

The hero should feel like a marketplace, not an AI startup landing page.

Avoid generic copy such as: - "Transform your hospitality business..." -
"Experience the future..." - "Unlock next-generation..."

Use specific product language.

------------------------------------------------------------------------

## 10. Search & Filters

Search becomes a first-class interaction.

Primary filters:

``` text
Location
Category
Availability
Rate
Sort
```

Do not expose every possible filter at once.

Mobile filters should use a bottom sheet or expandable filter panel.

------------------------------------------------------------------------

## 11. Resource Cards

Cards are the primary marketplace object.

### Image

-   16:10 or 4:3
-   natural cropping
-   restrained radius
-   no unnecessary overlays

Hover: - image scale about 1.015--1.025 - card lift about 2--3px -
slightly stronger shadow

### Hierarchy

``` text
IMAGE

Category / availability
Resource title
Host business
Location

Rate
                    View Details
```

The entire card, image, and title should provide a meaningful click
affordance. Keep the explicit CTA as a clear action confirmation.

Avoid five badges, giant buttons, or decorative gradients.

------------------------------------------------------------------------

## 12. Resource Detail

Make resource details feel like a premium property/resource profile.

Desktop:

``` text
Large image/gallery      Resource information
                         Title
                         Host
                         Location
                         Description
                         Availability
                         Rate
                         Primary CTA
```

Primary CTA:

``` text
Request Resource
```

Keep location, rate, availability, host, and resource type immediately
scannable.

------------------------------------------------------------------------

## 13. Modal & Sheet System

Do not use centered popups for everything.

### Center modal

Use for: - confirmations - small decisions - authentication - simple
information

### Right-side sheet

Use for: - resource details - request form - complex request information

### Bottom sheet

Use for: - mobile filters - mobile actions - contextual controls

This creates a clear interaction hierarchy.

------------------------------------------------------------------------

## 14. Booking Request Flow

The request flow is a **B2B request**, not ecommerce checkout.

``` text
Resource Details
      â†“
Request Resource
      â†“
Request Sheet
      â†“
Review / Send
      â†“
Confirmation
```

Group fields:

``` text
Your details
Full Name
Business Name
Email
Phone

Request timing
Date
Start Time
End Time

Requirements
Message
```

Behavior: - inline validation - clear errors - strong focus states -
preserve entered values - disable submission while processing - explain
what happens after sending

Avoid:
`Resource modal â†’ Booking modal â†’ Auth modal â†’ Booking modal â†’ Confirmation`

Prefer an integrated auth checkpoint that keeps context.

------------------------------------------------------------------------

## 15. Confirmation

Keep confirmation calm and confident.

Use: - small success icon - short heading - concise explanation -
request summary - Done action

Motion: - icon scale from 0.92 â†’ 1 - opacity fade - subtle ring
expansion - approximately 300--450ms

No giant celebratory animation.

------------------------------------------------------------------------

## 16. My Activity

My Activity is an operational workspace.

``` text
My Activity

Requests I've Sent | Requests I've Received

[ All ] [ Pending ] [ Accepted ] [ Counter-Offered ] ...

Request cards
```

Only show role-appropriate views.

Request cards prioritize:

``` text
Resource
Business
Date
Time
Rate
Status
Next action
```

Secondary details collapse.

Counter-offers should appear as compact timeline items rather than walls
of text.

------------------------------------------------------------------------

## 17. Request Statuses

Use one consistent semantic treatment everywhere:

``` text
Pending          amber
Accepted         green
Rejected         red
Counter-Offered  warm gold / blue
Confirmed        green
Completed        muted green
Cancelled        muted red
```

Every status uses the same: - shape - padding - typography - semantic
color rules

------------------------------------------------------------------------

## 18. Notifications

Use: - small toast for immediate feedback - notification center for
persistent information

Toast:

``` text
opacity: 0 â†’ 1
translateY(-8px) â†’ 0
```

Entrance 180--240ms; exit 150--200ms.

------------------------------------------------------------------------

## 19. Authentication

Authentication should feel like part of the product.

Include: - clear title - short explanation - grouped fields - password
visibility toggle - validation - strong focus states

Avoid giant marketing panels beside tiny forms.

------------------------------------------------------------------------

## 20. Admin UI

Admin is an operational workspace, not marketing.

Prioritize: - information density - clear tables - filters - compact
status indicators - readable metrics - responsive fallback cards

On mobile, transform table rows into stacked cards when practical. Avoid
unnecessary horizontal scrolling.

------------------------------------------------------------------------

## 21. Weather Simulator

The Weather Shock Simulator should feel like a useful operational tool,
not an AI gimmick.

Use: - clean controls - restrained visualization - clear scenario
state - direct explanation of effects

Always distinguish:

``` text
Observed / Actual
vs.
Simulated / Scenario
```

Actual resource rates must never be visually confused with simulated
pressure.

------------------------------------------------------------------------

## 22. Loading, Empty & Error States

### Loading

Prefer skeletons for resource cards, request cards, metrics, and tables.

Skeletons: - dark neutral - subtle shimmer - no glow explosion -
1.4--1.8s cycle

### Empty

``` text
Small icon / cue
Heading
One sentence
Primary next action
```

### Error

Be specific and actionable.

Bad: \> Something went wrong.

Better: \> We couldn't load your requests. Try again.

------------------------------------------------------------------------

## 23. Motion Philosophy

Motion is part of the product language, not decoration.

Rules: 1. Motion explains change. 2. Motion reinforces hierarchy. 3.
Motion never delays the user. 4. Motion is short and confident. 5.
Motion is consistent.

Timing:

``` text
Fast:       120â€“160ms
Standard:   180â€“240ms
Expressive: 280â€“450ms
```

Avoid routinely exceeding 500ms.

### Signature ResShare motion

**Card lift**

``` text
translateY(-2px)
image scale(1.02)
subtle shadow increase
```

**Tab indicator** - smoothly move a warm indicator between tabs

**Sheet/modal**

``` text
opacity: 0 â†’ 1
translateY(8px) scale(0.985) â†’ 0
```

**Confirmation** - icon scale-in - soft ring expansion - content fades
upward

**Filter selection** - smoothly transition selected state

**Toast** - short vertical slide + opacity

### Never animate

-   every text element on load
-   every card independently
-   page backgrounds continuously
-   gradients continuously
-   tables row-by-row
-   decorative floating blobs
-   large parallax scenes

The interface should feel **alive, not busy**.

------------------------------------------------------------------------

## 24. Accessibility

Target WCAG 2.1 AA quality.

Required: - keyboard navigation - visible focus - sufficient contrast -
semantic buttons - correct labels - dialog semantics - meaningful alt
text - reduced-motion support - no color-only status communication

Improve the existing muted-text contrast problem.

Use:

``` css
@media (prefers-reduced-motion: reduce) {
  /* remove non-essential transitions and animations */
}
```

------------------------------------------------------------------------

## 25. Responsive Design

Design from content constraints.

Test at minimum:

``` text
375px
390px
768px
1024px
1280px
1440px
```

### Mobile

-   single column
-   thumb-friendly controls
-   bottom sheets where appropriate
-   compact header
-   sticky primary actions when useful
-   no horizontal overflow

Do not simply compress desktop.

------------------------------------------------------------------------

## 26. Photography

Photography is a major differentiator from AI-generated SaaS aesthetics.

Prefer: - authentic hospitality spaces - kitchens - banquet halls -
conference environments - event setups - equipment in use -
architectural details

Photography should feel: - warm - natural - premium - editorial

Avoid: - generic corporate stock teams - overly staged imagery -
AI-looking images - excessive overlays

------------------------------------------------------------------------

## 27. Visual Rhythm

Do not make every section look identical.

Suggested rhythm:

``` text
Editorial hero
â†“
Search
â†“
Resource discovery
â†“
Marketplace insight
â†“
How it works
â†“
CTA
```

Alternate density intentionally.

Premium interfaces need both breathing room and useful density.

------------------------------------------------------------------------

## 28. Content Design

Use direct, specific, operational language.

Avoid: - unlock your potential - revolutionize hospitality - seamlessly
transform - powerful AI-driven - next-generation platform

Prefer: - Find the space and equipment your business needs. - Share
hospitality resources with businesses nearby. - Send a request and let
the host respond with availability.

------------------------------------------------------------------------

## 29. Iconography

Use one consistent icon family: - line/medium weight - simple geometry -
16--20px standard - 20--24px primary controls

Do not mix emoji, random SVG styles, filled icons, outlined icons, and
unrelated icon families.

------------------------------------------------------------------------

## 30. CSS Architecture

The project uses plain CSS.

**Do not introduce Tailwind solely for this redesign.**

Keep the current CSS approach.

Centralize: - colors - spacing - typography - radii - borders -
shadows - focus states - transitions - status colors

When touching existing CSS: - consolidate duplicates - reuse tokens -
remove conflicting rules - keep naming understandable

------------------------------------------------------------------------

## 31. Architecture Boundaries

A UI redesign must not become a backend rewrite.

Preserve: - API contracts - authentication - RBAC - request lifecycle -
counter-offers - availability - notifications - matching - admin
security - existing data models

Components may be extracted when it materially improves maintainability,
but business logic should not be rewritten merely for visual changes.

------------------------------------------------------------------------

## 32. Interaction Rules

Every interactive element should have:

``` text
Default
Hover
Focus
```

Where applicable:

``` text
Danger
Disabled
```

Inputs:

``` text
Default
Focus
Filled
Error
Disabled
```

Never rely on hover alone for important information.

------------------------------------------------------------------------

## 33. Primary Action Hierarchy

Each screen should have one obvious primary action.

``` text
Marketplace:     Search / View Details
Resource detail: Request Resource
Request form:    Send Request
My Activity:     Next relevant action
Admin:            Context-specific management action
```

Do not give five buttons the same visual weight.

------------------------------------------------------------------------

## 34. Design Debt to Remove

Specifically eliminate: - inconsistent radii - inconsistent button
heights - duplicate hardcoded colors - inconsistent status badges -
emoji navigation - weak text contrast - abrupt modal transitions -
cramped mobile header - buried marketplace search - card-only CTA
affordance - overly dense form layouts - excessive modal stacking -
generic AI-style decorative effects

------------------------------------------------------------------------

## 35. Implementation Priority

### Phase A --- Foundation

1.  Tokens
2.  Typography
3.  Color system
4.  Spacing
5.  Buttons
6.  Inputs
7.  Cards
8.  Status badges
9.  Icons
10. Motion primitives

### Phase B --- Global shell

1.  Header
2.  Navigation
3.  Mobile navigation
4.  Account menu
5.  Notifications

### Phase C --- Marketplace

1.  Hero
2.  Search
3.  Filters
4.  Resource cards
5.  Resource grid
6.  Resource detail

### Phase D --- Request experience

1.  Request sheet/modal
2.  Form
3.  Validation
4.  Confirmation
5.  Auth transition

### Phase E --- Operations

1.  My Activity
2.  Request cards
3.  Status filters
4.  Negotiation timeline
5.  Notifications

### Phase F --- Admin

1.  Dashboard
2.  Tables
3.  Responsive admin cards
4.  Metrics
5.  Audit/log presentation

### Phase G --- Polish

1.  Micro-interactions
2.  Loading states
3.  Empty states
4.  Error states
5.  Mobile refinement
6.  Accessibility
7.  Visual QA

------------------------------------------------------------------------

## 36. Acceptance Standard

The redesign is complete only when:

-   [ ] A new user immediately understands ResShare.
-   [ ] Resource discovery is visible without excessive scrolling.
-   [ ] Cards feel premium and useful, not decorative.
-   [ ] The request flow feels like a professional B2B workflow.
-   [ ] My Activity feels operational.
-   [ ] Admin feels like a serious management tool.
-   [ ] Mobile feels deliberately designed.
-   [ ] Motion improves understanding.
-   [ ] Visual language is consistent.
-   [ ] The interface feels human-designed.
-   [ ] It does not resemble a generic AI-generated SaaS template.
-   [ ] It does not look like an Airbnb/Uber/Linear/Stripe clone.
-   [ ] Existing functionality remains intact.
-   [ ] Authentication, RBAC, request lifecycle, availability,
    notifications, matching, and admin security remain intact.
-   [ ] `npm run build` passes.
-   [ ] `npm test` passes.
-   [ ] `git diff --check` passes.

------------------------------------------------------------------------

## 37. Final Design Principle

> **ResShare should look expensive because it is considered, not because
> it is decorated.**

Premium comes from: - hierarchy - restraint - typography - photography -
spacing - consistency - interaction quality - meaningful motion -
confidence

Not from: - gradients - glow - glass - giant text - excessive rounded
cards - decorative animation

The final experience should make a hospitality business owner think:

> **"This feels like a serious marketplace I could actually use."**

---not---

> **"This looks like an AI-generated demo."**

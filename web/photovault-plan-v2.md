# PhotoVault Development Plan v2.0

## Project Overview
PhotoVault is a secure content delivery platform for Patreon members with automated watermarking, advanced piracy protection, and studio management tools for high-volume content creators. It will replace the current MEGA-based workflow with a more integrated and secure solution.

---

## Current App Workflow (Pre-PhotoVault)

### The AI Generation App
The existing desktop application is a sophisticated automation tool that handles:

**Character Set Generation**
- Uses NovelAI API for AI art generation
- Dynamic prompt system combining:
  - Character definitions (names, visual tags, clothing variations)
  - Multiple location settings (bedroom, beach, etc.)
  - Extensive pose libraries (solo & duo poses per location)
  - Automatic variations (POV, with_male, etc.)
- Generates 150+ images per character set automatically
- Intelligent duplicate detection and quality filtering

**Current Publishing Workflow**
1. **Generation Phase** (Morning)
   - Creator runs the app
   - Selects characters and settings
   - App generates ~900 images (6 character sets)
   - Images are organized into numbered folders

2. **MEGA Upload Phase** (Automated)
   - App navigates to MEGA via browser automation
   - Creates date-based folder structure
   - Uploads each set to numbered subfolders
   - Generates password-protected share links
   - Copies links to clipboard

3. **Patreon Publishing** (Semi-Automated)
   - App opens Patreon create page
   - Auto-fills post title and description
   - Inserts MEGA link with password
   - Uploads thumbnail
   - Sets scheduled release time
   - Creator manually confirms each post

### Current Pain Points
- **MEGA Dependency**: Vulnerable to takedowns, requires active account
- **Password Sharing**: Links and passwords get leaked on piracy forums
- **Manual Steps**: Still requires ~30 minutes daily for posting
- **No Analytics**: Can't track who downloads or shares content
- **Browser Automation**: Fragile, breaks with UI changes
- **Piracy**: Zero protection once MEGA link is shared

---

## PhotoVault Solution

### How It Improves the Workflow

**Direct Integration**
- AI app uploads directly to PhotoVault API
- No MEGA middleman = no password leaks
- Instant availability to paying members
- Automated scheduling without browser automation

**Enhanced Security**
- Per-user watermarking (not possible with MEGA)
- No shareable links or passwords
- IP tracking and rate limiting
- Piracy detection and member banning

**Better Creator Experience**
- One-click "Mark as Posted" in Studio Dashboard
- Automated Patreon text generation
- Bulk operations for schedule changes
- Real-time analytics and member activity

**Member Benefits**
- Instant access upon Patreon authentication
- No password hunting or link copying
- Better browsing with search/filters
- Faster image loading with CDN

---

## Current Implementation Status ✅

### Completed Features
- **Premium UI/UX** - Dark theme with glassmorphism effects
- **Patreon OAuth** - Working authentication with NextAuth v4
- **Responsive Design** - Mobile-friendly layouts
- **Gallery Interface** - Grid view with hover effects and modal previews
- **Admin Dashboard** - Stats, quick actions, and upload zone
- **Middleware Security** - Protected routes with IP tracking
- **Tailwind CSS v3** - Fully configured and optimized

### Tech Stack
- Next.js 15.3.5 (App Router)
- NextAuth v4 (Patreon OAuth)
- TypeScript
- Tailwind CSS v3
- Sharp (ready for watermarking)

---

## Refined Workflow System

### Creator Daily Workflow with PhotoVault

**Morning (10:00 AM - 10:15 AM)**
1. Run AI generation app as usual
2. App automatically uploads to PhotoVault via API
3. 6 sets scheduled with 2-hour intervals
4. View schedule in Studio Dashboard
5. Copy pre-generated Patreon text

**Throughout Day (12:00 PM - 10:00 PM)**
- Sets go live automatically on PhotoVault
- Creator posts to Patreon (1-click with copied text)
- Clicks "Mark as Posted" in Studio Dashboard
- Members access content instantly via PhotoVault

### Workflow Comparison

| Task | Current (MEGA) | With PhotoVault |
|------|----------------|------------------|
| Image Generation | AI App (unchanged) | AI App (unchanged) |
| Upload Process | Navigate MEGA folders | Direct API upload |
| Password Management | Generate & store | Not needed |
| Scheduling | Manual in Patreon | Automatic |
| Patreon Posting | Semi-automated | Copy & paste text |
| Piracy Protection | None (passwords leak) | Per-user watermarks |
| Time Required | ~30 min/day | ~10 min/day |
| Analytics | None | Full tracking |

## AI App Integration Points

### Required API Endpoints for Existing App

The AI generation app will need minimal modifications to work with PhotoVault:

**1. Authentication Endpoint**
```

---

## Studio Dashboard Features

### Daily Schedule View
```
[data-studio-timeslot="12:00"] - Slot component
[data-studio-status="scheduled|live|posted"] - Status indicator
[data-studio-action="mark-posted"] - Action button
[data-studio-upload-zone] - Drag & drop area
```

### Automation-Friendly Elements
All interactive elements will have:
- Clear `data-*` attributes for selection
- Unique IDs for critical buttons
- Predictable class patterns: `studio-*`, `action-*`
- Form inputs with proper name attributes

### Status Flow
1. **Empty** → Upload fills slot
2. **Scheduled** → Waits for time
3. **Live** → Available on site
4. **Posted** → Confirmed on Patreon
POST /api/automation/auth
Request: { apiKey: "creator-api-key" }
Response: { token: "jwt-token", expiresIn: 86400 }
```

**2. Batch Upload Endpoint**
```
POST /api/automation/batch-upload
Headers: { Authorization: "Bearer {token}" }
Request: {
  sets: [{
    title: "Mountain Landscapes (Nature Collection)",
    characterName: "Mountain Landscapes",
    seriesName: "Nature Collection",
    imageCount: 156,
    scheduledTime: "2024-11-15T12:00:00Z",
    images: [base64...] // or multipart
  }]
}
Response: {
  uploadId: "batch-123",
  sets: [{
    setId: "uuid",
    title: "Mountain Landscapes (Nature Collection)",
    scheduledTime: "2024-11-15T12:00:00Z",
    thumbnailUrl: "https://...",
    patreonText: "Pre-formatted post text"
  }]
}
```

**3. Status Check Endpoint**
```
GET /api/automation/upload-status/{uploadId}
Response: {
  status: "processing|completed",
  progress: 85,
  completed: 5,
  total: 6
}
```

### Minimal App Modifications

Instead of MEGA browser automation, the app just needs:
```python
# Old MEGA code
mega_upload(images, folder_name)
link = mega_get_link(folder_name)

# New PhotoVault code
response = photovault_upload(images, metadata)
patreon_text = response['patreonText']
```

### Daily Schedule View
```
[data-studio-timeslot="12:00"] - Slot component
[data-studio-status="scheduled|live|posted"] - Status indicator
[data-studio-action="mark-posted"] - Action button
[data-studio-upload-zone] - Drag & drop area
```

### Automation-Friendly Elements
All interactive elements will have:
- Clear `data-*` attributes for selection
- Unique IDs for critical buttons
- Predictable class patterns: `studio-*`, `action-*`
- Form inputs with proper name attributes

### Status Flow
1. **Empty** → Upload fills slot
2. **Scheduled** → Waits for time
3. **Live** → Available on site
4. **Posted** → Confirmed on Patreon

---

## Technical Architecture

### Database Schema (PostgreSQL/Supabase)

```sql
-- Content Management
content_sets
- id (uuid, primary key)
- title (text, required)
- slug (text, unique)
- description (text)
- character_name (text, indexed)
- series_name (text, indexed)
- image_count (integer)
- thumbnail_url (text)
- scheduled_time (timestamp)
- published_at (timestamp)
- patreon_posted (boolean)
- patreon_url (text)
- view_count (integer, default 0)
- tags (text[])
- created_at (timestamp)

-- Image Storage
images
- id (uuid, primary key)
- set_id (foreign key → content_sets)
- filename (text)
- r2_key (text, unique)
- order_index (integer)
- width (integer)
- height (integer)
- file_size (integer)
- created_at (timestamp)

-- User Activity
user_activity
- id (uuid, primary key)
- user_id (text, indexed)
- set_id (foreign key → content_sets)
- action (enum: 'view', 'download')
- ip_address (inet)
- user_agent (text)
- created_at (timestamp, indexed)

-- Watermark Cache
watermark_cache
- id (uuid, primary key)
- user_id (text)
- image_id (foreign key → images)
- r2_key (text)
- created_at (timestamp)
- expires_at (timestamp, indexed)

-- Studio Schedule
studio_schedule
- id (uuid, primary key)
- scheduled_date (date, indexed)
- time_slot (time)
- set_id (foreign key → content_sets)
- status (enum: 'empty', 'uploading', 'scheduled', 'live', 'posted')
- patreon_posted_at (timestamp)
```

### API Routes

#### Public Routes
```
GET  /api/sets          - List published sets
GET  /api/sets/[id]     - Get set details
GET  /api/image/[id]    - Serve watermarked image
GET  /api/download/[id] - Download watermarked set
```

#### Studio Routes (Creator Only)
```
GET  /api/studio/schedule          - Get daily/weekly schedule
GET  /api/studio/next-slot         - Get next available slot
POST /api/studio/upload            - Upload new set
PUT  /api/studio/schedule/[id]     - Update slot status
POST /api/studio/schedule/shift    - Bulk reschedule
GET  /api/studio/analytics         - View stats
```

#### Automation Endpoints
```
POST /api/automation/batch-upload  - Upload multiple sets
GET  /api/automation/status        - Check upload progress
POST /api/automation/generate-text - Get Patreon post text
```

---

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1-2)
- [x] Authentication system
- [x] Basic UI/UX
- [ ] Database setup (Supabase)
- [ ] R2 bucket configuration
- [ ] Automation API endpoints

### Phase 2: AI App Integration (Week 3-4)
- [ ] Batch upload endpoint
- [ ] Progress tracking API
- [ ] Patreon text generator
- [ ] API key management
- [ ] Rate limiting for automation

### Phase 3: Studio Dashboard (Week 5-6)
- [ ] Schedule grid interface
- [ ] "Mark as Posted" buttons with clear IDs
- [ ] Copy text functionality
- [ ] Status tracking system
- [ ] Auto-refresh on status changes

### Phase 4: Content Delivery (Week 7-8)
- [ ] Watermarking implementation
- [ ] CDN configuration
- [ ] Download system
- [ ] View tracking
- [ ] Piracy detection

### Phase 5: Migration & Launch (Week 9-10)
- [ ] Import existing MEGA content
- [ ] Member notification system
- [ ] Gradual rollout plan
- [ ] AI app update distribution
- [ ] Full production launch

### Patreon Posting Automation

Since the AI app already handles browser automation, PhotoVault provides:

**Pre-formatted Post Generator**
```javascript
GET /api/automation/patreon-text/{setId}
Response: {
  title: "[12:00 PM] Mountain Landscapes (Nature Collection) - 156 Images",
  body: "🎨 New AI Art Set Available!\n\n✨ View now on PhotoVault\n🔒 Exclusive for members only\n📱 Mobile-friendly gallery\n\nCharacter: Mountain Landscapes\nSeries: Nature Collection\nImages: 156 HD renders\n\n#AIArt #Mountain Landscapes #TeenTitans",
  tags: ["AI Art", "Mountain Landscapes", "Nature Collection"]
}
```

**Automation-Friendly Elements**
```html
<!-- Copy button with clear ID -->
<button id="copy-patreon-text-12pm" 
        data-action="copy-patreon-text"
        data-set-id="uuid">
  Copy Patreon Text
</button>

<!-- Status confirmation -->
<button id="confirm-posted-12pm"
        data-action="confirm-patreon-posted"
        data-set-id="uuid">
  ✓ Mark as Posted
</button>
```

### Required AI App Updates

**Remove:**
- MEGA browser automation code
- Password generation logic
- Link storage/management

**Add:**
- PhotoVault API client
- JWT token handling
- Batch upload function
- Status checking loop

**Keep:**
- All generation logic unchanged
- Character/pose systems unchanged
- Quality filtering unchanged
- Patreon browser automation (simplified)

**Estimated Modification Time: 2-3 hours**

### Studio Dashboard Elements
```html
<!-- Time slots -->
<div data-studio-slot="2024-11-15T12:00:00Z" 
     data-studio-status="scheduled"
     id="slot-1">
  
  <!-- Status indicator -->
  <div class="studio-status-indicator" 
       data-status="scheduled">
    Scheduled
  </div>
  
  <!-- Action buttons -->
  <button id="mark-posted-slot-1" 
          data-studio-action="mark-posted"
          data-slot-time="2024-11-15T12:00:00Z"
          class="studio-action-posted">
    Mark as Posted
  </button>
  
  <!-- Quick copy -->
  <button id="copy-text-slot-1"
          data-studio-action="copy-patreon-text"
          class="studio-action-copy">
    Copy Patreon Text
  </button>
</div>

<!-- Upload zone -->
<div id="studio-upload-zone" 
     data-studio-upload-zone
     class="studio-dropzone">
  <input type="file" 
         id="studio-file-input" 
         name="images[]" 
         multiple />
</div>

<!-- Bulk actions -->
<button id="studio-shift-all"
        data-studio-bulk-action="shift-schedule"
        class="studio-bulk-shift">
  Shift All Remaining
</button>
```

### API Response Formats
```javascript
// Upload response
{
  "success": true,
  "setId": "uuid",
  "scheduledTime": "2024-11-15T12:00:00Z",
  "slot": 1,
  "thumbnailUrl": "https://...",
  "patreonText": "Pre-formatted text"
}

// Schedule status
{
  "date": "2024-11-15",
  "slots": [
    {
      "time": "12:00",
      "status": "posted",
      "setId": "uuid",
      "title": "Mountain Landscapes (Nature Collection)"
    }
  ]
}
```

## Security Improvements Over MEGA

### Current MEGA Vulnerabilities
- **Single Password**: Once leaked, everyone has access
- **Direct Links**: Can be shared infinitely
- **No Tracking**: Can't identify leakers
- **DMCA Risk**: MEGA account can be terminated
- **No Control**: Can't revoke access after sharing

### PhotoVault Security
- **No Passwords**: OAuth-only access
- **Dynamic Watermarking**: Each user sees personalized images
- **Access Logs**: Track every view/download with IP
- **Instant Revocation**: Ban members immediately
- **Legal Protection**: Users agree to terms preventing sharing
- **Piracy Detection**: Automated monitoring for leaked content

### Watermarking Strategy
- Username at 5% opacity
- Random corner placement per user
- Cached for 24 hours
- Embedded metadata
- Re-watermark on suspicious activity

### Access Control
- Rate limiting per user (100 requests/hour)
- IP-based tracking
- Bulk download detection
- Geographic restrictions (optional)
- Token-based API access

### Content Protection
- No direct R2 URLs exposed
- All images served through API
- Temporary signed URLs (5 min expiry)
- Request validation
- Activity logging

---

## Cost Optimization

### Estimated Monthly Costs
| Service | Usage | Cost |
|---------|-------|------|
| Vercel | ~500GB bandwidth | $20 |
| Cloudflare R2 | 1TB storage, 2TB bandwidth | $15 |
| Supabase | 50k MAU, 10GB database | $25 |
| Domain | Annual | $1 |
| **Total** | | **~$61/month** |

### Optimization Strategies
- Aggressive caching (24hr watermarks)
- Thumbnail optimization (WebP format)
- Lazy loading for galleries
- CDN for static assets
- Database query optimization

---

## Future Enhancements

### Version 2.0
- Discord integration
- Email notifications
- Member comments/ratings
- Collection bundles
- Advanced search with AI

### Version 3.0
- Video content support
- Live streaming for releases
- Mobile app
- Blockchain certificates
- AI-powered recommendations

---

## Development Guidelines

### Code Standards
- TypeScript for type safety
- Clear component naming
- Comprehensive error handling
- API response validation
- Automated testing for critical paths

### Automation Support
- Predictable element IDs
- Data attributes for selection
- Consistent class naming
- Clear form structures
- Status indicators

### Performance Targets
- Page load < 2 seconds
- Image delivery < 500ms
- Upload processing < 30 seconds
- 99.9% uptime
- Support for 10k+ concurrent users

---

## Contact & Support

**Project Lead**: DemoCreator
**Platform**: photovault-demo.com
**Repository**: [Private]
**Last Updated**: November 2024

---

## Quick Start Commands

```bash
# Development
npm run dev

# Database migrations
npm run db:migrate

# Generate types
npm run generate:types

# Run tests
npm run test

# Build for production
npm run build
```
# CheckInModal Component - Implementation Notes

## Overview
The CheckInModal is a comprehensive GPS-based check-in system located at:
`/Users/khundeck/working/defcon.run.33/apps/nx/apps/webapp/src/components/check-in/CheckInModal.tsx`

## Component Structure

### Core State Variables
```typescript
const [checkInType, setCheckInType] = useState<'Basic' | 'OTP' | 'With Flag'>('Basic');
const [otpCode, setOtpCode] = useState('');
const [flagText, setFlagText] = useState('');
const [isPrivate, setIsPrivate] = useState(false);
const startButtonRef = useRef<HTMLButtonElement>(null);
```

### Check-in Types
1. **Basic** - Default, no additional data required
2. **OTP** - Requires 6-digit OTP code validation
3. **With Flag** - Requires flag text (max 20 characters)

### UI Layout Order (Top to Bottom)
1. **Privacy Selection** - Compact horizontal buttons (288px total width)
   - Public: Globe icon + "Public" text (Success color)
   - Private: Lock icon + "Private" text (Warning color)
2. **Check-in Type Dropdown** - HeroUI Select component (288px width)
3. **Conditional Input Fields**:
   - OTP: InputOtp component (centered, 6-digit)
   - With Flag: Input component (288px width, 20 char limit)
4. **Instructions text**

## Key Features & Enhancements

### Visual Design
- **Compact Design**: Reduced padding (`px-3 py-1`), tighter gaps (`gap-2`)
- **Consistent Width**: All form elements aligned to 288px width
- **Horizontal Layout**: Privacy buttons use `flex items-center` with icons beside text
- **No Redundant Labels**: Privacy section has no title, buttons are self-explanatory

### User Experience
- **Auto-focus**: When OTP reaches 6 digits, start button receives focus automatically
- **Validation**: OTP requires exactly 6 digits, Flag requires non-empty text
- **Dynamic Header**: Shows check-in type in modal title
- **Success Feedback**: Displays type and relevant data in confirmation

### Component Dependencies
```typescript
import { InputOtp, Select, SelectItem, Input } from '@heroui/react';
import { Flag, KeyRound, Circle, Lock, Globe } from 'lucide-react';
```

## API Integration

### Request Payload
```json
{
  "samples": [...],
  "source": "Web GPS",
  "userAgent": "...",
  "isPrivate": boolean,
  "checkInType": "Basic|OTP|With Flag",
  "otpCode": "123456", // only for OTP
  "flagText": "flag_text" // only for With Flag
}
```

### Validation Logic
- OTP: Must be exactly 6 digits
- Flag: Must be non-empty, max 20 characters
- Basic: No additional validation

## Related Components

### CheckInDisplay Component
Location: `/Users/khundeck/working/defcon.run.33/apps/nx/apps/webapp/src/components/profile/CheckInDisplay.tsx`

Key features implemented:
- **Map Height Toggle**: Button to expand map from `h-64` to `h-[32rem]`
- **Auto-expand Card**: Clicking map controls or check-in items auto-expands collapsed card
- **Private Icon Styling**: Uses "warning" color (yellow) for consistency
- **Stationary Icon**: Changed from AlertTriangle to Circle for neutral appearance

### Profile Page Layout
Location: `/Users/khundeck/working/defcon.run.33/apps/nx/apps/webapp/src/app/(headfoot)/profile/page.tsx`

Component order:
1. UserDetails
2. CheckInDisplayClient (full width)
3. LeaderboardRank ("Your Rank") + MqttCredentials ("MQTT")
4. MeshtasticRadios (full width)
5. StravaConnection + QuotaDisplay

## Color Scheme Consistency
- **Private items**: "warning" color (yellow/amber)
- **Public items**: "success" color (green)
- **Basic type**: "primary" color (blue)
- **OTP type**: "secondary" color
- **Flag type**: "success" color (green)

## Width Standards
- **Privacy buttons**: `max-w-[140px]` each = 288px total with gap
- **Type dropdown**: `w-[288px]` to match privacy buttons
- **Flag input**: `w-[288px]` to match other elements
- **OTP input**: Centered naturally

## Auto-focus Implementation
```typescript
useEffect(() => {
  if (checkInType === 'OTP' && otpCode.length === 6 && startButtonRef.current) {
    startButtonRef.current.focus();
  }
}, [checkInType, otpCode]);
```

## State Reset on Modal Close
All form fields reset to defaults:
- `checkInType`: 'Basic'
- `otpCode`: ''
- `flagText`: ''
- Privacy resets to user preference

## Testing Considerations
- Verify OTP auto-focus works on 6th digit
- Test validation messages for incomplete OTP/Flag
- Confirm API payload includes correct type-specific data
- Check width alignment across all form elements
- Verify privacy button colors match app-wide standards

## Future Enhancement Ideas
- Support for additional check-in types
- QR code scanning integration
- Location-based validation
- Batch check-in submission
- Offline check-in queuing

---
*Last updated: 2025-01-27*
*Component versions: CheckInModal (enhanced), CheckInDisplay (map toggle), Profile page (label updates)*
# AI Chatbot Setup Guide

## Overview
The "Still Have Questions?" popup has been upgraded to a full AI-powered Hybrid Chatbot while maintaining the exact same external design, positioning, animations, and trigger logic.

## What Was Changed

### HTML (`index.html`)
- **Internal popup content only** - Replaced simple buttons with chatbot interface:
  - Chat header with close button
  - Message container for chat history
  - Typing indicator
  - Input field with send button
  - Quick reply chips
  - WhatsApp fallback button

### CSS (`styles.css`)
- **Added chatbot UI styles** while preserving popup's external design:
  - Message bubbles (bot/user)
  - Quick reply chips
  - Typing indicator animation
  - Input field styling
  - WhatsApp button styling
  - All responsive breakpoints maintained

### JavaScript (`script.js`)
- **Added AI chatbot functionality** while preserving all existing trigger logic:
  - OpenAI API integration (with fallback to rule-based responses)
  - Chat history persistence (localStorage)
  - Quick reply handlers
  - Contextual quick replies
  - WhatsApp fallback
  - All existing popup triggers remain intact

## Setup Instructions

### 1. Add OpenAI API Key

Open `script.js` and find this line (around line 350):

```javascript
const OPENAI_API_KEY = ""; // User needs to add their OpenAI API key
```

Replace the empty string with your OpenAI API key:

```javascript
const OPENAI_API_KEY = "sk-your-actual-api-key-here";
```

**Important:** For production, consider using a backend proxy to keep your API key secure. The current implementation exposes the key in the frontend.

### 2. Test the Chatbot

1. Open the website
2. Trigger the popup (scroll 70%, pause video, etc.)
3. The chatbot interface should appear
4. Type a message or click a quick reply chip
5. AI should respond (or rule-based response if no API key)

## Features

### ✅ Preserved Features
- All existing popup trigger logic (scroll, video pause, tab return, etc.)
- Popup positioning, size, animations, colors
- Debounce logic and frequency limits
- Mobile responsiveness
- ESC to close, outside click to close

### ✅ New Features
- AI-powered conversational responses
- Quick reply chips for common actions
- Chat history persistence (localStorage)
- Typing indicator animation
- Contextual quick replies based on conversation
- WhatsApp fallback button
- Rule-based fallback if AI unavailable

## Conversation Flows

The chatbot handles:
1. **Dental Services** - Implants, root canals, whitening, braces, etc.
2. **Aesthetic Services** - Botox, fillers, chemical peels, etc.
3. **Kids Dentistry** - First visits, cleanings, sealants, etc.
4. **Pricing** - Estimated ranges with WhatsApp for exact pricing
5. **Appointment Booking** - Collects info and offers WhatsApp confirmation
6. **Emergency Help** - Provides immediate contact options

## Error Handling

- If OpenAI API fails, falls back to rule-based responses
- Shows WhatsApp button if AI unavailable
- All errors are logged to console (non-blocking)

## Testing Checklist

- [ ] Popup appears with same design/position
- [ ] Chatbot interface loads correctly
- [ ] Quick reply chips work
- [ ] User can type and send messages
- [ ] AI responses appear (or rule-based if no API key)
- [ ] Typing indicator shows while waiting
- [ ] Chat history persists after closing/reopening
- [ ] WhatsApp button opens correct link
- [ ] All existing popup triggers still work
- [ ] Mobile responsive design works
- [ ] ESC key closes popup
- [ ] Outside click closes popup

## Notes

- Chat history is stored in `localStorage` with key `dnaClinicChatHistory`
- Maximum 3 popups per session (existing limit preserved)
- 20-second debounce between popups (existing logic preserved)
- WhatsApp number: +91 80729 80232 (hardcoded in multiple places)

## Security Considerations

**For Production:**
1. Move OpenAI API calls to a backend server
2. Store API key in environment variables (never in frontend)
3. Implement rate limiting
4. Add user authentication if needed
5. Sanitize all user inputs

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify OpenAI API key is correct
3. Check network tab for API requests
4. Ensure localStorage is enabled in browser


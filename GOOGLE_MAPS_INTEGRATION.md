# Google Maps Integration Guide

## Current Setup

The system uses Google Maps API for:
- Extracting address information from Google Maps URLs
- Displaying venue locations
- Generating map embeds

## Environment Variables Required

Add these to your Vercel environment variables:

```
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

**Note**: `GOOGLE_MAPS_API_KEY` is used server-side, `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is used client-side for map embeds.

## Setting Up Google Maps API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - **Maps JavaScript API** (for client-side embeds)
   - **Geocoding API** (for address extraction)
   - **Places API** (for place details and search)
4. Create an API key:
   - Go to "Credentials" → "Create Credentials" → "API Key"
   - Restrict the key to only the APIs you need
   - Add HTTP referrer restrictions for production domains

## Address Field Structure

### Current Structure (Recommended)
- **address**: Street address (e.g., "123 Main St")
- **city**: City name
- **state**: State/Province (optional, not all countries have this)
- **country**: Country code (ISO 2-letter, e.g., "US", "GB", "ID")

### Why This Structure?
- **Flexible**: Works for most countries
- **Standard**: Matches Google's Geocoding API response
- **Simple**: Easy to display and search
- **International**: Handles countries with/without states

### Alternative: Single Address Line
Some systems use a single "address" field, but this has drawbacks:
- ❌ Harder to search/filter by city
- ❌ Difficult to validate
- ❌ Poor for international addresses
- ❌ Can't easily group venues by location

### Optional: Adding Postal Code
If needed, we can add a `postal_code` field, but currently postal codes are included in the `address` field when available from Google's API.

## Short Link Issues

### Problem
Google Maps short links (maps.app.goo.gl/...) sometimes fail to extract addresses because:
1. They require redirect resolution
2. Google may block automated requests
3. Some links require authentication

### Solutions Implemented

1. **Multiple Extraction Methods**:
   - Extract coordinates from URL
   - Extract place ID from URL
   - Extract place name from URL
   - Use Google Places API when place ID is found

2. **Better Error Messages**:
   - Clear indication when short links fail
   - Suggestion to use full Google Maps URLs

3. **Fallback Options**:
   - If URL extraction fails, user can manually enter address
   - System stores the Google Maps URL for direct linking

### Best Practice for Users
- **Preferred**: Use full Google Maps URLs when possible
- **Acceptable**: Short links work, but may require manual address entry if extraction fails
- **Always**: The stored Google Maps URL is used for the "Open in Maps" button, regardless of extraction success

## Using Gemini AI (Not Recommended)

While Google's Gemini AI could theoretically help parse addresses, it's **not recommended** because:
- ❌ Google's Geocoding API already does this perfectly
- ❌ Adds unnecessary complexity and cost
- ❌ Slower than direct API calls
- ❌ Geocoding API is purpose-built for this task

**Recommendation**: Stick with Google Maps Geocoding API and Places API - they're designed for this exact use case.

## Troubleshooting

### "Could not extract address from short Google Maps URL"

**Causes**:
1. Short link requires authentication
2. Google is blocking automated requests
3. URL format not recognized

**Solutions**:
1. Try using a full Google Maps URL instead
2. Manually enter the address
3. Check server logs for detailed error messages
4. Ensure Google Maps API key is properly configured

### "Google Maps API key not configured"

**Solution**:
1. Add `GOOGLE_MAPS_API_KEY` to Vercel environment variables
2. Ensure the API key has Geocoding API and Places API enabled
3. Check API key restrictions don't block your server IPs

## Future Improvements

1. **Add Postal Code Field** (optional):
   - Migration to add `postal_code` column
   - Update extraction to store separately
   - Update UI to display postal code

2. **Client-Side Resolution** (if needed):
   - Use browser to resolve short links
   - Send resolved URL to server
   - More reliable but requires user interaction

3. **Caching**:
   - Cache resolved URLs
   - Cache geocoding results
   - Reduce API calls


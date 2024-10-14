# AppState Handler API

## Overview

This API saves Facebook app state cookies into a `.env` file. Super simple, right? 

## Endpoint

### `POST /appstate`

**Query Parameter:**
- `cookies`: Required. Should be a JSON string of an array of cookie objects.

**Example:**
```
GET /appstate?cookies=[{"key":"c_user","value":"123456","domain":".facebook.com","path":"/","hostOnly":false,"creation":1616190418000,"lastAccessed":1616190418000}]
```

## Responses

- **200 OK**: AppState saved successfully.
  - **Response Body**: 
  ```json
  {
    "message": "AppState saved successfully.",
    "name": "123456"
  }
  ```

- **400 Bad Request**: If cookies are missing or invalid.
- **500 Internal Server Error**: If thereâ€™s an issue saving the file.

## Functionality Highlights

- Checks if the `cookies` parameter is provided.
- Validates the cookie structure (requires `key`, `value`, `domain`, etc.).
- Ensures no duplicate cookies.
- Saves cookies to a file named after the `c_user` value.
- Creates a directory for storing app states if it doesn't exist.
- Exits gracefully after saving.

## Quick Notes

- Use it wisely. If you mess it up, you might just get a bad request. 
- Don’t expect me to explain everything in detail; I’m too lazy for that!

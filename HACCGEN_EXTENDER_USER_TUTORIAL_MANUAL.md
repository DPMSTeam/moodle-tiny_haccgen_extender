# Haccgen Extender User Tutorial Manual

## 1) Overview

`Haccgen extender` adds AI tools directly inside Moodle Tiny Editor so users can generate and improve content without leaving the editor.

This manual covers:
- End-user usage (teachers, authors, content creators)
- Admin setup and configuration
- Meaning of every visible field
- Common errors and fixes
- Suggested screenshot insertion points

---

## 2) Who This Is For

- **Teachers and authors** who want AI-assisted writing, translation, media generation, and OCR in Tiny Editor.
- **Moodle administrators** who configure endpoint and subscription credentials.

---

## 3) Prerequisites

- Moodle with Tiny Editor enabled.
- `tiny_haccgen_extender` installed.
- Admin has configured:
  - Endpoint URL
  - Subscription Manager API key
  - Subscription Manager API secret
- User role has capability to use the plugin (`tiny/haccgen_extender:use`).

---

## 4) Quick Start (5 Minutes)

1. Open any activity/resource using Tiny Editor.
2. Select text (optional but recommended for text tools).
3. Click the `Haccgen` toolbar button.
4. Choose a tool from the Haccgen tool gallery.
5. Fill required fields and click `Run`.
6. In result dialog, use `Copy`, `Insert below`, or `Replace selection`.

### Screenshot Placeholder
- **Insert Screenshot:** Tiny editor toolbar with Haccgen button.
- **Suggested file:** `Screenshot_2026-04-10_160214...png`

### Screenshot Placeholder
- **Insert Screenshot:** Haccgen tools gallery modal.
- **Suggested file:** `Screenshot_2026-04-10_095811...png`

---

## 5) Admin Setup Guide

Path (typical): Site administration -> Plugins -> Text editors -> Tiny editor -> Haccgen extender

### 5.1 Endpoint URL
- **Field label:** `Endpoint URL`
- **Internal key:** `tiny_haccgen_extender/endpointurl`
- **Required:** Yes
- **Type:** URL
- **Purpose:** Upstream AI endpoint used for all requests.
- **Example:** `/local/subscription_manager/ai_endpoint.php` (or full HTTPS URL)

### 5.2 Subscription Manager API key
- **Field label:** `Subscription Manager API key`
- **Internal key:** `tiny_haccgen_extender/subscription_api_key`
- **Required:** Yes (when endpoint is Subscription Manager AI endpoint)
- **Type:** Text
- **Purpose:** Identifies LMS subscription credentials.

### 5.3 Subscription Manager API secret
- **Field label:** `Subscription Manager API secret`
- **Internal key:** `tiny_haccgen_extender/subscription_api_secret`
- **Required:** Yes (when endpoint is Subscription Manager AI endpoint)
- **Type:** Password
- **Purpose:** Auth secret paired with API key.

### 5.4 Subscription usage summary
- **UI section:** `Subscription usage (this site)`
- **Displays:** Type, Used, Limit
- **Common rows:** Words, Audio (seconds), Images, Video (seconds)
- **Important:** Usage is shared across this site subscription, not per individual user.

### 5.5 Timeout (seconds)
- **Field label:** `Timeout (seconds)`
- **Internal key:** `tiny_haccgen_extender/timeout`
- **Default:** `20`
- **Type:** Integer
- **Purpose:** Request timeout before failure.
- **Note:** Video generation has internal long timeout handling.

### 5.6 Allowed purposes (comma-separated)
- **Field label:** `Allowed purposes (comma-separated)`
- **Internal key:** `tiny_haccgen_extender/allowedpurposes`
- **Default:** Empty
- **Type:** Comma-separated string
- **Purpose:** Restrict visible/allowed tool purposes.
- **Behavior:**
  - Empty = all purposes enabled
  - Non-empty = only listed purpose keys enabled

### Screenshot Placeholder
- **Insert Screenshot:** Settings page with endpoint, API key/secret, usage table.
- **Suggested file:** `Screenshot_2026-04-10_124456...png`

### Screenshot Placeholder
- **Insert Screenshot:** Lower section with timeout and allowed purposes.
- **Suggested file:** `Screenshot_2026-04-10_160651...png`

---

## 6) Tool Catalog (Purpose Keys)

Default tool purposes:
- `summarize`
- `translate`
- `detailed_description`
- `create_audio`
- `image_generation`
- `infograph_image_generation`
- `avatar_generation`
- `video_generation` (request may use `videogen` in flow)
- `image_description`
- `text_recognition`

---

## 7) Detailed Tool-by-Tool Guide

## 7.1 Summarize

**Use case:** Reduce long text into concise points.

Fields:
- **Maximum amount of words** (`wordCount`)
  - Values: `nolimit`, `10`, `20`, `50`, `100`, `200`, `300`, `400`, `500`
  - Default: `nolimit`
- **Language type** (`languageType`)
  - Values: `keep`, `simple`, `technical`
  - Default: `keep`
- **Prompt** (`prompt`)
  - Required text input
  - Prefills from editor selection if present

How to use:
1. Select text before opening tool (or paste into prompt).
2. Set word limit and language type.
3. Click `Run`.
4. Review output in result dialog.

Common mistakes:
- Running with empty prompt.
- Setting very low word count for complex input.

---

## 7.2 Translate

**Use case:** Translate content into a selected language.

Fields:
- **Target language** (`targetLanguage`)
  - Default: `English`
  - Values: language list in UI (English, Arabic, Hindi, Spanish, etc.)
- **Prompt edit mode** (`prompt`)
  - Required
  - Prefills from selected editor text

How to use:
1. Select source text or paste into prompt.
2. Choose target language.
3. Click `Run`.

### Screenshot Placeholder
- **Insert Screenshot:** Translate modal.
- **Suggested file:** `Screenshot_2026-04-10_124547...png`

---

## 7.3 Detailed description

**Use case:** Expand text into richer, clearer explanation.

Fields:
- **Maximum amount of words** (`wordCount`)
  - Values: `nolimit`, `10`, `20`, `50`
  - Default: `nolimit`
- **Language type** (`languageType`)
  - Values: `keep`, `simple`, `technical`
  - Default: `keep`
- **Prompt edit mode** (`prompt`)
  - Required
  - Prefilled from selected text

---

## 7.4 Create audio

**Use case:** Convert text to narrated audio.

Fields:
- **Target language** (`targetLanguage`)
  - Locale-based list (for example `English (en-AU)`, `English (en-US)`, `Hindi (hi-IN)`, etc.)
  - Default: `English (en-AU)`
- **Gender** (`gender`)
  - Values: `Male`, `Female`
  - Default: `Male`
- **Prompt edit mode** (`prompt`)
  - Required text/script

Result:
- Opens media result dialog.
- Supports insertion into editor as audio element.

---

## 7.5 Image generation

**Use case:** Generate a static image from text prompt.

Fields:
- **Prompt** (`prompt`)
  - Required
- **Size** (`size`)
  - `1:1_1024x1024`
  - `4:3_896x1280`
  - `4:3_1280x896`
  - `9:16_768x1408`
  - `16:9_1408x768`
  - Default: `1:1_1024x1024`

Result:
- Returns image preview in result dialog.
- User can insert image below or replace selection.

---

## 7.6 Infographic image generation

**Use case:** Create infographic-style visual output.

Fields:
- **Size** (`size`)
  - `1:1 (1024 x 1024)`
  - `4:3 (896 x 1280)`
  - `4:3 (1280 x 896)`
  - `9:16 (768 x 1408)`
  - `16:9 (1408 x 768)`
  - Default: `1:1 (1024 x 1024)`
- **Density** (`density`)
  - `medium`, `high`
  - Default: `medium`
- **Prompt** (`prompt`)
  - Required

Payload includes infographic style routing internally.

---

## 7.7 Avatar generation

**Use case:** Generate talking avatar video output.

Fields:
- **Script** (`prompt`) - required
- **Avatar Id** (`avatar_id`) - dynamic options
- **Voice Id** (`voice_id`) - dynamic options
- **Video Style Id** (`video_style_id`) - dynamic options
- **Output Format** (`output_format`) - dynamic options
- **Resolution** (`resolution`) - dynamic options

Defaults:
- First available option in each dynamic list
- Fallback examples: `normal`, `mp4`, `1280x720` when needed

Note:
- Some options are sent as arrays in request payload.

---

## 7.8 Video generation

**Use case:** Generate video from prompt and selected style settings.

Fields:
- **Prompt** (`prompt`) - required
- **Language** (`language`) - dynamic
- **Voice** (`voice_id`) - dynamic
- **Aspect ratio** (`aspect_ratio`) - dynamic (example `16:9`)
- **Output format** (`output_format`) - dynamic (example `mp4`)
- **Font** (`font`) - dynamic
- **Use generative image** (`useGenerativeImage`)
  - Values: `true`/`false` shown as Yes/No
  - Default: `true`

### Screenshot Placeholder
- **Insert Screenshot:** Video generation modal.
- **Suggested file:** `Screenshot_2026-04-10_095654...png`

---

## 7.9 Image description

**Use case:** Describe contents of an uploaded image.

Fields:
- **Image upload** (drag/drop or file picker)
  - Required
  - Accepts image types (`image/*`) with UI guidance for PNG/JPG/JPEG/WEBP
- **Prompt** (`prompt`)
  - Required instruction text
  - Default empty

Validation:
- If no image: shows "Please upload an image first."
- If no prompt: asks user to enter prompt.

---

## 7.10 Text recognition (OCR)

**Use case:** Extract readable text from uploaded image.

Fields:
- **Image upload**
  - Required
- **Prompt** (`prompt`)
  - Required
  - Default:
    `Extract all readable text from this file. Preserve line breaks. Output only the extracted text.`

Typical prompt variants:
- "Extract all text exactly as-is."
- "Extract text and preserve line breaks and numbering."

---

## 8) Result Dialog Guide

Result behavior depends on output type.

### 8.1 Text result actions
- `Close`
- `Copy`
- `Insert below`
- `Replace selection` (only shown if original selection existed)

### 8.2 Media result actions (audio/image/video)
- `Close`
- `Insert below` (if media prepared successfully)
- `Replace selection` (if selection existed and media is insertable)

### 8.3 Media localization behavior
- Plugin attempts to localize media to Moodle draft files.
- This avoids fragile external links where possible.
- If draft area unavailable, plugin may fallback or show upload warning.

### Screenshot Placeholder
- **Insert Screenshot:** Generated media inserted into Tiny Editor (video/audio/image example).
- **Suggested file:** `Screenshot_2026-04-10_160651...png` (editor media insertion view)

---

## 9) Complete Field Reference (All Key Fields)

| Area | UI Label | Internal Key | Required | Default | Allowed Values / Notes |
|---|---|---|---|---|---|
| Admin | Endpoint URL | `endpointurl` | Yes | Empty | Valid URL/path to AI endpoint |
| Admin | Subscription Manager API key | `subscription_api_key` | Conditional | Empty | Required for Subscription Manager endpoint |
| Admin | Subscription Manager API secret | `subscription_api_secret` | Conditional | Empty | Required for Subscription Manager endpoint |
| Admin | Timeout (seconds) | `timeout` | No | `20` | Integer |
| Admin | Allowed purposes | `allowedpurposes` | No | Empty | Comma-separated purpose keys |
| Summarize | Maximum amount of words | `wordCount` | No | `nolimit` | `nolimit`, `10`, `20`, `50`, `100`, `200`, `300`, `400`, `500` |
| Summarize | Language type | `languageType` | No | `keep` | `keep`, `simple`, `technical` |
| Summarize | Prompt | `prompt` | Yes | Selection text | Text input |
| Translate | Target language | `targetLanguage` | Yes | `English` | UI language list |
| Translate | Prompt edit mode | `prompt` | Yes | Selection text | Text input |
| Detailed description | Maximum amount of words | `wordCount` | No | `nolimit` | `nolimit`, `10`, `20`, `50` |
| Detailed description | Language type | `languageType` | No | `keep` | `keep`, `simple`, `technical` |
| Detailed description | Prompt edit mode | `prompt` | Yes | Selection text | Text input |
| Create audio | Target language | `targetLanguage` | Yes | `English (en-AU)` | Locale list |
| Create audio | Gender | `gender` | Yes | `Male` | `Male`, `Female` |
| Create audio | Prompt edit mode | `prompt` | Yes | Selection text | Text/script |
| Image generation | Prompt | `prompt` | Yes | Selection text or empty | Image description text |
| Image generation | Size | `size` | Yes | `1:1_1024x1024` | 5 preset sizes |
| Infographic image | Size | `size` | Yes | `1:1 (1024 x 1024)` | 5 preset sizes |
| Infographic image | Density | `density` | Yes | `medium` | `medium`, `high` |
| Infographic image | Prompt | `prompt` | Yes | Selection text or empty | Infographic description |
| Avatar generation | Script | `prompt` | Yes | Selection text | Text script |
| Avatar generation | Avatar Id | `avatar_id` | Yes | First option | Dynamic option list |
| Avatar generation | Voice Id | `voice_id` | Yes | First option | Dynamic option list |
| Avatar generation | Video Style Id | `video_style_id` | Yes | First option / fallback | Dynamic option list |
| Avatar generation | Output Format | `output_format` | Yes | First option / fallback `mp4` | Dynamic option list |
| Avatar generation | Resolution | `resolution` | Yes | First option / fallback `1280x720` | Dynamic option list |
| Video generation | Prompt | `prompt` | Yes | Selection text | Video prompt |
| Video generation | Language | `language` | Yes | First option / fallback `en` | Dynamic option list |
| Video generation | Voice | `voice_id` | Yes | First option | Dynamic option list |
| Video generation | Aspect ratio | `aspect_ratio` | Yes | First option / fallback `16:9` | Dynamic option list |
| Video generation | Output format | `output_format` | Yes | First option / fallback `mp4` | Dynamic option list |
| Video generation | Font | `font` | Yes | First option | Dynamic option list |
| Video generation | Use generative image | `useGenerativeImage` | Yes | `true` | `true`/`false` (Yes/No UI) |
| Image description | Image upload | image object in options | Yes | None | Must upload image file |
| Image description | Prompt | `prompt` | Yes | Empty | User instruction |
| Text recognition | Image upload | image object in options | Yes | None | Must upload image file |
| Text recognition | Prompt | `prompt` | Yes | OCR default sentence | User instruction |

---

## 10) Errors and Troubleshooting

### Endpoint URL is not configured
- **Cause:** `endpointurl` empty.
- **Fix:** Admin saves valid endpoint URL.

### Subscription credentials missing
- **Cause:** Endpoint points to Subscription Manager AI and key/secret not set.
- **Fix:** Save `subscription_api_key` and `subscription_api_secret`.

### Purpose not allowed
- **Cause:** Tool purpose not included in `allowedpurposes`.
- **Fix:** Update allowed purpose list or clear field to allow all.

### Invalid options JSON
- **Cause:** Malformed JSON in generic options flow.
- **Fix:** Use valid JSON object format.

### Please enter text/prompt
- **Cause:** Prompt textarea empty.
- **Fix:** Enter text or select content before opening tool.

### Please upload an image first
- **Cause:** OCR/Image description run without file.
- **Fix:** Upload image before clicking `Run`.

### Upstream timeout
- **Cause:** Endpoint slow/unreachable; long-running media generation.
- **Fix:** Check endpoint health/network and adjust timeout if needed.

---

## 11) Best Practices

- Select source text before opening text tools to auto-prefill prompt.
- Keep prompts specific and concise.
- For image/video generation, include style, topic, and expected output format.
- Validate generated content before publishing.
- Restrict high-cost purposes in `allowedpurposes` for staged rollouts.
- Monitor subscription usage regularly.

---

## 12) Suggested Screenshot Map for Final Documenting

1. Tiny editor toolbar + Haccgen button  
2. Haccgen tools gallery modal  
3. Translate modal example  
4. Video generation modal example  
5. Admin settings (endpoint + credentials + usage)  
6. Timeout + allowed purposes section  
7. Editor after media insertion  

If embedding images later, place each screenshot under its related section and add short captions.

---

## 13) Change Log Template

- Version:
- Date:
- Updated by:
- What changed:
- Why:


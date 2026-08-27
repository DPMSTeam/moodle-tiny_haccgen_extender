# HACC Gen extender

Tiny editor plugin for Moodle. It adds AI tools inside the editor (summarise, translate, audio, image, video, and more) using the same Subscription Manager backend as HACC Gen.

**Component:** `tiny_haccgen_extender`  
**Requires:** Moodle 4.1+ (Tiny editor)

## Install

1. Copy this folder to `lib/editor/tiny/plugins/haccgen_extender`.
2. Visit **Site administration → Notifications** and complete the upgrade.
3. Enable the plugin under **Site administration → Plugins → Text editors → Tiny editor**.

## Admin setup

**Site administration → Plugins → Text editors → Tiny editor → HACC Gen extender**

| Setting | Required | Notes |
|---|---|---|
| Endpoint URL | Yes | Subscription Manager AI endpoint, e.g. `/local/subscription_manager/ai_endpoint.php` |
| API key | Yes (with SM) | From the HACC Gen / Subscription Manager dashboard |
| API secret | Yes (with SM) | Paired with the API key |
| Timeout (seconds) | No | How long to wait before a request fails. Video jobs can take several minutes. |
| Allowed purposes | No | Comma-separated purpose keys. Empty = all tools. |

Get credentials: [subscription.dynamicpixel.co.in](https://subscription.dynamicpixel.co.in/)

The settings page also shows **subscription usage for this site** (words, audio seconds, images, video seconds). Totals are for the LMS subscription, not per user.

Capability: `tiny/haccgen_extender:use`

## How to use

1. Open Tiny editor in any activity.
2. Optionally select text.
3. Click the **HACC Gen** toolbar button.
4. Choose a tool, fill the fields, click **Run**.
5. In the result dialog: **Copy**, **Insert below**, or **Replace selection**.

## Tools

| Tool | Purpose key |
|---|---|
| Summarize | `summarize` |
| Translate | `translate` |
| Detailed description | `detailed_description` |
| Create audio | `create_audio` |
| Image generation | `image_generation` |
| Infographic image | `infograph_image_generation` |
| Avatar generation | `avatar_generation` |
| Video generation | `video_generation` |
| Image description | `image_description` |
| Text recognition | `text_recognition` |

### Video generation

- **Prompt / narration** — topic and length, or the script if you use your own narration.
- **Script mode** — AI storyboard (writes the script) or Use my narration (your text, split on full stops).
- **Additional context** — shown only for AI storyboard.
- **Narrator gender**, **Delivery style** — voice only.
- **Scene images** — Default, Stock Library, or AI-generated only.
- **People in AI images** and **Image style** — hidden when Scene images is Stock Library.

Video generation can take 5–10 minutes. Do not close the dialog while it runs.

## Privacy

The plugin does not store personal data in Moodle. Requests send user input (selected text and form fields) to the configured AI endpoint. See the plugin privacy API.

## License

GNU GPL v3 or later. See <http://www.gnu.org/copyleft/gpl.html>

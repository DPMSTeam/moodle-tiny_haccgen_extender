<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * English language strings for tiny_haccgen_extender.
 *
 * @package tiny_haccgen_extender
 * @copyright 2026, Dynamic Pixel
 *
 * @license http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

$string['btn_back'] = 'Back';
$string['btn_cancel'] = 'Cancel';
$string['btn_change'] = 'Change';
$string['btn_choose'] = 'Choose file';
$string['btn_clear'] = 'Clear';
$string['btn_close'] = 'Close';
$string['btn_edit_interactive'] = 'Edit content';
$string['btn_insert_below'] = 'Insert below';
$string['btn_insert_into_editor'] = 'Insert into editor';
$string['btn_replace_selection'] = 'Replace selection';
$string['btn_try_another_layout'] = 'Try another layout';
$string['btn_run'] = 'Run';
$string['button_open'] = 'HACC Gen Extender';
$string['button_edit_interactive'] = 'Edit interactive element';
$string['cachedef_videogen_options'] = 'Video generation options cache';
$string['err_bad_options'] = 'Options must be valid JSON.';
$string['err_avatar_options_load_failed'] = 'Failed to load avatar options.';
$string['err_drop_image_file'] = 'Please drop an image file (PNG/JPG/WEBP).';
$string['err_endpoint_not_configured'] = 'Endpoint URL is not configured.';
$string['err_failed_read_file'] = 'Failed to read file.';
$string['err_failed_read_image_data'] = 'Failed to read image data.';
$string['err_invalid_image_file'] = 'Please choose an image file (PNG/JPG/WEBP).';
$string['err_draft_file_area_unavailable'] = 'Draft file area is not available in this editor. You can still insert the media below.';
$string['err_no_selection'] = 'Please select some text first.';
$string['err_prompt_required'] = 'Please enter a prompt.';
$string['err_interactive_layout_required'] = 'Please choose a layout.';
$string['err_interactive_empty'] = 'Please add at least one section with a title or content.';
$string['err_script_required'] = 'Please enter text in the script box.';
$string['err_prompt_required_or_keep'] = 'Please enter a prompt (or keep a short instruction).';
$string['err_server_copy_media_locally_failed'] = 'Server could not copy media locally.';
$string['err_subscription_credentials_missing'] = 'Subscription Manager API key/secret are required. Ask your admin to create a subscription and copy the API key and API secret here.';
$string['err_upload_image_first'] = 'Please upload an image first.';
$string['err_video_options_load_failed'] = 'Failed to load video generation options.';
$string['err_media_prepare_insert'] = 'Media file could not be prepared. Cannot insert.';
$string['err_media_prepare_replace'] = 'Media file could not be prepared. Cannot replace selection.';
$string['field_avatar_id'] = 'Avatar ID';
$string['field_aspect_ratio'] = 'Aspect ratio';
$string['field_density'] = 'Density';
$string['field_font'] = 'Font';
$string['field_gender'] = 'Gender';
$string['field_infograph_length'] = 'Infograph mode';
$string['field_interactive_layout'] = 'Layout';
$string['field_interactive_sections'] = 'Sections';
$string['field_interactive_style'] = 'Style';
$string['field_language'] = 'Language';
$string['field_language_type'] = 'Language type';
$string['field_max_words'] = 'Maximum amount of words';
$string['field_options'] = 'Options (JSON)';
$string['field_output_format'] = 'Output format';
$string['field_preview'] = 'Input preview';
$string['field_prompt'] = 'Prompt';
$string['field_purpose'] = 'What do you want to do?';
$string['field_resolution'] = 'Resolution';
$string['field_script'] = 'Script';
$string['field_size'] = 'Size';
$string['field_template'] = 'Template';
$string['field_target_language'] = 'Target language';
$string['field_use_generative_image'] = 'Use generative image';
$string['field_video_style_id'] = 'Video style ID';
$string['field_voice'] = 'Voice';
$string['generating'] = 'Generating...';
$string['videogen_loading_start'] = 'Starting video generation…';
$string['videogen_loading_wait'] = 'Please do not cancel. Video generation may take up to 5–10 minutes.';
$string['videogen_loading_script'] = 'Preparing your narration and scenes…';
$string['videogen_loading_images'] = 'Finding or creating images for each scene…';
$string['videogen_loading_voice'] = 'Generating voiceover and timing…';
$string['videogen_loading_render'] = 'Rendering your video — almost there…';
$string['videogen_loading_elapsed'] = 'Elapsed: {$a}';
$string['videogen_loading_status'] = 'Status: {$a}';
$string['videogen_err_job_missing'] = 'Video job started but no job id was returned.';
$string['videogen_err_timeout'] = 'Video generation is still running after a long wait. Please try again in a few minutes.';
$string['generation_time_label'] = 'Generated in';
$string['haccgen_extender:manage'] = 'Manage Haccgen extender settings';
$string['haccgen_extender:use'] = 'Use Haccgen extender in Tiny editor';
$string['loading_opening_tool'] = 'Opening…';
$string['menu_open'] = 'HACC Gen';
$string['menu_tools'] = 'HACC Gen tools';
$string['modal_title'] = 'HACC Gen extender';
$string['no'] = 'No';
$string['option_female'] = 'Female';
$string['option_high'] = 'High';
$string['option_keep_language_type'] = 'Keep language type';
$string['option_male'] = 'Male';
$string['option_medium'] = 'Medium';
$string['option_no_limit'] = 'No limit';
$string['option_interactive_auto'] = 'Auto';
$string['option_interactive_style_clean'] = 'Clean';
$string['option_interactive_style_colorful'] = 'Colorful';
$string['option_long'] = 'Long';
$string['option_summarize'] = 'Summarize';
$string['option_simple_language'] = 'Simple language';
$string['option_technical_language'] = 'Technical language';
$string['placeholder_create_audio_prompt'] = 'Paste or type the text you want to convert to audio (or select text before opening).';
$string['placeholder_create_scenario_prompt'] = 'Describe the context and requirements for the scenario you want to generate.';
$string['placeholder_detailed_description_prompt'] = 'Paste or type the text you want to expand (or select text before opening).';
$string['placeholder_avatar_script'] = 'Example: Welcome! In this lesson we will cover Agile basics. We will start with Scrum roles, then events, then artifacts.';
$string['placeholder_image_generation_prompt'] = 'Describe the image you want to generate...';
$string['placeholder_image_description_prompt'] = 'Describe what is being shown on the image';
$string['placeholder_infograph_prompt'] = 'Example: Create a clean infographic titled "Agile Project Overview" with 4 sections: Principles, Roles, Events, Artifacts. Use blue/white theme.';
$string['placeholder_interactive_html_prompt'] = 'Paste the lesson text to turn into this layout, or select text in the editor first.';
$string['placeholder_options_json'] = '{"tone":"formal"}';
$string['placeholder_summarize_prompt'] = 'Paste or type the text you want to summarize (or select text in the editor before opening).';
$string['placeholder_text_recognition_prompt'] = 'E.g. Extract all text exactly as-is, preserve line breaks.';
$string['placeholder_translate_prompt'] = 'Paste or type the text you want to translate (or select text before opening).';
$string['placeholder_video_prompt'] = 'Describe the video you want to create...';
$string['pluginname'] = 'HACC Gen extender';
$string['privacy:metadata'] = 'The HACC Gen extender plugin does not store any personal data.';
$string['privacy:metadata:external'] = 'The plugin sends data to external AI and subscription services to generate suggestions and validate service access.';
$string['privacy:metadata:external:userid'] = 'The ID of the user making the request.';
$string['privacy:metadata:external:userinput'] = 'Selected editor text and request inputs provided by the user, including remote media URL input when used.';
$string['purpose_avatar_generation_desc'] = 'Generate an avatar from a short description.';
$string['purpose_avatar_generation_label'] = 'Avatar generation';
$string['avatar_gallery_link'] = 'Browse avatars gallery (preview all avatars)';
$string['purpose_create_audio_desc'] = 'Turn selected text into spoken audio.';
$string['purpose_create_audio_label'] = 'Create audio';
$string['purpose_create_scenario_desc'] = 'Generate a textual scenario from your input context.';
$string['purpose_create_scenario_label'] = 'Create scenario';
$string['purpose_detailed_description_desc'] = 'Expand into a clearer, richer explanation.';
$string['purpose_detailed_description_label'] = 'Detailed description';
$string['purpose_image_description_desc'] = 'Describe what is happening in an image.';
$string['purpose_image_description_label'] = 'Image description';
$string['purpose_image_generation_desc'] = 'Generate an image from your text prompt.';
$string['purpose_image_generation_label'] = 'Image generation';
$string['purpose_infograph_image_generation_desc'] = 'Create an infographic-style visual.';
$string['purpose_infograph_image_generation_label'] = 'Infographic image generation';
$string['purpose_interactive_html_generation_desc'] = 'Turn this text into accordion, tabs, FAQ, steps, glossary, and more.';
$string['purpose_interactive_html_generation_label'] = 'Interactive elements';
$string['layout_accordion_label'] = 'Accordion';
$string['layout_accordion_hint'] = 'Expand one topic at a time';
$string['layout_tabs_label'] = 'Tabs';
$string['layout_tabs_hint'] = 'Switch between themes';
$string['layout_faq_label'] = 'FAQ';
$string['layout_faq_hint'] = 'Open answers to questions';
$string['layout_steps_label'] = 'Steps';
$string['layout_steps_hint'] = 'Follow a sequence';
$string['layout_glossary_label'] = 'Glossary';
$string['layout_glossary_hint'] = 'Look up terms and meanings';
$string['layout_timeline_label'] = 'Timeline';
$string['layout_timeline_hint'] = 'See events in order';
$string['layout_comparison_label'] = 'Comparison';
$string['layout_comparison_hint'] = 'Compare options side by side';
$string['layout_callouts_label'] = 'Callouts';
$string['layout_callouts_hint'] = 'Highlight tips and warnings';
$string['layout_cards_label'] = 'Cards';
$string['layout_cards_hint'] = 'Browse topics as cards';
$string['layout_checklist_label'] = 'Checklist';
$string['layout_checklist_hint'] = 'Tick off items as you go';
$string['layout_quiz_label'] = 'Quiz';
$string['layout_quiz_hint'] = 'Check your understanding';
$string['layout_spoiler_label'] = 'Spoiler';
$string['layout_spoiler_hint'] = 'Reveal the answer on click';
$string['interactive_preview_hint'] = 'Click the sections to test them before inserting. Use Edit content to change titles and inner text.';
$string['interactive_editor_title'] = 'Edit interactive element';
$string['interactive_editor_hint'] = 'Edit each section here. Accordion and tab inner text cannot be typed directly in the page editor.';
$string['interactive_editor_add_section'] = 'Add section';
$string['interactive_editor_raw_html'] = 'Edit raw HTML';
$string['interactive_editor_preview'] = 'Preview';
$string['interactive_editor_section_title'] = 'Title';
$string['interactive_editor_section_body'] = 'Content';
$string['interactive_editor_move_up'] = 'Move up';
$string['interactive_editor_move_down'] = 'Move down';
$string['interactive_editor_remove_section'] = 'Remove';
$string['interactive_editor_save'] = 'Save';
$string['purpose_summarize_desc'] = 'Reduce content into key points.';
$string['purpose_summarize_label'] = 'Summarize';
$string['purpose_text_recognition_desc'] = 'Extract readable text from content.';
$string['purpose_text_recognition_label'] = 'Text recognition';
$string['purpose_translate_desc'] = 'Convert content into another language.';
$string['purpose_translate_label'] = 'Translate';
$string['purpose_video_generation_desc'] = 'Generate a short video from text.';
$string['purpose_video_generation_label'] = 'Video generation';
$string['result_dialog_title'] = 'HACC Gen suggestion';
$string['result_shown_in_label'] = 'Result shown in';
$string['select_purpose_to_load_templates'] = 'Select a purpose to load templates.';
$string['setting_allowedpurposes'] = 'Allowed purposes (comma-separated)';
$string['setting_allowedpurposes_desc'] = 'Optional. If set, only these features will be enabled (comma-separated purpose keys). Leave empty to allow all.';
$string['setting_endpointurl'] = 'Endpoint URL';
$string['setting_endpointurl_desc'] = 'Paste the Subscription Manager AI endpoint URL (example: /local/subscription_manager/ai_endpoint.php).';
$string['setting_subscription_api_key'] = 'Subscription Manager API key';
$string['setting_subscription_api_key_desc'] = 'Paste the API key from the Subscription Manager subscription for this LMS.';
$string['setting_subscription_api_secret'] = 'Subscription Manager API secret';
$string['setting_subscription_api_secret_desc'] = 'Paste the API secret from the Subscription Manager subscription for this LMS.';
$string['setting_subscription_credentials_heading'] = 'Where to get API credentials';
$string['setting_subscription_credentials_intro'] = '<div>
    <p>
        To use <strong>HACC Gen extender</strong> with Subscription Manager, generate your
        <strong>API key</strong> and <strong>API secret</strong> from the HACC Gen dashboard (same as for the main HACC Gen plugin).
        For setup help, see the
        <a href="https://docs.google.com/document/d/1f31ttH_NXGp0Suc5JiqLrSkVYNOuoy4XnJb2px0oKUw/edit?usp=sharing" target="_blank" rel="noreferrer noopener">
           installation and setup tutorial
        </a>.
    </p>
    <div>
        <a href="https://subscription.dynamicpixel.co.in/" target="_blank" rel="noreferrer noopener">
            Get API credentials
        </a>
    </div>
</div>';
$string['setting_subscription_usage_desc'] = 'Current usage and limits for this LMS according to Subscription Manager (same credentials as above). Refreshed when you open this page.';
$string['setting_subscription_usage_fetch_failed'] = 'Could not load usage from Subscription Manager.';
$string['setting_subscription_usage_heading'] = 'Subscription usage (this site)';
$string['setting_subscription_usage_hint_old_sm'] = 'Upload the latest local_subscription_manager plugin (includes subscription_usage_endpoint.php and an updated ai_endpoint.php).';
$string['setting_subscription_usage_no_creds'] = 'Save a valid API key and API secret above to load usage.';
$string['setting_subscription_usage_not_sm'] = 'Usage summary is available when the endpoint URL points to Subscription Manager (ai_endpoint.php or subscription_usage_endpoint.php).';
$string['setting_subscription_usage_note'] = 'Figures apply to this site\'s subscription (shared across all editor users), not per individual user.';
$string['setting_timeout'] = 'Timeout (seconds)';
$string['setting_timeout_desc'] = 'How long to wait for a response before failing the request.';
$string['settings'] = 'Settings';
$string['step2_select_template_help'] = 'Choose a template, adjust options, then run.';
$string['template_3d_style'] = '3D style';
$string['template_clean_infographic'] = 'Clean infographic';
$string['template_data_heavy'] = 'Data-heavy';
$string['template_detailed'] = 'Detailed';
$string['template_english_us'] = 'English (US)';
$string['template_executive_summary'] = 'Executive summary';
$string['template_flat_style'] = 'Flat style';
$string['template_hindi_india'] = 'Hindi (India)';
$string['template_infograph_long'] = 'Long infographic';
$string['template_infograph_summarize'] = 'Summarized infographic';
$string['template_illustration'] = 'Illustration';
$string['template_narration'] = 'Narration';
$string['template_plain_text'] = 'Plain text';
$string['template_product_demo'] = 'Product demo';
$string['template_realistic'] = 'Realistic';
$string['template_short'] = 'Short';
$string['template_short_bullets'] = 'Short bullets';
$string['template_slow_clear'] = 'Slow &amp; clear';
$string['template_step_by_step'] = 'Step-by-step';
$string['template_story_style'] = 'Story style';
$string['template_structured'] = 'Structured';
$string['templates_for'] = 'Templates for {$a}';
$string['text_recognition_default_prompt'] = 'Extract all readable text from this file. Preserve line breaks. Output only the extracted text.';
$string['text_recognition_drop_aria'] = 'Drop image here or choose file';
$string['text_recognition_drop_hint'] = 'Drag &amp; drop an image here';
$string['text_recognition_drop_sub'] = 'or click to choose a file (PNG, JPG, JPEG, WEBP)';
$string['usage_col_limit'] = 'Limit';
$string['usage_col_type'] = 'Type';
$string['usage_col_used'] = 'Used';
$string['usage_type_audio'] = 'Audio (seconds)';
$string['usage_type_image'] = 'Images';
$string['usage_type_video'] = 'Video (seconds)';
$string['usage_type_word'] = 'Words (text AI)';
$string['usage_unlimited'] = 'Unlimited';
$string['value_empty'] = '(empty)';
$string['video_generation_subtitle'] = 'Describe the topic and length, then choose how the script, voice, and images should be made.';
$string['video_generation_title'] = 'Generate video from prompt';
$string['field_use_storyboard'] = 'Storyboard mode';
$string['field_race'] = 'People in AI images';
$string['field_image_source'] = 'Scene images';
$string['field_voice_gender'] = 'Narrator gender';
$string['field_native_language'] = 'Narration language';
$string['field_language_code'] = 'Narration locale (advanced)';
$string['field_additional_prompt'] = 'Additional context (optional)';
$string['field_style_instructions'] = 'Delivery style (optional)';
$string['field_external_details_prompt'] = 'Image style (optional)';
$string['placeholder_native_video_prompt'] = 'Example: Explain photosynthesis to a 10 year old, 60 seconds';
$string['placeholder_additional_prompt'] = 'Example: For class 5 students; keep the title simple.';
$string['placeholder_style_instructions'] = 'Example: Speak with curiosity and wonder, like explaining a fun fact to a friend.';
$string['placeholder_external_details_prompt'] = 'Example: cinematic lighting, cartoon illustration style.';
$string['help_video_prompt'] = 'Write the topic and how long the video should be. The length is used to decide how many scenes to create (about 10–20 seconds of narration per scene). Example: "Explain photosynthesis to a 10 year old, 60 seconds".';
$string['help_use_storyboard'] = 'AI storyboard: the system writes the script, scenes, and image prompts from your topic. Use my narration: your text is split on full stops (.) only — each sentence becomes one scene and is spoken exactly as you wrote it.';
$string['help_additional_prompt'] = 'Used only with "Use my narration". Extra context that can help set the video title and who it is for. It is not read aloud.';
$string['help_race'] = 'How people should look in AI-generated scene images. This does not change stock photos, the spoken voice, or captions.';
$string['help_image_source'] = 'Default: try a stock photo for each scene, then generate an AI image only if none is found. AI-generated only: skip stock photos and illustrate every scene — better for abstract topics or a consistent drawn style.';
$string['help_native_language'] = 'The language the narrator speaks. Leave Default for Indian English. This does not change any text that appears inside AI-generated pictures.';
$string['help_voice_gender'] = 'Choose a male or female narrator. Default uses the platform voice. This only affects speech, not the images.';
$string['help_style_instructions'] = 'Optional direction for how the narrator should sound — tone, pace, and energy. This does not change the pictures.';
$string['help_external_details_prompt'] = 'Optional art direction for AI-generated scene images, such as lighting or illustration style. Ignored for stock photos and does not change the spoken narration.';
$string['yes'] = 'Yes';

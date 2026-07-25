"""Hardcoded per-platform DMCA metadata (IMPLEMENTATION.md §5)."""

PLATFORM_TEMPLATES = {
    "YouTube": {
        "required_fields": ["video_url", "channel_name", "timestamp_of_infringement"],
        "submission_method": "Web form (copyright.youtube.com)",
    },
    "X": {
        "required_fields": ["tweet_url", "handle", "media_type"],
        "submission_method": "Web form (help.x.com/forms/dmca)",
    },
    "Instagram": {
        "required_fields": ["post_or_reel_url", "username", "media_type"],
        "submission_method": "Web form (help.instagram.com — Meta IP reporting form)",
    },
}

PLATFORMS = list(PLATFORM_TEMPLATES.keys())

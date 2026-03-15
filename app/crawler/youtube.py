"""
YouTube Data API v3 client for fetching Cracking the Cryptic videos.
"""

import os
import re
from datetime import UTC, datetime

from googleapiclient.discovery import build


def _iso_to_seconds(duration: str) -> int | None:
    """Convert ISO 8601 duration (PT1H23M45S) to total seconds."""
    if not duration:
        return None
    pattern = re.compile(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", re.IGNORECASE)
    m = pattern.match(duration)
    if not m:
        return None
    hours = int(m.group(1) or 0)
    minutes = int(m.group(2) or 0)
    seconds = int(m.group(3) or 0)
    return hours * 3600 + minutes * 60 + seconds


class YouTubeClient:
    def __init__(self, api_key: str | None = None):
        key = api_key or os.environ["YOUTUBE_API_KEY"]
        self._yt = build("youtube", "v3", developerKey=key)

    # ------------------------------------------------------------------
    # Channel helpers
    # ------------------------------------------------------------------

    def get_uploads_playlist_id(self, channel: str) -> str:
        """Return the uploads playlist ID for a channel.

        `channel` can be a channel ID (e.g. 'UCxxxx') or a handle (e.g. '@crackingthecryptic').
        """
        if channel.startswith("@"):
            params = {"part": "contentDetails", "forHandle": channel}
        else:
            params = {"part": "contentDetails", "id": channel}
        resp = self._yt.channels().list(**params).execute()
        items = resp.get("items", [])
        if not items:
            raise ValueError(f"Channel not found: {channel}")
        return items[0]["contentDetails"]["relatedPlaylists"]["uploads"]

    # ------------------------------------------------------------------
    # Video listing
    # ------------------------------------------------------------------

    def get_video_ids(
        self,
        channel: str,
        published_after: datetime | None = None,
        max_results: int | None = None,
    ) -> list[str]:
        """
        Return a list of video IDs from the channel's uploads playlist,
        optionally filtered to videos published after `published_after`.
        """
        playlist_id = self.get_uploads_playlist_id(channel)
        video_ids: list[str] = []
        page_token = None

        while True:
            params: dict = {
                "part": "snippet",
                "playlistId": playlist_id,
                "maxResults": 50,
            }
            if page_token:
                params["pageToken"] = page_token

            resp = self._yt.playlistItems().list(**params).execute()

            for item in resp.get("items", []):
                snippet = item["snippet"]
                published_str = snippet.get("publishedAt", "")
                if published_after and published_str:
                    pub = datetime.fromisoformat(published_str.replace("Z", "+00:00"))
                    if pub < published_after.replace(tzinfo=UTC):
                        # Playlist is newest-first; stop when we pass the cutoff
                        return video_ids
                vid_id = snippet.get("resourceId", {}).get("videoId")
                if vid_id:
                    video_ids.append(vid_id)

            if max_results and len(video_ids) >= max_results:
                return video_ids[:max_results]

            page_token = resp.get("nextPageToken")
            if not page_token:
                break

        return video_ids

    # ------------------------------------------------------------------
    # Playlist helpers
    # ------------------------------------------------------------------

    def get_channel_playlists(self, channel_id: str) -> list[dict]:
        """Return list of {id, title} for all public playlists in the channel."""
        playlists = []
        page_token = None
        while True:
            params: dict = {
                "part": "snippet",
                "channelId": channel_id,
                "maxResults": 50,
            }
            if page_token:
                params["pageToken"] = page_token
            resp = self._yt.playlists().list(**params).execute()
            for item in resp.get("items", []):
                playlists.append(
                    {
                        "id": item["id"],
                        "title": item["snippet"]["title"],
                    }
                )
            page_token = resp.get("nextPageToken")
            if not page_token:
                break
        return playlists

    def get_playlist_video_ids(self, playlist_id: str) -> list[str]:
        """Return all video IDs in a playlist."""
        video_ids: list[str] = []
        page_token = None
        while True:
            params: dict = {
                "part": "snippet",
                "playlistId": playlist_id,
                "maxResults": 50,
            }
            if page_token:
                params["pageToken"] = page_token
            resp = self._yt.playlistItems().list(**params).execute()
            for item in resp.get("items", []):
                vid_id = item["snippet"].get("resourceId", {}).get("videoId")
                if vid_id:
                    video_ids.append(vid_id)
            page_token = resp.get("nextPageToken")
            if not page_token:
                break
        return video_ids

    # ------------------------------------------------------------------
    # Video detail fetching
    # ------------------------------------------------------------------

    def get_video_details(self, video_ids: list[str]) -> list[dict]:
        """
        Fetch full details for up to 50 video IDs at a time.
        Returns a list of normalized dicts ready for DB insertion.
        """
        if not video_ids:
            return []

        results = []
        # API allows max 50 IDs per request
        for i in range(0, len(video_ids), 50):
            batch = video_ids[i : i + 50]
            resp = (
                self._yt.videos()
                .list(
                    part="snippet,contentDetails,statistics",
                    id=",".join(batch),
                )
                .execute()
            )
            for item in resp.get("items", []):
                results.append(self._normalize(item))

        return results

    def _normalize(self, item: dict) -> dict:
        """Extract the fields we care about from a raw API response item."""
        snippet = item.get("snippet", {})
        content = item.get("contentDetails", {})
        stats = item.get("statistics", {})

        published_str = snippet.get("publishedAt", "")
        published_at = (
            datetime.fromisoformat(published_str.replace("Z", "+00:00")) if published_str else None
        )

        thumbs = snippet.get("thumbnails", {})
        thumbnail_url = thumbs.get("maxres", thumbs.get("high", thumbs.get("medium", {}))).get(
            "url"
        )

        return {
            "youtube_id": item["id"],
            "title": snippet.get("title", ""),
            "description": snippet.get("description", ""),
            "published_at": published_at,
            "duration_seconds": _iso_to_seconds(content.get("duration", "")),
            "view_count": int(stats.get("viewCount", 0)),
            "like_count": int(stats.get("likeCount", 0)),
            "comment_count": int(stats.get("commentCount", 0)),
            "thumbnail_url": thumbnail_url,
        }

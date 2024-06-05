# based on https://github.com/langchain-ai/langchain/blob/master/libs/langchain/langchain/schema/document.py

from __future__ import annotations

import asyncio
from abc import ABC, abstractmethod
from functools import partial
from typing import Any, Literal, Sequence, List, Optional
from datetime import datetime

from langchain.load.serializable import Serializable
from langchain.pydantic_v1 import Field


class Post(Serializable):
    """Class for storing a piece of text and associated metadata."""

    author: str
    """Post author name."""
    content: str
    """String text."""
    url: str
    """URL of the post."""
    created_at: datetime = Field(default=None)
    """Publishing date for the post."""
    metadata: dict = Field(default_factory=dict)
    """
    Arbitrary metadata about the post content (e.g., source, relationships to other
        documents, etc.).
    """
    source_network: str = Field(default="unkown")
    """Social media network this post is sourced from (e.g., mastodon, twitter)."""
    type: Literal["Post"] = "Post"
    is_reply: bool = Field(default=False)
    """Is this post a reply to another post."""
    is_repost: bool = Field(default=False)
    """Is this post a repost (retweet) of another post."""

    @classmethod
    def is_lc_serializable(cls) -> bool:
        """Return whether this class is serializable."""
        return True


class RefPost(Post):
    """
    Post that contains a reference to at least one other URL external to the post.
    """

    ref_urls: List[str] = Field(default_factory=list)
    """
    List of URLs referenced by the post
    """

    quoted_url: Optional[str]
    """
    URL of post quoted by this post (for platforms that enable quote tweets)
    """

    type: Literal["ReferencePost"] = "ReferencePost"

    def has_refs(self):
        return len(self.ref_urls) > 0


class QuoteRefPost(RefPost):
    """
    RefPost that optionally quotes another post (like a quote tweet)
    """

    type: Literal["QuoteRefPost"] = "QuoteRefPost"

    quoted_post: Optional[RefPost]
    """
    Other post that is quoted by this post
    """

    @property
    def is_quote_post(self) -> bool:
        return self.quoted_post is not None

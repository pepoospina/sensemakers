from typing import Optional, List, Dict, TypedDict, Union, Any
from pydantic import (
    BaseModel,
    Field,
)

from ..interface import ParsePostRequest, ThreadPostInterface
from ..schema.post import ThreadRefPost, RefPost, QuoteRefPost
from ..utils import (
    remove_dups_ordered,
    find_last_occurence_of_any,
    extract_and_expand_urls,
    extract_external_urls_from_status_tweet,
)


def convert_thread_interface_to_ref_post(
    thread_interface: ThreadPostInterface,
) -> ThreadRefPost:
    """_summary_

    Args:
        thread_interface (ThreadPostInterface): _description_

    Returns:
        ThreadRefPost: _description_
    """

    thread_posts_content = thread_interface.content.split("\n---\n")

    # create dict of quote posts keyed by url
    converted_quoted_posts = [
        RefPost.from_basic_post_interface(post) for post in thread_interface.quotedPosts
    ]
    quote_post_dict = {p.url: p for p in converted_quoted_posts}

    # for collecting all ref urls in thread
    all_ref_urls = []

    # create QuoteRefPosts from each post in thread
    quote_ref_posts = []

    for post_content in thread_posts_content:
        quoted_post_url = find_last_occurence_of_any(
            post_content, quote_post_dict.keys()
        )
        quoted_post = quote_post_dict.get(quoted_post_url, None)

        # TODO should be replaced with tweet url when we have it!
        url = thread_interface.url

        ref_urls = extract_external_urls_from_status_tweet(url, post_content)

        quote_ref_post = QuoteRefPost(
            author=thread_interface.author.name,
            url=url,
            content=post_content,
            ref_urls=ref_urls,
            quoted_post=quoted_post,
        )
        quote_ref_posts.append(quote_ref_post)

        all_ref_urls += ref_urls

    thread_ref_post = ThreadRefPost(
        author=thread_interface.author.name,
        url=thread_interface.url,
        content=thread_interface.content,
        source_network=thread_interface.author.platformId,
        ref_urls=all_ref_urls,
        posts=quote_ref_posts,
    )
    return thread_ref_post


class PreprocParsePostRequest(BaseModel):
    post_to_parse: ThreadRefPost = Field(
        description="Post in input format for parser after preprocessing"
    )
    unparsed_urls: List[str] = Field(
        description="URLs that will not be parsed (eg exceeded thread length limit)"
    )


def preproc_parse_post_request(
    parse_request: ParsePostRequest,
    max_posts: int = 10,
) -> PreprocParsePostRequest:
    """
    Prepare an app post request for input to the parser.
    Includes trimming long threads while preserving all reference urls.

    Args:
        parse_request (ParsePostRequest): input request from app
        max_posts (int): max number of posts in thread to parse

    Returns:
        PreprocParsePostRequest: Prepared input for parser
    """

    # trim thread to `max_post` length

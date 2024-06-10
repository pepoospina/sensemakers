import sys
from pathlib import Path

ROOT = Path(__file__).parents[1]
sys.path.append(str(ROOT))

# https://stackoverflow.com/a/63539722/2882125
import nest_asyncio

nest_asyncio.apply()

from desci_sense.shared_functions.dataloaders import scrape_post
from desci_sense.shared_functions.web_extractors.metadata_extractors import (
    extract_posts_ref_metadata_dict,
    get_ref_post_metadata_list,
    RefMetadata,
)
from desci_sense.shared_functions.prompting.post_renderers import RefPostRenderer
from desci_sense.shared_functions.configs import MetadataExtractionType
from desci_sense.shared_functions.dataloaders import (
    scrape_post,
    convert_text_to_ref_post,
)
from desci_sense.shared_functions.parsers.multi_reference_tagger import normalize_labels
from desci_sense.shared_functions.postprocessing import Answer, SubAnswer
from utils import create_multi_chain_for_tests, create_multi_config_for_tests
from desci_sense.shared_functions.parsers.multi_chain_parser import MultiChainParser
from desci_sense.shared_functions.schema.ontology_base import OntologyBase
from desci_sense.shared_functions.configs import (
    OpenrouterAPIConfig,
    WandbConfig,
    LLMConfig,
    KeywordPParserChainConfig,
    RefTaggerChainConfig,
    TopicsPParserChainConfig,
    validate_env_var,
    MetadataExtractionConfig,
    MultiParserChainConfig,
    MultiRefTaggerChainConfig,
    ParserChainType,
    PostProcessType,
)  # Adjust the import as necessary
from desci_sense.shared_functions.dataloaders import (
    scrape_post,
    convert_text_to_ref_post,
)
from desci_sense.shared_functions.parsers.multi_reference_tagger import normalize_labels
from desci_sense.shared_functions.postprocessing import Answer, SubAnswer


TEST_POST_TEXT_W_REF = """I really liked this paper!
https://arxiv.org/abs/2402.04607
"""

TEST_POST_TEXT_W_NO_REFS = """These 2 papers are highly recommended!
"""

TEST_POST_TEXT_W_2_REFS = """These 2 papers are highly recommended!
https://arxiv.org/abs/2402.04607
https://royalsocietypublishing.org/doi/10.1098/rstb.2022.0267
"""

RENDER_NO_REF_TEST_RESULT = """
- Author: Seeds of Science
- Content: Seeds of Science would like to announce the SoS Research Collective - a first-of-its-kind virtual organization for independent researchers (and academics thinking independently). See the announcement post for more info! 

https://www.theseedsofscience.pub/p/announcing-the-sos-research-collective
- References:
1: https://www.theseedsofscience.pub/p/announcing-the-sos-research-collective
Item type: webpage
Title: Announcing the SoS Research Collective
Summary: + offering paid subscriptions (author: Roger's Bacon)
------------------
"""

RENDER_TARGET_MULTI_REF = "\n- Author: default_author\n- Content: These 2 papers are highly recommended!\nhttps://arxiv.org/abs/2402.04607\nhttps://royalsocietypublishing.org/doi/10.1098/rstb.2022.0267\n\n- References:\n1: https://arxiv.org/abs/2402.04607\nItem type: preprint\nTitle: Google Scholar is manipulatable\nSummary: Citations are widely considered in scientists' evaluation. As such, scientists may be incentivized to inflate their citation counts. While previous literature has examined self-citations and citation cartels, it remains unclear whether scientists can purchase citations. Here, we compile a dataset of ~1.6 million profiles on Google Scholar to examine instances of citation fraud on the platform. We survey faculty at highly-ranked universities, and confirm that Google Scholar is widely used when ev\n------------------\n2: https://royalsocietypublishing.org/doi/10.1098/rstb.2022.0267\nItem type: journalArticle\nTitle: Reducing global inequality increases local cooperation: a simple model of group selection with a global externality\nSummary: \n------------------\n"

RENDER_TARGET_KW = "- Content: I really liked this paper!\nhttps://arxiv.org/abs/2402.04607\n\n- References:\n1: https://arxiv.org/abs/2402.04607\nItem type: preprint\nTitle: Google Scholar is manipulatable\nSummary: Citations are widely considered in scientists' evaluation. As such, scientists may be incentivized to inflate their citation counts. While previous literature has examined self-citations and citation cartels, it remains unclear whether scientists can purchase citations. Here, we compile a dataset of ~1.6 million profiles on Google Scholar to examine instances of citation fraud on the platform. We survey faculty at highly-ranked universities, and confirm that Google Scholar is widely used when ev\n------------------\n"

RENDER_TARGET_TOPICS = "- Content: I really liked this paper!\nhttps://arxiv.org/abs/2402.04607\n\n- References:\n1: https://arxiv.org/abs/2402.04607\nItem type: preprint\nTitle: Google Scholar is manipulatable\nSummary: Citations are widely considered in scientists' evaluation. As such, scientists may be incentivized to inflate their citation counts. While previous literature has examined self-citations and citation cartels, it remains unclear whether scientists can purchase citations. Here, we compile a dataset of ~1.6 million profiles on Google Scholar to examine instances of citation fraud on the platform. We survey faculty at highly-ranked universities, and confirm that Google Scholar is widely used when ev\n------------------\n"


def test_ref_render_1():
    tweet_url = "https://x.com/science_seeds/status/1752087818099159338"
    quote_ref_post = scrape_post(tweet_url)
    md_dict = extract_posts_ref_metadata_dict([quote_ref_post])
    md_list = get_ref_post_metadata_list(quote_ref_post, md_dict)
    ref_post_renderer = RefPostRenderer()
    rendered = ref_post_renderer.render(quote_ref_post, md_list)
    assert rendered == RENDER_NO_REF_TEST_RESULT


def test_ref_render_no_refs():
    ref_post = convert_text_to_ref_post(TEST_POST_TEXT_W_NO_REFS)
    md_dict = extract_posts_ref_metadata_dict([ref_post])
    md_list = get_ref_post_metadata_list(ref_post, md_dict)
    ref_post_renderer = RefPostRenderer()
    rendered = ref_post_renderer.render(ref_post, md_list)
    target = "\n- Author: default_author\n- Content: These 2 papers are highly recommended!\n"
    assert rendered == target


def test_ref_render_single_ref():
    ref_post = convert_text_to_ref_post(TEST_POST_TEXT_W_REF)
    md_dict = extract_posts_ref_metadata_dict([ref_post])
    md_list = get_ref_post_metadata_list(ref_post, md_dict)
    ref_post_renderer = RefPostRenderer()
    rendered = ref_post_renderer.render(ref_post, md_list)
    target = "\n- Author: default_author\n- Content: I really liked this paper!\nhttps://arxiv.org/abs/2402.04607\n\n- References:\n1: https://arxiv.org/abs/2402.04607\nItem type: preprint\nTitle: Google Scholar is manipulatable\nSummary: Citations are widely considered in scientists' evaluation. As such, scientists may be incentivized to inflate their citation counts. While previous literature has examined self-citations and citation cartels, it remains unclear whether scientists can purchase citations. Here, we compile a dataset of ~1.6 million profiles on Google Scholar to examine instances of citation fraud on the platform. We survey faculty at highly-ranked universities, and confirm that Google Scholar is widely used when ev\n------------------\n"
    assert rendered == target


def test_ref_render_multi_ref():
    ref_post = convert_text_to_ref_post(TEST_POST_TEXT_W_2_REFS)
    md_dict = extract_posts_ref_metadata_dict([ref_post])
    md_list = get_ref_post_metadata_list(ref_post, md_dict)
    ref_post_renderer = RefPostRenderer()
    rendered = ref_post_renderer.render(ref_post, md_list)
    target = RENDER_TARGET_MULTI_REF
    assert rendered == target


def test_ref_renderer_in_parser():
    ref_post = convert_text_to_ref_post(TEST_POST_TEXT_W_2_REFS)
    md_dict = extract_posts_ref_metadata_dict([ref_post])
    multi_config = MultiParserChainConfig(
        parser_configs=[
            MultiRefTaggerChainConfig(
                name="multi_ref_tagger",
                llm_config=LLMConfig(llm_type="mistralai/mistral-7b-instruct:free"),
            )
        ],
        metadata_extract_config=MetadataExtractionConfig(extraction_method="citoid"),
    )
    mcp = MultiChainParser(multi_config)
    prompt = mcp.instantiate_prompts(ref_post, md_dict)
    assert RENDER_TARGET_MULTI_REF in prompt["multi_ref_tagger_input"]


def test_kw_ref_post_render():
    multi_config = MultiParserChainConfig(
        parser_configs=[
            KeywordPParserChainConfig(
                name="keywords",
                llm_config=LLMConfig(llm_type="mistralai/mistral-7b-instruct:free"),
            )
        ],
        metadata_extract_config=MetadataExtractionConfig(extraction_method="citoid"),
    )
    mcp = MultiChainParser(multi_config)
    ref_post = convert_text_to_ref_post(TEST_POST_TEXT_W_REF)
    md_dict = extract_posts_ref_metadata_dict([ref_post])
    prompt = mcp.instantiate_prompts(ref_post, md_dict)
    kw_prompt = prompt["keywords_input"]
    assert RENDER_TARGET_KW in kw_prompt
    assert "- Author:" not in kw_prompt


def test_topics_ref_post_render():
    multi_config = MultiParserChainConfig(
        parser_configs=[
            TopicsPParserChainConfig(
                name="topics",
                llm_config=LLMConfig(llm_type="mistralai/mistral-7b-instruct:free"),
            )
        ],
        metadata_extract_config=MetadataExtractionConfig(extraction_method="citoid"),
    )
    mcp = MultiChainParser(multi_config)
    ref_post = convert_text_to_ref_post(TEST_POST_TEXT_W_REF)
    md_dict = extract_posts_ref_metadata_dict([ref_post])
    prompt = mcp.instantiate_prompts(ref_post, md_dict)
    topics_prompt = prompt["topics_input"]
    assert RENDER_TARGET_TOPICS in topics_prompt
    assert "- Author:" not in topics_prompt


if __name__ == "__main__":
    multi_config = MultiParserChainConfig(
        parser_configs=[
            TopicsPParserChainConfig(
                name="topics",
                llm_config=LLMConfig(llm_type="mistralai/mistral-7b-instruct:free"),
            )
        ],
        metadata_extract_config=MetadataExtractionConfig(extraction_method="citoid"),
    )
    mcp = MultiChainParser(multi_config)
    ref_post = convert_text_to_ref_post(TEST_POST_TEXT_W_REF)
    md_dict = extract_posts_ref_metadata_dict([ref_post])
    prompt = mcp.instantiate_prompts(ref_post, md_dict)
    topics_prompt = prompt["topics_input"]
    assert RENDER_TARGET_TOPICS in topics_prompt
    assert "- Author:" not in topics_prompt

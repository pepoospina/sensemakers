import sys
from pathlib import Path
from confection import Config

ROOT = Path(__file__).parents[1]
sys.path.append(str(ROOT))

from desci_sense.runner import load_config
from desci_sense.shared_functions.postprocessing.output_parsers import (
    extract_unique_keywords,
)
from desci_sense.shared_functions.interface import ParserResult
from utils import default_init_parser_config
from desci_sense.shared_functions.parsers.firebase_api_parser import (
    FirebaseAPIParser,
    PromptCase,
)
from desci_sense.shared_functions.prompting.jinja.topics_template import ALLOWED_TOPICS
from desci_sense.shared_functions.dataloaders import (
    scrape_post,
    convert_text_to_ref_post,
)

TEST_POST_TEXT_W_REF = """
I really liked this paper!
https://arxiv.org/abs/2402.04607
"""

# def test_parallel_kw_parse_result():
#     config = default_init_parser_config()
#     parser = FirebaseAPIParser(config=config)
#     parser.set_md_extract_method("citoid")
#     result = parser.process_text_parallel(TEST_POST_TEXT_W_REF)
#     result_dict = result.model_dump()
#     result_2 = ParserResult.model_validate(result_dict)
#     assert "semantics" in result_dict
#     assert "semantics" in result_2.model_dump()


# def test_parallel_keywords():
#     config = default_init_parser_config()
#     parser = FirebaseAPIParser(config=config)
#     parser.set_md_extract_method("citoid")
#     post = convert_text_to_ref_post(TEST_POST_TEXT_W_REF)
#     combined = parser.process_ref_post_parallel(post)
#     assert len(combined["keywords"]["answer"]["valid_keywords"]) > 0


def test_parse_topics_post():
    url = "https://mastodon.social/@psmaldino@qoto.org/111405098400404613"
    config = default_init_parser_config()
    parser = FirebaseAPIParser(config=config)
    post = scrape_post(url)
    result = parser.extract_topics_w_metadata(post)
    assert len(result["answer"]["multi_tag"]) > 0
    assert set(result["answer"]["allowed_tags"]) == set(ALLOWED_TOPICS)


# def test_multi_ref_post():
#     url = "https://twitter.com/Elinor_Carmi/status/1768238325020659885"
#     config = default_init_parser_config()
#     parser = FirebaseAPIParser(config=config)
#     parser.set_md_extract_method("citoid")
#     post = scrape_post(url)
#     result = parser.extract_post_topics_w_metadata(post)
#     assert "valid_keywords" in result["answer"]


# def test_parse_masto():
#     config_path = ROOT / "tests/etc/configs/notion_dev.cfg"
#     config = Config().from_disk(str(config_path))
#     url = "https://mastodon.social/@psmaldino@qoto.org/111405098400404613"
#     parser = MultiStageParser(config=config)
#     result = parser.kw_process_post(url)
#     assert "valid_keywords" in result["answer"]


# def test_parse_no_ref_masto():
#     config_path = ROOT / "tests/etc/configs/notion_dev.cfg"
#     config = Config().from_disk(str(config_path))
#     url = "https://mastodon.social/@natematias@social.coop/111410981466531543"
#     parser = MultiStageParser(config=config)
#     result = parser.kw_process_post(url)
#     assert "valid_keywords" in result["answer"]


# def test_parse_masto_no_citoid():
#     config_path = ROOT / "tests/etc/configs/notion_dev.cfg"
#     config = Config().from_disk(str(config_path))
#     config["keyword_extraction"]["ref_metadata_method"] = "none"
#     url = "https://mastodon.social/@psmaldino@qoto.org/111405098400404613"
#     parser = MultiStageParser(config=config)
#     result = parser.kw_process_post(url)
#     assert "valid_keywords" in result["answer"]


if __name__ == "__main__":
    test_str = "#AI, #Web3, #AI"
    kws = extract_unique_keywords(test_str)

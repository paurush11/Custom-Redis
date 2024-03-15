const { commandList, keywordList, ClusterKeywordList, ResponseKeywordList, SentinelKeywordList } = require("./Utils/constants");
const { createEnum } = require("./Utils/createEnum");

const COMMAND_NAMES = commandList.split(",");
const KEYWORDS_NAMES = keywordList.split(",");
const SENTINEL_KEYWORD_NAMES = SentinelKeywordList.split(",");
const RESPONSE_KEYWORD_NAMES = ResponseKeywordList.split(",");
const CLUSTER_KEYWORD_NAMES = ClusterKeywordList.split(",");


const COMMANDS = createEnum(...COMMAND_NAMES);
const KEYWORDS = createEnum(...KEYWORDS_NAMES);
const SENTINEL_KEYWORD = createEnum(...SENTINEL_KEYWORD_NAMES);
const RESPONSE_KEYWORD = createEnum(...RESPONSE_KEYWORD_NAMES);
const CLUSTER_KEYWORD = createEnum(...CLUSTER_KEYWORD_NAMES);

module.exports = {
    COMMANDS,
    KEYWORDS,
    SENTINEL_KEYWORD,
    RESPONSE_KEYWORD,
    CLUSTER_KEYWORD
}
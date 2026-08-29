"""Module 5 - Technical Interview problem bank.

Hardcoded for now (expand later). Swapping this out for a real datastore
down the line shouldn't require touching the router, since it only ever
imports PROBLEMS.

All problems, wording, and examples here are written from scratch for this
project - classic well-known problem *types* (an array pair-sum problem, a
string-manipulation problem, a recursion problem, ...), not copied from any
site.

## topic / companies

`topic` is a single primary category (Arrays, Strings, Trees, ...) used for
the Technical Interview page's topic filter. `companies` is a list of
company names a problem is tagged as commonly asked at - purely a
discovery/filtering label (see the frontend's company filter), not sourced
from any particular company's actual interview bank.

## Data-structure problems without real data-structure objects

The judge harness (see execute.py) builds each test case's local namespace
by exec'ing the `input` string as plain Python assignment statements, then
calls the function with those names as keyword arguments. That only works
for values with a literal Python representation (lists, strings, ints,
bools, None, and dicts) - there's no way to hand a submission a live
LinkedList or TreeNode object built out of a custom class.

So "Linked List" and "Tree" problems here use the standard array
serializations instead: a linked list is just a plain list of values, and a
binary tree is a flat level-order list with `None` marking a missing child
(the same serialization LeetCode uses for tree problems) - the function
operates on that array representation directly rather than on node objects.
This is a deliberate, documented simplification, not an oversight.

## Judging problems with more than one valid answer

The judge compares actual vs. expected output by structural JSON equality
(see execute.py's _values_equal) - it has no way to recognize "a
differently-ordered but still correct" answer as correct. Every problem
below is therefore worded to pin down exactly one correct output per input
(e.g. Group Anagrams spells out the required group/word ordering) rather
than leaving output order unconstrained the way some of these problem
*types* conventionally do elsewhere.
"""

from pydantic import BaseModel


class Example(BaseModel):
    input: str
    output: str
    explanation: str = ""


class TestCase(BaseModel):
    input: str
    expected_output: str


class Problem(BaseModel):
    id: str
    title: str
    difficulty: str  # "Easy" | "Medium" | "Hard"
    topic: str
    companies: list[str] = []
    description: str
    constraints: list[str]
    examples: list[Example]
    visible_test_cases: list[TestCase]
    hidden_test_cases: list[TestCase]
    function_name: str
    stub: str


PROBLEMS: list[Problem] = [
    Problem(
        id="pair-with-target-sum",
        title="Pair With Target Sum",
        difficulty="Easy",
        topic="Arrays",
        companies=["Amazon", "Google"],
        description=(
            "You're given a list of integers and a target value. Find the "
            "indices of the two numbers in the list that add up to the "
            "target and return them as a two-element list, smaller index "
            "first. You may assume each input has exactly one valid pair, "
            "and you can't use the same element twice."
        ),
        constraints=[
            "2 <= nums.length <= 10^4",
            "-10^9 <= nums[i] <= 10^9",
            "-10^9 <= target <= 10^9",
            "Exactly one valid pair exists for each input",
        ],
        examples=[
            Example(
                input="nums = [2, 7, 11, 15], target = 9",
                output="[0, 1]",
                explanation="nums[0] + nums[1] = 2 + 7 = 9",
            ),
            Example(
                input="nums = [3, 2, 4], target = 6",
                output="[1, 2]",
                explanation="nums[1] + nums[2] = 2 + 4 = 6",
            ),
        ],
        visible_test_cases=[
            TestCase(input="nums = [2, 7, 11, 15], target = 9", expected_output="[0, 1]"),
            TestCase(input="nums = [3, 2, 4], target = 6", expected_output="[1, 2]"),
        ],
        hidden_test_cases=[
            TestCase(input="nums = [-3, 4, 3, 90], target = 0", expected_output="[0, 2]"),
            TestCase(input="nums = [1, 1], target = 2", expected_output="[0, 1]"),
            TestCase(input="nums = [5, -2, 9, 14, 3], target = 12", expected_output="[1, 3]"),
        ],
        function_name="solve",
        stub="def solve(nums, target):\n    pass\n",
    ),
    Problem(
        id="run-length-compress",
        title="Run-Length Compress",
        difficulty="Easy",
        topic="Strings",
        companies=["Microsoft"],
        description=(
            "Write a function that compresses a string by collapsing each "
            "consecutive run of the same character into that character "
            "followed by the run's length (e.g. 'aaaa' becomes 'a4'). If "
            "the compressed string would not end up strictly shorter than "
            "the original, return the original string unchanged instead."
        ),
        constraints=[
            "1 <= s.length <= 10^5",
            "s consists of uppercase and lowercase English letters only",
        ],
        examples=[
            Example(
                input='s = "aaaabbbcc"',
                output='"a4b3c2"',
                explanation=(
                    "'aaaa' -> 'a4', 'bbb' -> 'b3', 'cc' -> 'c2'. The compressed "
                    "form is 6 characters, shorter than the original 9, so it's "
                    "returned."
                ),
            ),
            Example(
                input='s = "abcd"',
                output='"abcd"',
                explanation=(
                    "No repeated runs, so the compressed form ('a1b1c1d1', 8 "
                    "characters) would be longer than the original (4 "
                    "characters) - return the original unchanged."
                ),
            ),
        ],
        visible_test_cases=[
            TestCase(input='s = "aaaabbbcc"', expected_output='"a4b3c2"'),
            TestCase(input='s = "abcd"', expected_output='"abcd"'),
        ],
        hidden_test_cases=[
            TestCase(input='s = "aaaaaaaaaa"', expected_output='"a10"'),
            TestCase(input='s = "a"', expected_output='"a"'),
            TestCase(input='s = "aabbaabb"', expected_output='"aabbaabb"'),
        ],
        function_name="solve",
        stub="def solve(s):\n    pass\n",
    ),
    Problem(
        id="staircase-ways",
        title="Staircase Ways",
        difficulty="Medium",
        topic="Recursion & DP",
        companies=["Apple"],
        description=(
            "You're climbing a staircase with n steps. From any step you "
            "can advance 1, 2, or 3 steps at a time. Write a recursive "
            "function that returns the number of distinct move sequences "
            "that land exactly on the top step."
        ),
        constraints=[
            "0 <= n <= 35",
            "Solve it recursively (add memoization if needed to keep it efficient)",
        ],
        examples=[
            Example(
                input="n = 3",
                output="4",
                explanation="The four sequences are [1,1,1], [1,2], [2,1], and [3].",
            ),
            Example(
                input="n = 4",
                output="7",
                explanation="Sequences: [1,1,1,1], [1,1,2], [1,2,1], [2,1,1], [2,2], [1,3], [3,1].",
            ),
        ],
        visible_test_cases=[
            TestCase(input="n = 3", expected_output="4"),
            TestCase(input="n = 4", expected_output="7"),
        ],
        hidden_test_cases=[
            TestCase(input="n = 0", expected_output="1"),
            TestCase(input="n = 1", expected_output="1"),
            TestCase(input="n = 10", expected_output="274"),
        ],
        function_name="solve",
        stub="def solve(n):\n    pass\n",
    ),
    Problem(
        id="valid-parentheses",
        title="Valid Parentheses",
        difficulty="Easy",
        topic="Stacks & Queues",
        companies=["Google", "Meta"],
        description=(
            "Given a string containing just the characters '(', ')', '[', "
            "']', '{' and '}', determine whether it is valid: every "
            "opening bracket must be closed by the same type of bracket, "
            "and in the correct order. Return true if the string is valid, "
            "false otherwise."
        ),
        constraints=[
            "0 <= s.length <= 10^4",
            "s consists only of the characters '()[]{}'",
        ],
        examples=[
            Example(
                input='s = "()[]{}"',
                output="true",
                explanation="Each bracket type is opened and closed in order.",
            ),
            Example(
                input='s = "(]"',
                output="false",
                explanation="'(' is closed by ']', which doesn't match.",
            ),
        ],
        visible_test_cases=[
            TestCase(input='s = "()[]{}"', expected_output="true"),
            TestCase(input='s = "(]"', expected_output="false"),
        ],
        hidden_test_cases=[
            TestCase(input='s = "([{}])"', expected_output="true"),
            TestCase(input='s = ""', expected_output="true"),
            TestCase(input='s = "((("', expected_output="false"),
        ],
        function_name="solve",
        stub="def solve(s):\n    pass\n",
    ),
    Problem(
        id="majority-element",
        title="Majority Element",
        difficulty="Easy",
        topic="Arrays",
        companies=["Amazon"],
        description=(
            "Given a list of integers of length n, return the majority "
            "element - the value that appears more than n // 2 times. You "
            "may assume the input always has a majority element. Aim for "
            "O(n) time and O(1) extra space."
        ),
        constraints=[
            "1 <= nums.length <= 5 * 10^4",
            "-2^31 <= nums[i] <= 2^31 - 1",
            "A majority element always exists in the input",
        ],
        examples=[
            Example(
                input="nums = [3, 2, 3]",
                output="3",
                explanation="3 appears twice out of three elements - more than 3 // 2 = 1 times.",
            ),
            Example(
                input="nums = [2, 2, 1, 1, 1, 2, 2]",
                output="2",
                explanation="2 appears four times out of seven elements.",
            ),
        ],
        visible_test_cases=[
            TestCase(input="nums = [3, 2, 3]", expected_output="3"),
            TestCase(input="nums = [2, 2, 1, 1, 1, 2, 2]", expected_output="2"),
        ],
        hidden_test_cases=[
            TestCase(input="nums = [1]", expected_output="1"),
            TestCase(input="nums = [7, 7, 7, 3, 3]", expected_output="7"),
            TestCase(input="nums = [9, 9, 9, 2, 2, 9, 1, 9, 9]", expected_output="9"),
        ],
        function_name="solve",
        stub="def solve(nums):\n    pass\n",
    ),
    Problem(
        id="reverse-words-in-sentence",
        title="Reverse Words In A Sentence",
        difficulty="Easy",
        topic="Strings",
        companies=["Microsoft", "Apple"],
        description=(
            "Given a sentence, reverse the order of its words. Words are "
            "separated by one or more spaces; collapse any run of spaces "
            "between words down to a single space in the output, and trim "
            "leading/trailing spaces entirely."
        ),
        constraints=[
            "1 <= s.length <= 10^4",
            "s contains English letters and spaces, and has at least one non-space character",
        ],
        examples=[
            Example(
                input='s = "the sky is blue"',
                output='"blue is sky the"',
            ),
            Example(
                input='s = "  hello   world  "',
                output='"world hello"',
                explanation="Extra leading, trailing, and between-word spaces are collapsed away.",
            ),
        ],
        visible_test_cases=[
            TestCase(input='s = "the sky is blue"', expected_output='"blue is sky the"'),
            TestCase(input='s = "  hello   world  "', expected_output='"world hello"'),
        ],
        hidden_test_cases=[
            TestCase(input='s = "a good   example"', expected_output='"example good a"'),
            TestCase(input='s = "single"', expected_output='"single"'),
            TestCase(input='s = "run fast and jump high"', expected_output='"high jump and fast run"'),
        ],
        function_name="solve",
        stub="def solve(s):\n    pass\n",
    ),
    Problem(
        id="binary-search-insert-position",
        title="Binary Search Insert Position",
        difficulty="Easy",
        topic="Binary Search",
        companies=["Google"],
        description=(
            "Given a sorted list of distinct integers and a target value, "
            "return the index where target is found, or the index where it "
            "would be inserted to keep the list sorted if it isn't present. "
            "Solve it in O(log n) time."
        ),
        constraints=[
            "0 <= nums.length <= 10^4",
            "-10^4 <= nums[i], target <= 10^4",
            "nums is sorted in ascending order with distinct values",
        ],
        examples=[
            Example(
                input="nums = [1, 3, 5, 6], target = 5",
                output="2",
                explanation="5 is already present at index 2.",
            ),
            Example(
                input="nums = [1, 3, 5, 6], target = 2",
                output="1",
                explanation="2 would be inserted between 1 and 3, at index 1.",
            ),
        ],
        visible_test_cases=[
            TestCase(input="nums = [1, 3, 5, 6], target = 5", expected_output="2"),
            TestCase(input="nums = [1, 3, 5, 6], target = 2", expected_output="1"),
        ],
        hidden_test_cases=[
            TestCase(input="nums = [1, 3, 5, 6], target = 7", expected_output="4"),
            TestCase(input="nums = [1, 3, 5, 6], target = 0", expected_output="0"),
            TestCase(input="nums = [], target = 3", expected_output="0"),
        ],
        function_name="solve",
        stub="def solve(nums, target):\n    pass\n",
    ),
    Problem(
        id="longest-substring-without-repeating",
        title="Longest Substring Without Repeating Characters",
        difficulty="Medium",
        topic="Two Pointers",
        companies=["Amazon", "Meta", "Bloomberg"],
        description=(
            "Given a string, return the length of its longest substring "
            "that doesn't repeat any character. A sliding-window (two "
            "pointer) approach solves this in O(n) time."
        ),
        constraints=[
            "0 <= s.length <= 5 * 10^4",
            "s consists of English letters, digits, symbols, and spaces",
        ],
        examples=[
            Example(
                input='s = "abcabcbb"',
                output="3",
                explanation="The longest repeat-free substring is 'abc', length 3.",
            ),
            Example(
                input='s = "bbbbb"',
                output="1",
                explanation="The longest repeat-free substring is 'b', length 1.",
            ),
        ],
        visible_test_cases=[
            TestCase(input='s = "abcabcbb"', expected_output="3"),
            TestCase(input='s = "bbbbb"', expected_output="1"),
        ],
        hidden_test_cases=[
            TestCase(input='s = "pwwkew"', expected_output="3"),
            TestCase(input='s = ""', expected_output="0"),
            TestCase(input='s = "abba"', expected_output="2"),
        ],
        function_name="solve",
        stub="def solve(s):\n    pass\n",
    ),
    Problem(
        id="merge-two-sorted-lists",
        title="Merge Two Sorted Lists",
        difficulty="Medium",
        topic="Linked Lists",
        companies=["Microsoft"],
        description=(
            "You're given two singly linked lists, each already sorted in "
            "ascending order, and represented here as plain lists of "
            "values. Merge them into one sorted list and return it, "
            "reusing values from both inputs (don't drop or invent any)."
        ),
        constraints=[
            "0 <= list1.length, list2.length <= 100",
            "Both lists are sorted in non-decreasing order",
        ],
        examples=[
            Example(
                input="list1 = [1, 2, 4], list2 = [1, 3, 4]",
                output="[1, 1, 2, 3, 4, 4]",
            ),
            Example(
                input="list1 = [], list2 = []",
                output="[]",
            ),
        ],
        visible_test_cases=[
            TestCase(input="list1 = [1, 2, 4], list2 = [1, 3, 4]", expected_output="[1, 1, 2, 3, 4, 4]"),
            TestCase(input="list1 = [], list2 = []", expected_output="[]"),
        ],
        hidden_test_cases=[
            TestCase(input="list1 = [], list2 = [0]", expected_output="[0]"),
            TestCase(input="list1 = [5], list2 = [1, 2, 3]", expected_output="[1, 2, 3, 5]"),
            TestCase(input="list1 = [1, 1, 1], list2 = [1, 1]", expected_output="[1, 1, 1, 1, 1]"),
        ],
        function_name="solve",
        stub="def solve(list1, list2):\n    pass\n",
    ),
    Problem(
        id="level-order-tree-sum",
        title="Level Order Tree Sum",
        difficulty="Medium",
        topic="Trees",
        companies=["Google"],
        description=(
            "A binary tree is given as a flat, level-order list, the same "
            "way LeetCode serializes trees: the root is first, followed by "
            "its children level by level, with None marking a missing "
            "child (whose own children are omitted entirely). Return the "
            "sum of every node's value in the tree."
        ),
        constraints=[
            "0 <= number of nodes <= 10^4",
            "-1000 <= node value <= 1000",
        ],
        examples=[
            Example(
                input="tree = [3, 9, 20, None, None, 15, 7]",
                output="54",
                explanation="3 + 9 + 20 + 15 + 7 = 54 (the two Nones are missing children, not nodes).",
            ),
            Example(
                input="tree = [1]",
                output="1",
                explanation="A single-node tree.",
            ),
        ],
        visible_test_cases=[
            TestCase(input="tree = [3, 9, 20, None, None, 15, 7]", expected_output="54"),
            TestCase(input="tree = [1]", expected_output="1"),
        ],
        hidden_test_cases=[
            TestCase(input="tree = []", expected_output="0"),
            TestCase(input="tree = [5, None, 7, None, None, None, 9]", expected_output="21"),
            TestCase(input="tree = [-2, None, -3]", expected_output="-5"),
        ],
        function_name="solve",
        stub="def solve(tree):\n    pass\n",
    ),
    Problem(
        id="group-anagrams",
        title="Group Anagrams",
        difficulty="Medium",
        topic="Hash Table",
        companies=["Uber", "Amazon"],
        description=(
            "Given a list of lowercase words, group the anagrams together "
            "(words made of exactly the same letters, rearranged). Because "
            "grading needs one unambiguous answer, return the groups in "
            "this exact order: sort the words within each group "
            "alphabetically, then order the groups themselves first by "
            "group size (smallest first), and by the group's alphabetical "
            "order as a tiebreak."
        ),
        constraints=[
            "1 <= words.length <= 10^4",
            "0 <= words[i].length <= 100",
            "words[i] consists of lowercase English letters only",
        ],
        examples=[
            Example(
                input='words = ["eat", "tea", "tan", "ate", "nat", "bat"]',
                output='[["bat"], ["nat", "tan"], ["ate", "eat", "tea"]]',
                explanation=(
                    "Three groups: {bat}, {nat, tan}, {ate, eat, tea} (sorted "
                    "internally, then ordered by group size, 1 before 2 before 3)."
                ),
            ),
            Example(
                input='words = [""]',
                output='[[""]]',
            ),
        ],
        visible_test_cases=[
            TestCase(
                input='words = ["eat", "tea", "tan", "ate", "nat", "bat"]',
                expected_output='[["bat"], ["nat", "tan"], ["ate", "eat", "tea"]]',
            ),
            TestCase(input='words = [""]', expected_output='[[""]]'),
        ],
        hidden_test_cases=[
            TestCase(input='words = ["a"]', expected_output='[["a"]]'),
            TestCase(input='words = ["ab", "ba", "abc"]', expected_output='[["abc"], ["ab", "ba"]]'),
            TestCase(
                input='words = ["cab", "bca", "abc", "xyz"]',
                expected_output='[["xyz"], ["abc", "bca", "cab"]]',
            ),
        ],
        function_name="solve",
        stub="def solve(words):\n    pass\n",
    ),
    Problem(
        id="course-schedule-feasible",
        title="Course Schedule Feasible",
        difficulty="Medium",
        topic="Graphs",
        companies=["Meta"],
        description=(
            "There are num_courses courses, labeled 0 to num_courses - 1. "
            "prerequisites is a list of [course, prereq] pairs meaning "
            "prereq must be completed before course. Return true if it's "
            "possible to finish all courses (i.e. the prerequisite graph "
            "has no cycle), false otherwise."
        ),
        constraints=[
            "1 <= num_courses <= 2000",
            "0 <= prerequisites.length <= 5000",
            "Each prerequisites[i] is [course, prereq] with course != prereq",
        ],
        examples=[
            Example(
                input="num_courses = 2, prerequisites = [[1, 0]]",
                output="true",
                explanation="Take course 0, then course 1.",
            ),
            Example(
                input="num_courses = 2, prerequisites = [[1, 0], [0, 1]]",
                output="false",
                explanation="0 needs 1 and 1 needs 0 - a cycle, so neither can ever be taken first.",
            ),
        ],
        visible_test_cases=[
            TestCase(input="num_courses = 2, prerequisites = [[1, 0]]", expected_output="true"),
            TestCase(input="num_courses = 2, prerequisites = [[1, 0], [0, 1]]", expected_output="false"),
        ],
        hidden_test_cases=[
            TestCase(
                input="num_courses = 4, prerequisites = [[1, 0], [2, 0], [3, 1], [3, 2]]",
                expected_output="true",
            ),
            TestCase(input="num_courses = 1, prerequisites = []", expected_output="true"),
            TestCase(
                input="num_courses = 3, prerequisites = [[0, 1], [1, 2], [2, 0]]",
                expected_output="false",
            ),
        ],
        function_name="solve",
        stub="def solve(num_courses, prerequisites):\n    pass\n",
    ),
    Problem(
        id="median-of-two-sorted-arrays",
        title="Median of Two Sorted Arrays",
        difficulty="Hard",
        topic="Binary Search",
        companies=["Google", "Meta"],
        description=(
            "Given two sorted lists of integers, return the median of the "
            "combined set of all their elements, as a float. For an even "
            "total count, that's the average of the two middle values."
        ),
        constraints=[
            "0 <= nums1.length, nums2.length <= 1000",
            "1 <= nums1.length + nums2.length <= 2000",
            "Both lists are sorted in non-decreasing order",
        ],
        examples=[
            Example(
                input="nums1 = [1, 3], nums2 = [2]",
                output="2.0",
                explanation="Combined and sorted: [1, 2, 3] - the middle value is 2.",
            ),
            Example(
                input="nums1 = [1, 2], nums2 = [3, 4]",
                output="2.5",
                explanation="Combined and sorted: [1, 2, 3, 4] - average of the two middle values (2, 3) is 2.5.",
            ),
        ],
        visible_test_cases=[
            TestCase(input="nums1 = [1, 3], nums2 = [2]", expected_output="2.0"),
            TestCase(input="nums1 = [1, 2], nums2 = [3, 4]", expected_output="2.5"),
        ],
        hidden_test_cases=[
            TestCase(input="nums1 = [], nums2 = [1]", expected_output="1.0"),
            TestCase(input="nums1 = [2], nums2 = []", expected_output="2.0"),
            TestCase(input="nums1 = [1, 3], nums2 = [2, 7]", expected_output="2.5"),
        ],
        function_name="solve",
        stub="def solve(nums1, nums2):\n    pass\n",
    ),
    Problem(
        id="n-queens-count",
        title="N-Queens Count",
        difficulty="Hard",
        topic="Recursion & DP",
        companies=["Microsoft", "Apple"],
        description=(
            "Given an n x n chessboard, return the number of distinct ways "
            "to place n queens on it so that no two queens attack each "
            "other (no shared row, column, or diagonal). Solve it with "
            "recursive backtracking."
        ),
        constraints=[
            "1 <= n <= 9",
        ],
        examples=[
            Example(
                input="n = 4",
                output="2",
                explanation="The two classic 4-queens solutions.",
            ),
            Example(
                input="n = 1",
                output="1",
                explanation="A single queen on a 1x1 board trivially doesn't attack itself.",
            ),
        ],
        visible_test_cases=[
            TestCase(input="n = 4", expected_output="2"),
            TestCase(input="n = 1", expected_output="1"),
        ],
        hidden_test_cases=[
            TestCase(input="n = 2", expected_output="0"),
            TestCase(input="n = 3", expected_output="0"),
            TestCase(input="n = 5", expected_output="10"),
        ],
        function_name="solve",
        stub="def solve(n):\n    pass\n",
    ),
]

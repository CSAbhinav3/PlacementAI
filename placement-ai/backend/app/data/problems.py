"""Module 5 - Technical Interview problem bank.

Hardcoded for now (3 original problems to start - expand later). Swapping
this out for a real datastore down the line shouldn't require touching the
router, since it only ever imports PROBLEMS.

All problems, wording, and examples here are written from scratch for this
project - classic well-known problem *types* (an array pair-sum problem, a
string-manipulation problem, a recursion problem), not copied from any
site.
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
]

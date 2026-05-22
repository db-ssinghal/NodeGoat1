# Fix Summary

- 46307fd fix(contributions): replace eval() with parseInt() — CRITICAL — eval() on POST body allowed authenticated RCE via any JS expression
- <will-fill-sha> fix(allocations): sanitize threshold to prevent NoSQL injection — CRITICAL — raw threshold in $where allowed JS injection into MongoDB

# Fix Summary

- 46307fd fix(contributions): replace eval() with parseInt() — CRITICAL — eval() on POST body allowed authenticated RCE via any JS expression
- 827c5be fix(allocations): sanitize threshold to prevent NoSQL injection — CRITICAL — raw threshold in $where allowed JS injection into MongoDB
- <will-fill-sha> fix(csrf): enable csurf middleware and add tokens to all forms — HIGH — all state-changing forms were unprotected against cross-site request forgery

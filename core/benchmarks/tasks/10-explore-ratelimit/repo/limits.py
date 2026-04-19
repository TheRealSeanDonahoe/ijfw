import time

class TokenBucket:
    def __init__(self, capacity, refill_per_s):
        self.capacity = capacity
        self.refill = refill_per_s
        self.tokens = capacity
        self.ts = time.monotonic()

    def allow(self, n=1):
        now = time.monotonic()
        self.tokens = min(self.capacity, self.tokens + (now - self.ts) * self.refill)
        self.ts = now
        if self.tokens >= n:
            self.tokens -= n
            return True
        return False

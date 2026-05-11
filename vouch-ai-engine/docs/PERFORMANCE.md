# Performance Benchmarks

Track performance metrics throughout implementation.

## `/identity/verify` Latency

| Phase | Component | Time (ms) | Target |
|-------|-----------|-----------|--------|
| TBD | Image decode | - | < 50 |
| TBD | Face extraction | - | < 100 |
| TBD | Document processing | - | < 100 |
| TBD | Liveness detection | - | < 150 |
| TBD | Face matching | - | < 100 |
| TBD | Total | - | **< 500** |

## `/fraud/assess` Latency

| Phase | Component | Time (ms) | Target |
|-------|-----------|-----------|--------|
| TBD | Signal validation | - | < 10 |
| TBD | Model inference | - | < 80 |
| TBD | Response assembly | - | < 10 |
| TBD | Total | - | **< 100** |

## Load Testing (10 Concurrent Requests)

| Endpoint | Avg Latency | Max Latency | Min Latency |
|----------|-------------|-------------|------------|
| `/health` | - | - | - |
| `/identity/verify` | - | - | - |
| `/fraud/assess` | - | - | - |

## Results

```
Date: 2026-05-08
Status: PENDING IMPLEMENTATION
Next Review: After Phase 3 completion
```

---

## Optimization Notes

- [To be filled during implementation]
- Consider caching face embeddings for same user
- Consider model quantization for faster inference
- Profile code with `python -m cProfile app.py`

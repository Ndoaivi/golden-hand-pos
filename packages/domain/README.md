# Shared demo domain

`index.ts` provides typed state, fixtures, deterministic time-aware transitions, report functions and persistence shape validation. It does not import React, perform I/O, talk to payment gateways or connect a database.

These rules preserve Phase 1 demo workflows. Their caller-provided role/time and browser-managed state are not trustworthy in production. The later API must validate authenticated permissions, authoritative prices, server time and database concurrency itself.

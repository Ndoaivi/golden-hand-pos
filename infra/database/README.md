# Reserved database boundary

Phase 1 connects no database and runs no migrations. This directory is reserved for reviewed Supabase PostgreSQL migrations and local/sandbox database tooling after approval. The reference schema remains an engineering draft in the read-only original repository.

Production needs transactional ledgers and inventory movements, role/venue restrictions, unique open sessions, idempotency, protected append-only audit and tested backup recovery. No database credentials belong in frontend code.

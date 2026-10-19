# WebFetch result (model-generated summary of the fetched page, NOT a copy of the page)

- URL: https://mongodb.com/company/blog/product-release-announcements/mongodb-search-vector-search-now-run-anywhere
- Fetched (UTC): None
- Session/agent: f58238e8-2f4b-4abc-a81b
- Prompt: Summarize: GA date, MongoDB version required (8.2 or later?), deployment requirements (replica set, mongot, Kubernetes operator?), license, production readiness, limits. Quote key sentences.

---

**GA date:** The blog post is dated July 1, 2026, and announces that MongoDB Search (full-text) and Vector Search are generally available for self-managed deployments. It gives no separate GA date.

**Version requirement:** Community Edition needs MongoDB 8.2 or later. The post says: "available with MongoDB version 8.2 or later and operate on a separate binary, mongot, which runs alongside the standard mongod database binary." It doesn't state a version requirement for Enterprise Advanced.

**Deployment requirements:**
- **Community Edition:** Requires running the separate mongot process alongside mongod.
- **Enterprise Advanced:** Search and Vector Search are "deployed on Kubernetes through MongoDB Controllers for Kubernetes (MCK)."
- **Replica sets:** The post doesn't mention replica set requirements.

**License:** Community Edition features are included at no extra cost "under the Server Side Public License (SSPL)." The post notes that mongot was recently released under the SSPL. Enterprise Advanced Search and Vector Search are a paid add-on.

**Production readiness:** The post presents the GA release as ready for mission-critical use. It says Enterprise Advanced "operates at massive scale" and targets regulated sectors like financial services, healthcare, and telecommunications. It doesn't give formal production SLAs or benchmarks.

**Limits:**
- The post says self-managed deployments are "free of storage caps or imposed limits," but it doesn't specify technical limits.
- Automated embedding generation "requires MongoDB-hosted Voyage AI," so it isn't available with self-hosted embedding models.
- Enterprise Advanced requires a paid subscription, with Search and Vector Search as an add-on.
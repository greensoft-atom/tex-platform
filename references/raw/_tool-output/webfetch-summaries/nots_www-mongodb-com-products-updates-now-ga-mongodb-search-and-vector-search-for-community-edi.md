# WebFetch result (model-generated summary of the fetched page, NOT a copy of the page)

- URL: https://www.mongodb.com/products/updates/now-ga-mongodb-search-and-vector-search-for-community-edition/
- Fetched (UTC): None
- Session/agent: f58238e8-2f4b-4abc-a81b
- Prompt: Summarize: GA date, required MongoDB version, deployment model (mongot process, replica set required?), license, production guidance (dedicated nodes, sizing), supported features ($search, $vectorSearch, autocomplete, facets, analyzers), any limitations. Quote key sentences.

---

# New in MongoDB | MongoDB

See all updates

### Now GA: MongoDB Search and Vector Search for Community Edition

June 30, 2026

**What it is:** MongoDB Search and Vector Search for Community Edition are now generally available, bringing integrated full-text and vector search to self-managed MongoDB deployments. Developers can build keyword search, semantic search, autocomplete, faceting, and retrieval-driven application experiences directly on MongoDB data without adding a separate search engine or vector database. Search runs on mongot, a dedicated search process that works alongside mongod and keeps search indexes synchronized with application data. 

**Why it matters:** Modern applications increasingly need both traditional keyword search and semantic retrieval, but stitching together an operational database with external search infrastructure adds synchronization overhead, operational complexity, and multiple APIs for developers to manage. With general availability, Community Edition users can now build and run search-driven and AI-powered experiences directly in MongoDB using the same query model they already know, while keeping full control over where and how they deploy. This release also makes MongoDB’s self-managed search stack more transparent: mongot is available under the SSPL, giving developers greater visibility into the technology behind MongoDB Search and Vector Search.

**Who it’s for:** MongoDB Search and Vector Search for Community Edition are designed for developers and teams that want integrated search and vector search capabilities in self-managed environments without using 3rd party search engines. This includes developers building locally, teams running private infrastructure, organizations with regulatory or deployment constraints that keep them out of fully managed cloud services, and Community Edition users who want to add full-text and semantic search directly to their MongoDB applications. 

**How to get started:** To get started, deploy MongoDB Community Edition with mongot on a supported self-managed environment, create your search or vector indexes, and begin querying with MongoDB’s native search capabilities. MongoDB Search and Vector Search for Community Edition are designed for developers who want to build locally, run in private infrastructure, or operate in self-managed environments without adding separate search systems. For setup guidance, deployment instructions, and examples, see the MongoDB documentation.

### Related Content

Blog

MongoDB Search and Vector Search Now Run Anywhere

Docs

Self Managed Search
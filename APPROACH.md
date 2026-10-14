# BookLeaf Portal — Technical Approach

## Priorities

I prioritized delivering the core author-support workflow: secure login, author-specific book and royalty information, ticket creation, administrative ticket management, and communication between authors and the support team.

The implementation uses React for the user interface, Express for REST APIs, and MySQL for persistent storage. The backend separates authentication middleware, route handlers, database access, and ticket AI services to keep responsibilities organized.

## AI Integration

Ticket classification assigns a category and priority based on the query content. The response-drafting service uses BookLeaf policy information to produce a suggested reply. The administrator can review and edit the draft before sending it to the author.

A deterministic fallback allows ticket creation and draft generation to continue when the external AI service is unavailable. In production, I would add structured output validation, evaluation datasets, monitoring, and more detailed handling of provider errors and rate limits.

## Trade-offs

For this assignment, I chose a straightforward REST architecture and polling for near-real-time updates. These choices are easy to understand and sufficient for a demonstration. A larger production system could use event-driven notifications and a more scalable background-processing architecture.

The interface focuses on clarity and functionality rather than visual complexity. The supplied dataset is seeded to make the author and admin workflows easy to demonstrate.

## Production Improvements

Given more time, I would strengthen automated testing, audit logging, rate limiting, and monitoring. I would also implement more comprehensive ticket filters, editable category and priority controls, attachment handling, and robust integration tests.

For AI quality, I would evaluate classification accuracy against a labeled dataset, track response quality, control token usage, and ensure that sensitive account-specific information is never invented by the model.

## Conclusion

The goal is to reduce repetitive support work while preserving administrator oversight, consistent policy-based responses, and secure access to author information.

# ADR 0003: Redux Toolkit for app state, React Query for stock data

- Status: Accepted
- Date: 2026-10-13

## Context

The assignment asks for Redux (or a similar global state library) and React Query for stock data.
Two libraries can create two sources of truth for the same data. We must give each data type one owner.

## Decision

| Data                                                 | Owner                                    | Reason                                                                                                   |
| ---------------------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Balance, last 5 transactions, load and submit status | Redux Toolkit (`account` slice, thunks)  | One write changes the balance and the list. The submit status and the error message are global UI state. |
| Form values                                          | Redux Toolkit (`transactionDraft` slice) | The values must stay when the tab or the layout changes.                                                 |
| Watchlist                                            | Redux Toolkit (`markets` slice)          | Client-only UI state.                                                                                    |
| Stock quotes and search                              | React Query                              | Server cache data: retry, backoff, stale data, refetch interval and cancellation are built in.           |

The thunks get the API client through `extra` (dependency injection). Tests give a fake client.
The submit thunk has a `condition` that stops a second request while the first one is in progress.

## Alternatives

- RTK Query for all server data: one library, but the assignment asks for React Query for the stock data.
- React Query for the account data also: less code, but no global state library for the assignment.

## Consequences

- Each data type has one owner. A reviewer can find the owner in this table.
- The account data does not refetch on focus. The user can press "Refresh".

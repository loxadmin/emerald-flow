# Project notes

## First $1,000 escrow-spend reward (non-withdrawable bonus)

- Wallets carry engine-managed columns: `bonus_granted_total_usd`, `bonus_usd` (locked campaign credit inside balance), `escrow_spent_total_usd`, `first_1k_bonus_granted`. Clients must never write these (column UPDATE revoked; `guard_wallets_privileged` ignores them).
- The reward is granted exactly once by `note_escrow_spend(uuid, numeric)` when lifetime escrow spend crosses $1,000; it is only invoked from the escrow-spend triggers on `campaigns` (budget drawdown), `package_orders` (incl. swift deliveries via `escrow_spent_usd`), `roast_boost_orders` (`escrow_balance` releases), and `switch_offer_orders` (completion). Refunds/top-ups never count (terminal statuses, `app.skip_escrow_spend` GUC in refund functions).
- `wallet_consume_bonus` BEFORE trigger consumes bonus first on any wallet balance decrease and clamps bonus ≤ balance.
- Every escrow refund that credits a wallet must restore `bonus_usd` first (capped at `bonus_granted_total_usd`) so bonus credit cannot be laundered into withdrawable cash via fund-then-refund; this includes the leftover-refund updates in the `track` and `manage-manual-events` edge functions.
- `request_withdrawal` limits withdrawal to `balance - bonus_usd`; the Wallet page mirrors this and shows the locked bonus.

# Permissions

Defined in `config/permissions.js`. Roles are bundles of granular permissions; rules and server code check permissions, not role names.

| Permission | OWNER | MANAGER | CASHIER | CHEF | WAITER | INVENTORY_MANAGER | ACCOUNTANT | STAFF |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| POS_READ / POS_CREATE | ✓ | ✓ | ✓ | | ✓ | | | |
| ORDERS_READ | ✓ | ✓ | ✓ | ✓ | ✓ | | | ✓ |
| ORDERS_UPDATE | ✓ | ✓ | | | | | | |
| ORDERS_REFUND | ✓ | ✓ | | | | | | |
| POS_DISCOUNT | ✓ | ✓ | | | | | | |
| KITCHEN_READ / KITCHEN_UPDATE | ✓ | ✓ | | ✓ | | | | |
| MENU_MANAGE | ✓ | ✓ | | | | | | |
| TABLES_MANAGE / RESERVATIONS_MANAGE | ✓ | ✓ | | | ✓ | | | |
| CUSTOMERS_READ | ✓ | ✓ | ✓ | | | | | |
| CUSTOMERS_MANAGE | ✓ | ✓ | | | | | | |
| INVENTORY_READ | ✓ | ✓ | | ✓ | | ✓ | | |
| INVENTORY_MANAGE | ✓ | ✓ | | | | ✓ | | |
| STAFF_MANAGE | ✓ | ✓ | | | | | | |
| FINANCIAL_READ / FINANCIAL_MANAGE | ✓ | ✓ | | | | | ✓ | |
| REPORTS_READ | ✓ | ✓ | | | | | ✓ | |
| SETTINGS_MANAGE | ✓ | | | | | | | |
| AUDIT_READ | ✓ | ✓ | | | | | | |

Platform roles: `SUPER_ADMIN`, `PLATFORM_SUPPORT` (stored in `platformUsers/{uid}`, created only by a server-side bootstrap).
Open question: MANAGER currently cannot manage settings or branding. Confirm whether managers should.

After changing `config/permissions.js`, run `npm run sync:permissions` (see `POS.md`): stored membership permission lists are not updated automatically.

# Security Specification - Nossa Estante

## 1. Data Invariants
- Only authenticated users can access and write to the shared couple library.
- Every book must contain valid title, status (one of 'quero_ler', 'lendo', 'lido', 'abandonado', 'pausado'), and assigned reader ('ele', 'ela', 'ambos').
- Path IDs must conform to `isValidId` regex (`^[a-zA-Z0-9_\-]+$`) with a maximum length of 128 characters.
- String fields must adhere to length limits (title <= 500 chars, description <= 5000 chars, etc.) preventing denial of wallet resource exhaustion attacks.
- Settings document restricts readers' names and yearly goals within bounds.

## 2. The "Dirty Dozen" Malicious Payloads
1. **Unauthenticated Read/Write**: Attempting to query `/books` or write a book without authentication. Expected: PERMISSION_DENIED.
2. **Path ID Injection**: Creating a document with ID containing path traversal or 100KB junk characters. Expected: PERMISSION_DENIED.
3. **Invalid Status State**: Sending payload with `status: "hack_all"`. Expected: PERMISSION_DENIED.
4. **Invalid Reader Enum**: Sending payload with `assignedReader: "alien"`. Expected: PERMISSION_DENIED.
5. **Mega Payload Denial of Wallet**: Sending a title exceeding 500 chars or description exceeding 5000 chars. Expected: PERMISSION_DENIED.
6. **Negative Page Count**: Sending `pageCount: -50`. Expected: PERMISSION_DENIED.
7. **Negative Current Page**: Sending `currentPage: -1`. Expected: PERMISSION_DENIED.
8. **Rating Out of Bounds**: Sending `ratings: { ele: 15 }` (valid is 0 to 5). Expected: PERMISSION_DENIED.
9. **Settings Yearly Goal Negative**: Sending `yearlyGoal: -10`. Expected: PERMISSION_DENIED.
10. **Shadow Field Injection**: Sending undocumented properties like `__adminOverride: true` or `isAdmin: true`. Expected: PERMISSION_DENIED.
11. **Orphan Field Type Mismatch**: Providing array when object is expected for `ratings`. Expected: PERMISSION_DENIED.
12. **Settings Name Overflow**: Setting `eleName` with 10,000 characters. Expected: PERMISSION_DENIED.

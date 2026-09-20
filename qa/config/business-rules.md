# Application Business Rules for QA Testing

This document contains documented business rules from the CRM project.
The autonomous QA agent validates these rules during exploratory and edge-case testing.

---

## 1. Authentication & Session
- Valid user email and password must grant access to the application.
- Invalid email or password must display an error message and block access.
- Unauthenticated requests to protected routes (e.g., `/dashboard`, `/leads`, `/bookings`) must redirect to `/login`.

## 2. Lead Management
- A new lead requires at least a customer name or mobile number.
- Submitting an empty lead form should be prevented with validation error.
- Search must match customer name, lead ID, email, or destination.
- Pagination must display the correct item count and allow moving between pages.

## 3. Bookings & Operations
- Confirmed bookings require traveler details and valid travel dates.
- Booking status transitions should update the UI without crashing.
- Filter by status (Pending, Confirmed, Completed, Cancelled) must return matching records or empty state.

## 4. Quotations & Itineraries
- Creating a quotation requires customer contact information.
- Day-wise activities and price quote should not be negative.

## 5. Invoices & Billing
- Invoice amounts must be positive numbers.
- Partial payment cannot exceed total invoice amount.
- Status filters (Paid, Partial, Pending) must filter table rows correctly.

## 6. Safety & Role Boundaries
- Destructive operations (Delete / Destroy) are restricted when `ALLOW_DELETE=false`.
- Real payment processing is blocked when `ALLOW_PAYMENT=false`.
- Outgoing communication (real WhatsApp / Email) is blocked when `ALLOW_EXTERNAL_MESSAGES=false`.

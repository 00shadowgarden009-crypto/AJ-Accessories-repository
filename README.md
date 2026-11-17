# AJ Accessories storefront

A static storefront and admin dashboard backed by Supabase. The product catalogue and orders are shared across visitors and admin devices; the shopping bag itself stays in the shopper's current browser session.

## Connect Supabase

1. Open your Supabase project and choose **SQL Editor → New query**.
2. Paste and run all of `supabase-setup.sql`. This creates the tables, row-level security policies, secure order-placement function, and starter catalogue.
3. In **Authentication → Providers**, keep email/password enabled. Set the site's **Site URL** and redirect URL to your GitHub Pages URL (for example `https://YOUR-USERNAME.github.io/AJ-Accessories-repository/`).
4. Open `admin.html` from the deployed site and create your account. Verify your email if Supabase requests it.
5. In Supabase **Authentication → Users**, copy your account's user UUID.
6. In SQL Editor, grant that account store-admin access:

   ```sql
   insert into public.store_admins (user_id)
   values ('PASTE-YOUR-AUTH-USER-UUID-HERE');
   ```

7. Sign out and sign back in to the admin portal. Admin product edits and order management are protected by database RLS; merely signing up does not make an account an administrator.

The `config.js` file contains the project URL and publishable/anon key. That key is meant to be public in a browser app; **never put a Supabase service-role/secret key in this repository**. RLS and the database function enforce access.

## Run locally

For a quick static preview, open `index.html`. For Auth, realtime, and API requests, run a local static server from this folder, such as `python -m http.server 8000`, then visit `http://localhost:8000`.

## Publish with GitHub Pages

In the repository, open **Settings → Pages**, choose **Deploy from a branch**, select `main` and `/ (root)`, then save. Once the Pages build completes, open the published URL. The storefront is `index.html`; the admin portal is `admin.html`.

## Orders and payments

Order placement calls `place_store_order`, which reads current prices from the database, checks stock under row locks, deducts inventory, and stores a pending order. Only assigned admins can read customer order details or update order status. The storefront currently supports **pay on delivery / manual confirmation only**. It does not accept or store card details. To take online payments, integrate a payment provider using a server-side/edge function and provider webhooks; do not put secret keys in frontend code.

Before taking real customer orders, confirm your delivery, privacy, returns, and customer-support policies. The database order form stores customer name, email, phone, and address, so handle access and retention responsibly. Add rate limiting/CAPTCHA or an equivalent abuse-prevention layer before exposing the order endpoint to significant public traffic.

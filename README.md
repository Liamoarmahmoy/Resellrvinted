# RESELLR

A command-centre dashboard for Vinted resellers: inventory, sales, expenses,
Buy-or-Pass and pricing calculators, brand/supplier analytics, monthly
performance and goals.

Data is stored in the visitor's own browser (`localStorage`) — nothing is
sent to a server. Each person who opens the deployed link gets their own
private, empty instance that starts with demo data they can clear.

## Run it locally

```
npm install
npm run dev
```

Opens at http://localhost:5173

## Deploy it (step 3 of the plan)

1. Push this folder to a new GitHub repository.
2. Go to vercel.com → sign in with GitHub → "Import Project" → pick the repo.
3. Leave the defaults (Vite is auto-detected) → Deploy.
4. You'll get a live `.vercel.app` URL within a couple of minutes.
5. Optional: buy a domain and attach it under the Vercel project's Domains tab.

That live URL is what you hand to buyers.

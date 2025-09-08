# Fleet CoPilot (Neo4j Aura edition)

Connects to Neo4j Aura using neo4j+s URI and includes a Next.js SSO frontend.

## Backend
cd server
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
npm i
cp ../.env.example .env   # edit Aura URI, user, password
npm run seed
npm run dev               # http://localhost:4000

## Frontend
cd ../app
npm i
cp ../.env.example .env.local  # set Auth0 and BACKEND_BASE_URL
npm run dev                    # http://localhost:3000

Open /login, sign in, then search VIN 1FBUU6YAA5HA71058.


### If the Tailwind is not intialised then do it for UX alignemtn
npm install tailwindcss postcss autoprefixer
npx tailwindcss init -p
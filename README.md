# MERN NexTrade Apis

## Technologies, Middlewares, Utils & Tools

- nodejs 16 - js runtime
- express - nodejs framework
- mongodb 4.2 (NoSQL) + mongoose

- cookie-parser - handling refresh-token (cookie)
- jsonwebtoken + express-jwt - generate/decode access & refresh token
- bcrypt - generate hashed password
- axios - alt to fetch
- stripe - payment system
- formidable - handling 'multipart/form-data', files

- cors - limit access to server
- morgan (dev) - logger for http request, errors
- helmet - setting basic security for http headers
- dotenv - access .env
- lodash - .extend(), during update
- eslint + prettier + airbnb-base - code formatter, for VSCode

- onrender - hosting web server (or app)
- mongodb atlas - mongodb hosting, cloud-based

- Git (git-bash) + Github Desktop
- Insomia - api testing, alt to Postman
- Robo 3T - mongodb management tool
- VSCode, Sublime Text:
  - linter plugin: SublimeLinter, SublimeLinter-eslint, JsPrettier

##

1. Clone repo and Install. You must have git-bash and nodejs v16

```bash

# checks
node --version  # mine is v16.20.2
npm --version # 8.19.4
git --version # 2.31.1.window.1

#
git clone https://github.com/ezdall/mern-nextrade-api
cd mern-nextrade-api/

npm install

```

2. Download and Install MongoDB v4.2 (if you dont have). You can use Robo-3T v1.43 to create database.

```bash
# check if mongodb exist

mongo --version  # mine is v4.2.8
mongod --version # v4.2.8


```

3. create .env file.

```plaintext
# example:

MONGO_URI_NEXTRADE_DEV=mongodb://localhost:27017/nextrade-api
# 'nextrade-api' is name of mongodb database

# remote, mongodb atlas
MONGO_URI_NEXTRADE_PROD=mongodb+srv://<username>:<password>@xxx.mongodb.net/<db_name>?retryWrites=true&w=majority&appName=Cluster0

PORT=3000

ACCESS_SECRET=418dbbdca9a9a57a5daea9f

REFRESH_SECRET=e4e44c853c75badfeea81c

# need to have stripe
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxx
STRIPE_API_KEY=pk_test_xxxxxxxxx


```

4. run server

```bash

# run nodemon
npm run dev


```

5. open Insomia (or Postman) or Browser at 'localhost:3000'.

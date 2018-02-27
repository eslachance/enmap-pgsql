# Enmap-PGSql

Enmap-PGSql is a provider for the [Enmap](https://www.npmjs.com/package/enmap) module. 

## Installation

> enmap-psql requires a PostgreSQL server of version 9.5 or higher due to the use of the new "upsert"-ish feature (on conflict update). Lower versions *will not work*.

To install Enmap-PGSql simply run `npm i enmap-pgsql`.

## Usage

```js
// Load Enmap
const Enmap = require('enmap');
 
// Load EnmapPGSql
const EnmapPGSql = require('enmap-pgsql');
 
// Initialize the provider
const provider = new EnmapPGSql({ name: 'test' });
 
// Initialize the Enmap with the provider instance.
const myColl = new Enmap({ provider: provider });
```

Shorthand declaration: 

```js
const Enmap = require('enmap');
const EnmapPGSql = require('enmap-pgsql');
const myColl = new Enmap({ provider: new EnmapPGSql({ name: 'test' }); });
```

## Options

```js
// Example with all options.
const level = new EnmapPGSql({ 
  name: "test",
  user: "postgres",
  password: "password",
  host: "localhost",
  port: 5432,
  database: "postgres"
});

// Example with connection string
const level = new EnmapPGSql({ 
  name: "test",
  connectionString = "postgresql://dbuser:secretpassword@database.server.com:3211/mydb"
});
```

### name

Defines the `name` of the table saved in the database. 

### user, password, host, port, database

I'm tired, I've been trying to get this working for a while, and in this state of mind, my documentation for these fields is: 

If you can't figure out what any of those means, you're making me lose faith in humanity.

### connectionString

This can be use alternatively to all of the above, a full connection string to the database. Looks like this: 

`postgresql://dbuser:secretpassword@database.server.com:3211/mydb`

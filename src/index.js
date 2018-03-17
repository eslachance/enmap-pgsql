const { Pool } = require('pg');

class EnmapProvider {

  constructor(options) {
    this.defer = new Promise((resolve) => {
      this.ready = resolve;
    });

    if (!options.name) throw new Error('Must provide options.name');
    this.name = options.name;
    let poolOptions;
    if (options.connectionString) {
      poolOptions = { connectionString: options.connectionString };
    } else {
      if (!options.user || !options.password || !options.host || !options.port || !options.database) {
        throw new Error('Either provide options.connectionString, or the username, password, host, port and database options.');
      }
      poolOptions = options;
    }

    this.validateName();
    this.db = new Pool(poolOptions);
  }

  /**
   * Internal method called on persistent Enmaps to load data from the underlying database.
   * @param {Map} enmap In order to set data to the Enmap, one must be provided.
   * @returns {Promise} Returns the defer promise to await the ready state.
   */
  async init(enmap) {
    this.enmap = enmap;
    await this.db.query(`CREATE TABLE IF NOT EXISTS ${this.name} (key varchar(100) PRIMARY KEY, value text NOT NULL)`);
    if (this.fetchAll) {
      await this.fetchEverything();
      this.ready();
    } else {
      this.ready();
    }
    return this.defer;
  }

  /**
   * Shuts down the underlying persistent enmap database.
   * @return {Promise<*>} The promise of the database closing operation.
   */
  close() {
    return this.db.close();
  }

  /**
   * Fetches a specific key or array of keys from the database, adds it to the EnMap object, and returns its value.
   * @param {(string|number)} key The key to retrieve from the database.
   * @return {*} The value obtained from the database.
   */
  async fetch(key) {
    const data = await this.db.query(`SELECT * FROM ${this.name} WHERE key = $1`, [key]);
    return data.rows[0].value;
  }

  /**
   * Fetches all non-cached values from the database, and adds them to the enmap.
   * @return {Promise<Map>} The promise of a cached Enmap.
  */
  async fetchEverything() {
    const data = await this.db.query({ text: `SELECT * FROM ${this.name};` });
    for (const row of data.rows) {
      let parsedValue = row.value;
      if (row.value[0] === '[' || row.value[0] === '{') {
        parsedValue = JSON.parse(row.value);
      }
      this.enmap.set(row.key, parsedValue);
    }
    return this;
  }

  /**
   * Set a value to the Enmap.
   * @param {(string|number)} key Required. The key of the element to add to the EnMap object.
   * If the EnMap is persistent this value MUST be a string or number.
   * @param {*} val Required. The value of the element to add to the EnMap object.
   * If the EnMap is persistent this value MUST be stringifiable as JSON.
   * @return {Promise<*>} Promise returned by the database after insertion.
   */
  set(key, val) {
    if (!key || !['String', 'Number'].includes(key.constructor.name)) {
      throw new Error('SQLite require keys to be strings or numbers.');
    }
    const insert = typeof val === 'object' ? JSON.stringify(val) : val;
    return this.db.query(`INSERT INTO ${this.name} (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2;`, [key, insert]);
  }

  /**
   * Delete an entry from the Enmap.
   * @param {(string|number)} key Required. The key of the element to delete from the EnMap object.
   * @param {boolean} bulk Internal property used by the purge method.
   * @return {Promise<*>} Promise returned by the database after deletion
   */
  delete(key) {
    return this.db.query(`DELETE FROM ${this.name} WHERE key = $1`, [key]);
  }

  /**
   * Checks if a key is present in the database (used when not all rows are fetched).
   * @param {(string|number)} key Required. The key of the element we're checking in the database.
   * @return {Promise<boolean>} Whether the key exists in the database.
   */
  hasAsync(key) {
    return this.db.query(`SELECT key FROM ${this.name} WHERE key = $1`, [key]);
  }


  /**
   * Deletes all the Keys of Enmap
   */
  bulkDelete() {
    this.db.query(`TRUNCATE ${this.name}`);
  }

  /**
   * Internal method used to validate persistent enmap names (valid Windows filenames)
   * @private
   */
  validateName() {
    // Do not delete this internal method.
    this.name = this.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  }

  /**
   * Internal method used by Enmap to retrieve provider's correct version.
   * @return {string} Current version number.
   */
  getVersion() {
    return require('./package.json').version;
  }

}

module.exports = EnmapProvider;


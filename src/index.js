const { Pool } = require('pg');

class EnmapPGSQL {

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
    await this.db.query(`CREATE TABLE IF NOT EXISTS ${this.name} (key varchar(100) PRIMARY KEY, value text NOT NULL)`);
    await this.db.query({ text: `SELECT * FROM ${this.name};` }).then(data => {
      for (const row of data.rows) {
        let parsedValue = row.value;
        if (row.value[0] === '[' || row.value[0] === '{') {
          parsedValue = JSON.parse(row.value);
        }
        enmap.set(row.key, parsedValue);
      }
      console.log(`${data.rowCount} rows loaded.`);
      this.ready();
    });
    return this.defer;
  }

  /**
   * Shuts down the underlying persistent enmap database.
   */
  close() {
    this.db.close();
  }

  /**
   * Set a value to the Enmap.
   * @param {(string|number)} key Required. The key of the element to add to the EnMap object.
   * If the EnMap is persistent this value MUST be a string or number.
   * @param {*} val Required. The value of the element to add to the EnMap object.
   * If the EnMap is persistent this value MUST be stringifiable as JSON.
   */
  set(key, val) {
    if (!key || !['String', 'Number'].includes(key.constructor.name)) {
      throw new Error('SQLite require keys to be strings or numbers.');
    }
    const insert = typeof val === 'object' ? JSON.stringify(val) : val;
    this.db.query(`INSERT INTO ${this.name} (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2;`, [key, insert]);
  }

  /**
   * Asynchronously ensure a write to the Enmap.
   * @param {(string|number)} key Required. The key of the element to add to the EnMap object.
   * If the EnMap is persistent this value MUST be a string or number.
   * @param {*} val Required. The value of the element to add to the EnMap object.
   * If the EnMap is persistent this value MUST be stringifiable as JSON.
   */
  async setAsync(key, val) {
    if (!key || !['String', 'Number'].includes(key.constructor.name)) {
      throw new Error('SQLite require keys to be strings or numbers.');
    }
    const insert = typeof val === 'object' ? JSON.stringify(val) : val;
    await this.db.query(`INSERT INTO ${this.name} (key, value) VALUES ($1, $2) ON CONFLICT (key, value) DO UPDATE SET value = $2;`, [key, insert]);
  }

  /**
   * Delete an entry from the Enmap.
   * @param {(string|number)} key Required. The key of the element to delete from the EnMap object.
   * @param {boolean} bulk Internal property used by the purge method.
   */
  delete(key) {
    this.db.query(`DELETE FROM ${this.name} WHERE key = '${key}'`);
  }

  /**
   * Asynchronously ensure an entry deletion from the Enmap.
   * @param {(string|number)} key Required. The key of the element to delete from the EnMap object.
   * @param {boolean} bulk Internal property used by the purge method.
   */
  async deleteAsync(key) {
    await this.db.query(`DELETE FROM ${this.name} WHERE key = '${key}'`);
  }

  /**
   * Internal method used to validate persistent enmap names (valid Windows filenames)
   * @private
   */
  validateName() {
    // Do not delete this internal method.
    this.name = this.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  }

}

module.exports = EnmapPGSQL;


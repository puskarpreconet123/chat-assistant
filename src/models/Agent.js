import { pool } from '../config/mysql.js';

function wrapAgent(row) {
  if (!row) return null;
  const agentObj = {
    ...row,
    _id: row.agency_unq_id || row.email,
    emailId: row.email,
    name: row.name,
    status: row.show_status && row.show_status.toLowerCase() === 'active' ? 'active' : 'inactive'
  };

  Object.defineProperty(agentObj, 'save', {
    enumerable: false,
    value: async function () {
      await pool.query(
        `UPDATE users SET name = ?, password = ?, show_status = ? WHERE email = ?`,
        [this.name, this.password, this.status === 'active' ? 'ACTIVE' : 'INACTIVE', this.emailId]
      );
      return this;
    }
  });

  return agentObj;
}

class AgentQuery {
  constructor(queryPromise) {
    this.queryPromise = queryPromise;
    this.sortOption = null;
  }

  sort(option) {
    this.sortOption = option;
    return this;
  }

  async then(resolve, reject) {
    try {
      const [rows] = await this.queryPromise;
      let agents = rows.map(row => wrapAgent(row));
      if (this.sortOption) {
        const key = Object.keys(this.sortOption)[0];
        const order = this.sortOption[key];
        agents.sort((a, b) => {
          if (a[key] < b[key]) return order === -1 ? 1 : -1;
          if (a[key] > b[key]) return order === -1 ? -1 : 1;
          return 0;
        });
      }
      resolve(agents);
    } catch (err) {
      reject(err);
    }
  }
}

export const Agent = {
  async findOne(query) {
    let idVal = query._id;
    let emailVal = query.emailId;
    if (query.$or) {
      for (const condition of query.$or) {
        if (condition._id !== undefined) idVal = condition._id;
        if (condition.emailId !== undefined) emailVal = condition.emailId;
      }
    }

    let sql = "SELECT * FROM users WHERE type IN ('AGENCY', 'ADMIN')";
    const params = [];
    if (idVal && emailVal) {
      sql += ' AND (email = ? OR id = ? OR agency_unq_id = ?)';
      params.push(emailVal, idVal, idVal);
    } else if (idVal) {
      sql += ' AND (id = ? OR agency_unq_id = ? OR email = ?)';
      params.push(idVal, idVal, idVal);
    } else if (emailVal) {
      sql += ' AND email = ?';
      params.push(emailVal);
    }

    const [rows] = await pool.query(sql + ' LIMIT 1', params);
    if (rows.length === 0) return null;
    return wrapAgent(rows[0]);
  },

  async findById(id) {
    const [rows] = await pool.query(
      "SELECT * FROM users WHERE (id = ? OR agency_unq_id = ? OR email = ?) AND type IN ('AGENCY', 'ADMIN') LIMIT 1",
      [id, id, id]
    );
    if (rows.length === 0) return null;
    return wrapAgent(rows[0]);
  },

  async findByIdAndUpdate(id, updateData, options = {}) {
    const emailId = updateData.emailId || id;
    const password = updateData.password;
    const name = updateData.name;
    const status = updateData.status || 'ACTIVE';
    
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 8);

    if (options.upsert) {
      const [existing] = await pool.query("SELECT * FROM users WHERE (email = ? OR agency_unq_id = ? OR id = ?) LIMIT 1", [id, id, id]);
      if (existing.length > 0) {
        await pool.query(
          `UPDATE users SET name = ?, password = ?, show_status = ? WHERE id = ?`,
          [name, password, status === 'active' ? 'ACTIVE' : 'INACTIVE', existing[0].id]
        );
      } else {
        await pool.query(
          `INSERT INTO users (
            name, mob, email, password, img, agency_id, agency_unq_id, 
            read_status, verification, type, show_status, date, time
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            name,
            '',
            emailId,
            password,
            '',
            '',
            id,
            '',
            '',
            'AGENCY',
            status === 'active' ? 'ACTIVE' : 'INACTIVE',
            dateStr,
            timeStr
          ]
        );
      }
    } else {
      const fieldsToUpdate = [];
      const values = [];
      for (const [key, val] of Object.entries(updateData)) {
        if (key === '_id' || key === 'id' || key === 'emailId') continue;
        let dbKey = key;
        let dbVal = val;
        if (key === 'status') {
          dbKey = 'show_status';
          dbVal = val === 'active' ? 'ACTIVE' : 'INACTIVE';
        }
        fieldsToUpdate.push(`${dbKey} = ?`);
        values.push(dbVal);
      }
      values.push(id, id, id);
      await pool.query(`UPDATE users SET ${fieldsToUpdate.join(', ')} WHERE (id = ? OR agency_unq_id = ? OR email = ?)`, values);
    }

    const [rows] = await pool.query("SELECT * FROM users WHERE (id = ? OR agency_unq_id = ? OR email = ?) LIMIT 1", [id, id, id]);
    if (rows.length === 0) return null;
    return wrapAgent(rows[0]);
  },

  find(query = {}) {
    let sql = "SELECT * FROM users WHERE type IN ('AGENCY', 'ADMIN')";
    const params = [];
    if (query._id) {
      sql += ' AND (id = ? OR agency_unq_id = ? OR email = ?)';
      params.push(query._id, query._id, query._id);
    }
    return new AgentQuery(pool.query(sql, params));
  },

  async create(doc) {
    const id = doc._id || doc.id;
    const emailId = doc.emailId || doc.email || id;
    const password = doc.password || '';
    const name = doc.name || '';
    
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 8);

    await pool.query(
      `INSERT INTO users (
        name, mob, email, password, img, agency_id, agency_unq_id, 
        read_status, verification, type, show_status, date, time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        '',
        emailId,
        password,
        '',
        '',
        id,
        '',
        '',
        'AGENCY',
        doc.status === 'active' ? 'ACTIVE' : 'INACTIVE',
        dateStr,
        timeStr
      ]
    );

    return wrapAgent({
      name,
      mob: '',
      email: emailId,
      password,
      img: '',
      agency_id: '',
      agency_unq_id: id,
      read_status: '',
      verification: '',
      type: 'AGENCY',
      show_status: doc.status === 'active' ? 'ACTIVE' : 'INACTIVE',
      date: dateStr,
      time: timeStr
    });
  }
};

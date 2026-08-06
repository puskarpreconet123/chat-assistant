import { pool } from '../config/mysql.js';
import { Agent } from './Agent.js';

function get12HourTime(d = new Date()) {
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strHours = String(hours).padStart(2, '0');
  return `${strHours}:${minutes}:${seconds}${ampm}`;
}

function wrapUser(row) {
  if (!row) return null;
  
  const userObj = {
    ...row,
    _id: row.email,
    emailId: row.email,
    agentId: '', // user creation has no agency id
    status: row.show_status && row.show_status.toUpperCase() === 'ACTIVE' ? 'active' : 'inactive'
  };

  Object.defineProperty(userObj, 'save', {
    enumerable: false,
    value: async function () {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const timeStr = get12HourTime(now);
      
      await pool.query(
        `UPDATE users SET 
          name = ?, mob = ?, password = ?, img = ?, agency_id = '', 
          agency_unq_id = '', read_status = ?, verification = ?, 
          type = ?, show_status = ?, date = ?, time = ?
         WHERE email = ?`,
        [
          this.name,
          this.mob || this.mobile || '',
          this.password,
          this.img || '',
          this.read_status || 'READ',
          this.verification || 'DONE',
          'USER',
          this.status && String(this.status).toUpperCase() === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
          this.date || dateStr,
          this.time || timeStr,
          this.emailId
        ]
      );
      return this;
    }
  });

  return userObj;
}

class UserQuery {
  constructor(queryPromise) {
    this.queryPromise = queryPromise;
    this.populates = [];
    this.sortOption = null;
  }

  populate(field) {
    this.populates.push(field);
    return this;
  }

  sort(option) {
    this.sortOption = option;
    return this;
  }

  async then(resolve, reject) {
    try {
      const [rows] = await this.queryPromise;
      let users = rows.map(row => wrapUser(row));

      if (this.sortOption) {
        const key = Object.keys(this.sortOption)[0];
        const order = this.sortOption[key];
        users.sort((a, b) => {
          if (a[key] < b[key]) return order === -1 ? 1 : -1;
          if (a[key] > b[key]) return order === -1 ? -1 : 1;
          return 0;
        });
      }

      resolve(users);
    } catch (err) {
      reject(err);
    }
  }
}

export const User = {
  async findOne(query) {
    let idVal = query._id;
    let emailVal = query.emailId;
    if (query.$or) {
      for (const condition of query.$or) {
        if (condition._id !== undefined) idVal = condition._id;
        if (condition.emailId !== undefined) emailVal = condition.emailId;
      }
    }

    let sql = "SELECT * FROM users WHERE type = 'USER'";
    const params = [];
    if (idVal && emailVal) {
      sql += ' AND (email = ? OR email = ?)';
      params.push(emailVal, idVal);
    } else if (idVal) {
      sql += ' AND email = ?';
      params.push(idVal);
    } else if (emailVal) {
      sql += ' AND email = ?';
      params.push(emailVal);
    }

    const [rows] = await pool.query(sql + ' LIMIT 1', params);
    if (rows.length === 0) return null;
    return wrapUser(rows[0]);
  },

  async findByIdAndUpdate(id, updateData, options = {}) {
    const emailId = updateData.emailId || updateData.email || (id.includes('@') ? id : '');
    const password = updateData.password || '';
    const name = updateData.name || '';
    const mob = updateData.mob || updateData.mobile || updateData.phone || '';
    
    // User creation requirements:
    const agencyId = '';
    const agencyUnqId = '';
    const readStatus = updateData.read_status || 'READ';
    const verification = updateData.verification || 'DONE';
    const type = 'USER';
    const rawStatus = (updateData.status || updateData.show_status || 'ACTIVE').toString().toUpperCase();
    const showStatus = rawStatus === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';

    const now = new Date();
    const dateStr = updateData.date || now.toISOString().slice(0, 10);
    const timeStr = updateData.time || get12HourTime(now);

    if (options.upsert) {
      const [existing] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [emailId]);
      if (existing.length > 0) {
        await pool.query(
          `UPDATE users SET 
            name = ?, mob = ?, password = ?, agency_id = '', agency_unq_id = '', show_status = ?, type = ?
           WHERE id = ?`,
          [name, mob, password, showStatus, type, existing[0].id]
        );
      } else {
        await pool.query(
          `INSERT INTO users (
            name, mob, email, password, img, agency_id, agency_unq_id, 
            read_status, verification, type, show_status, date, time
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            name,
            mob,
            emailId,
            password,
            updateData.img || '',
            agencyId,
            agencyUnqId,
            readStatus,
            verification,
            type,
            showStatus,
            dateStr,
            timeStr
          ]
        );
      }
    } else {
      const fieldsToUpdate = [];
      const values = [];
      for (const [key, val] of Object.entries(updateData)) {
        if (key === '_id' || key === 'id' || key === 'emailId' || key === 'agentId' || key === 'agency_id' || key === 'agency_unq_id') continue;
        
        let dbKey = key;
        let dbVal = val;
        if (key === 'mobile' || key === 'phone') dbKey = 'mob';
        if (key === 'status') {
          dbKey = 'show_status';
          dbVal = String(val).toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
        }
        
        fieldsToUpdate.push(`${dbKey} = ?`);
        values.push(dbVal);
      }
      fieldsToUpdate.push(`agency_id = ''`, `agency_unq_id = ''`, `type = 'USER'`);
      values.push(emailId);
      await pool.query(`UPDATE users SET ${fieldsToUpdate.join(', ')} WHERE email = ?`, values);
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [emailId]);
    if (rows.length === 0) return null;
    return wrapUser(rows[0]);
  },

  find(query = {}) {
    let sql = "SELECT * FROM users WHERE type = 'USER'";
    const params = [];
    if (query._id) {
      sql += ' AND email = ?';
      params.push(query._id);
    }
    return new UserQuery(pool.query(sql, params));
  },

  async updateMany(filter, updateDoc) {
    return { modifiedCount: 0 };
  },

  async deleteMany(filter) {
    const ids = filter._id && filter._id.$in;
    if (ids && ids.length > 0) {
      const placeholders = ids.map(() => '?').join(', ');
      const [result] = await pool.query(
        `DELETE FROM users WHERE email IN (${placeholders})`,
        ids
      );
      return { deletedCount: result.affectedRows };
    }
    return { deletedCount: 0 };
  },

  async create(doc) {
    const emailId = doc.emailId || doc.email || doc._id || doc.id;
    const password = doc.password || '';
    const name = doc.name || '';
    const mob = doc.mob || doc.mobile || doc.phone || '';
    
    const agencyId = '';
    const agencyUnqId = '';
    const readStatus = doc.read_status || 'READ';
    const verification = doc.verification || 'DONE';
    const type = 'USER';
    const rawStatus = (doc.status || doc.show_status || 'ACTIVE').toString().toUpperCase();
    const showStatus = rawStatus === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';

    const now = new Date();
    const dateStr = doc.date || now.toISOString().slice(0, 10);
    const timeStr = doc.time || get12HourTime(now);

    await pool.query(
      `INSERT INTO users (
        name, mob, email, password, img, agency_id, agency_unq_id, 
        read_status, verification, type, show_status, date, time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        mob,
        emailId,
        password,
        doc.img || '',
        agencyId,
        agencyUnqId,
        readStatus,
        verification,
        type,
        showStatus,
        dateStr,
        timeStr
      ]
    );

    return wrapUser({
      name,
      mob,
      email: emailId,
      password,
      img: doc.img || '',
      agency_id: agencyId,
      agency_unq_id: agencyUnqId,
      read_status: readStatus,
      verification,
      type,
      show_status: showStatus,
      date: dateStr,
      time: timeStr
    });
  }
};

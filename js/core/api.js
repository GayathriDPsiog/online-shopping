// ============================================================
// api.js — the ONLY file that talks to Firestore.
// Converts normal JS objects <-> Firestore's typed JSON and
// sends every REST call with Axios.
// ============================================================
const Api = (function () {

  // One Axios instance for all Firestore calls
  const http = axios.create({ headers: { 'Content-Type': 'application/json' } });

  // REQUEST INTERCEPTOR: runs before EVERY request and attaches the login token,
  // refreshing it first if it has expired. Pages never handle tokens themselves.
  http.interceptors.request.use(async function (config) {
    const token = await Auth.getToken();
    if (token) config.headers.Authorization = 'Bearer ' + token;
    return config;
  });

  // ---------- JS value → Firestore typed value ----------
  function toValue(v) {
    if (v === null || v === undefined) return { nullValue: null };
    if (v instanceof Date) return { timestampValue: v.toISOString() };
    if (typeof v === 'boolean') return { booleanValue: v };
    if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    if (typeof v === 'string') return { stringValue: v };
    if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
    if (typeof v === 'object') return { mapValue: { fields: toFields(v) } };
    throw new Error('Unsupported value type');
  }
  function toFields(obj) {
    const f = {};
    Object.keys(obj).forEach(function (k) {
      if (obj[k] !== undefined && k !== 'id' && k.charAt(0) !== '_') f[k] = toValue(obj[k]);
    });
    return f;
  }

  // ---------- Firestore typed value → JS value ----------
  function fromValue(v) {
    if ('stringValue' in v) return v.stringValue;
    if ('integerValue' in v) return parseInt(v.integerValue, 10);   // comes back as a string!
    if ('doubleValue' in v) return v.doubleValue;
    if ('booleanValue' in v) return v.booleanValue;
    if ('timestampValue' in v) return new Date(v.timestampValue);
    if ('nullValue' in v) return null;
    if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromValue);
    if ('mapValue' in v) return fromFields(v.mapValue.fields || {});
    return null;
  }
  function fromFields(fields) {
    const o = {};
    Object.keys(fields || {}).forEach(function (k) { o[k] = fromValue(fields[k]); });
    return o;
  }
  // A Firestore document → { id, ...fields, _updateTime }
  function fromDoc(doc) {
    const o = fromFields(doc.fields);
    o.id = doc.name.split('/').pop();
    o._updateTime = doc.updateTime;   // needed for safe purchase (preconditions)
    o._createTime = doc.createTime;
    return o;
  }
  function docName(collection, id) {
    return CONFIG.DOC_ROOT + '/' + collection + '/' + id;
  }

  // ---------- Errors ----------
  // Axios rejects for any 4xx/5xx status; err.response holds the server's reply
  function toError(axiosErr) {
    const status = axiosErr.response ? axiosErr.response.status : 0;
    let body = axiosErr.response ? axiosErr.response.data : null;
    if (Array.isArray(body)) body = body[0];
    const info = body && body.error ? body.error : {};
    let message = info.message || 'Request failed.';
    if (status === 0) message = 'No internet connection, or the request was blocked.';
    else if (status === 401 || status === 403) message = 'You do not have permission for this action. Try signing in again.';
    else if (status === 404) message = 'Not found.';
    const err = new Error(message);
    err.status = status;
    err.code = info.status || '';   // e.g. FAILED_PRECONDITION, ALREADY_EXISTS
    err.raw = info.message;
    return err;
  }

  // ---------- Core request (token added by the interceptor above) ----------
  async function request(method, url, body) {
    try {
      const res = await http.request({ method: method, url: url, data: body });
      return res.data;          // Axios has already parsed the JSON
    } catch (e) {
      throw toError(e);
    }
  }

  // ---------- CRUD ----------

  // READ all documents of a collection (follows Firestore's paging)
  async function listAll(collection) {
    let out = [], pageToken = '';
    do {
      let url = CONFIG.FS_BASE + '/' + collection + '?pageSize=300';
      if (pageToken) url += '&pageToken=' + encodeURIComponent(pageToken);
      const res = await request('GET', url);
      (res.documents || []).forEach(function (d) { out.push(fromDoc(d)); });
      pageToken = res.nextPageToken || '';
    } while (pageToken);
    return out;
  }

  // READ one document. Returns null if it does not exist.
  async function get(collection, id) {
    try {
      return fromDoc(await request('GET', CONFIG.FS_BASE + '/' + collection + '/' + encodeURIComponent(id)));
    } catch (e) {
      if (e.status === 404) return null;
      throw e;
    }
  }

  // CREATE. Without id → Firebase generates one. With id → uses that id (e.g. customer uid).
  async function create(collection, data, id) {
    let url = CONFIG.FS_BASE + '/' + collection;
    if (id) url += '?documentId=' + encodeURIComponent(id);
    return fromDoc(await request('POST', url, { fields: toFields(data) }));
  }

  // UPDATE only the given fields (updateMask) and only if the doc exists.
  async function update(collection, id, data) {
    const params = Object.keys(data)
      .filter(function (k) { return data[k] !== undefined; })
      .map(function (k) { return 'updateMask.fieldPaths=' + encodeURIComponent(k); });
    params.push('currentDocument.exists=true');
    const url = CONFIG.FS_BASE + '/' + collection + '/' + encodeURIComponent(id) + '?' + params.join('&');
    return fromDoc(await request('PATCH', url, { fields: toFields(data) }));
  }

  // DELETE
  async function remove(collection, id) {
    await request('DELETE', CONFIG.FS_BASE + '/' + collection + '/' + encodeURIComponent(id));
  }

  // QUERY with simple filters: [['field', '==', value], ['tags', 'array-contains', x]]
  async function query(collection, filters, limit) {
    const OPS = { '==': 'EQUAL', '<': 'LESS_THAN', '<=': 'LESS_THAN_OR_EQUAL', '>': 'GREATER_THAN', '>=': 'GREATER_THAN_OR_EQUAL', 'array-contains': 'ARRAY_CONTAINS' };
    const list = (filters || []).map(function (f) {
      return { fieldFilter: { field: { fieldPath: f[0] }, op: OPS[f[1]], value: toValue(f[2]) } };
    });
    const sq = { from: [{ collectionId: collection }] };
    if (list.length === 1) sq.where = list[0];
    if (list.length > 1) sq.where = { compositeFilter: { op: 'AND', filters: list } };
    if (limit) sq.limit = limit;
    const res = await request('POST', CONFIG.FS_BASE + ':runQuery', { structuredQuery: sq });
    // When nothing matches, Firestore returns [{readTime}] with no "document"
    return (res || []).filter(function (r) { return r.document; }).map(function (r) { return fromDoc(r.document); });
  }

  // ATOMIC multi-document write: all succeed or none do
  async function commit(writes) {
    return request('POST', CONFIG.FS_BASE + ':commit', { writes: writes });
  }

  return {
    listAll: listAll, get: get, create: create, update: update, remove: remove,
    query: query, commit: commit, toFields: toFields, docName: docName
  };
})();

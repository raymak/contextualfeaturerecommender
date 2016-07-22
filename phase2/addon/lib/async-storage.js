let {indexedDB, IDBKeyRange} = require('sdk/indexed-db');

var database = {};

database.onerror = console.error;

var opened = null;

function open(config) {
  if (opened != null) {
    // throw new Error ("must close before opening again");
  } else {
    opened = new Promise(function(resolve, reject) {
      //console.log( "opening" );
      var request = indexedDB.open(config.name, config.version);

      request.onupgradeneeded = function(e) {
        //console.log( "need upgrade" );
        var db = e.target.result;
        e.target.transaction.onerror = database.onerror;

        if (db.objectStoreNames.contains("items")) {
          db.deleteObjectStore("items");
        }
        db.createObjectStore("items");
      };

      request.onsuccess = function(e) {
        database.db = e.target.result;
        resolve();
      };

      request.onerror = reject;
    });
  }
// do not return a promise. user is now free to call other methods
// IE no AsyncStorage.open(...).then idiom. just open(); AsyncStorage.setItem(...) etc
// return opened;
// return null;
}

function _setItem(key, value) {
  return new Promise(function(resolve, reject) {
    let db = database.db;
    let trans = db.transaction(["items"], "readwrite");
    let store = trans.objectStore("items");
    let request = store.put(value, key);

    // trans.oncomplete = function(event) {
    request.onsuccess = function(event) {
      var val = event.target.result;
      resolve(val);
    };

    request.onerror = function(e) {
      reject(e.value);
    };
  });
}

function _getItem(key) {
  return new Promise(function(resolve, reject) {
    let db = database.db;
    let trans = db.transaction(["items"], "readwrite");
    let store = trans.objectStore("items");
    let request = store.get(key);
    request.onsuccess = function(event) {
      resolve(event.target.result);
    };

    request.onerror = function(event) {
      reject(event.value);
    };
  });
}

function _getItems() {
  return new Promise(function(resolve, reject) {
    let db = database.db;
    let trans = db.transaction(["items"], "readwrite");
    let store = trans.objectStore("items");
    let items = [];

    trans.oncomplete = function() {
      resolve(items);
    };

    let keyRange = IDBKeyRange.lowerBound(0);
    let cursorRequest = store.openCursor(keyRange);

    cursorRequest.onsuccess = function(e) {
      var result = e.target.result;
      if (!result) {
        return;
      }
      items.push(result.value);
      result.continue();
    };

    cursorRequest.onerror = reject;
  });
}

function _removeItem(key) {
  return new Promise(function(resolve, reject) {
    let db = database.db;
    let trans = db.transaction(["items"], "readwrite");
    let store = trans.objectStore("items");
    let req = store.delete(key);

    req.onsuccess = function() {
      resolve(true);
    };

    req.onerror = function() {
      reject(req.error);
    };

    req.onabort = function(event) {
      let error = event.target.error;
      if (error === 'QuotaExceededError') {
        reject(error);
      }
    // what about other aborts?
    // reject(error);
    };
  });
}


function _clear() {
  return new Promise(function(resolve, reject) {
    let db = database.db;
    let store = db.transaction(["items"], 'readwrite').objectStore("items");
    let req = store.clear();

    req.onsuccess = function() {
      resolve();
    };

    req.onerror = function() {
      reject(req.error);
    };
  });
}

function _key(n) {
  return new Promise(function(resolve, reject) {
    let db = database.db;
    let store = db.transaction(["items"], "readonly").objectStore("items");
    let advanced = false;
    let req = store.openCursor();
    req.onsuccess = function() {
      let cursor = req.result;
      if (!cursor) {
        // this means there weren't enough keys
        resolve(null);
      } else if (n === 0) {
        // We have the first key, return it if that's what they
        // wanted.
        resolve(cursor.key);
      } else {
        if (!advanced) {
          // Otherwise, ask the cursor to skip ahead n
          // records.

          // how does this resolve the promise?
          advanced = true;
          cursor.advance(n);
        } else {
          // When we get here, we've got the nth key.
          resolve(cursor.key);
        }
      }
    };

    req.onerror = function() {
      reject(req.error);
    };
  });
}

function _keys() {
  return new Promise(function(resolve, reject) {
    let db = database.db;
    let store = db.transaction(["items"], 'readonly').objectStore("items");
    let req = store.openCursor();
    let _keys = [];

    req.onsuccess = function() {
      let cursor = req.result;

      if (!cursor) {
        resolve(_keys);
      } else {
        _keys.push(cursor.key);
        cursor.continue();
      }
    };

    req.onerror = function() {
      reject(req.error);
    };

  });
}

function _length() {
  return new Promise(function(resolve, reject) {
    let db = database.db;
    let store = db.transaction(["items"], 'readonly')
      .objectStore("items");
    let req = store.count();

    req.onsuccess = function() {
      resolve(req.result);
    };

    req.onerror = function() {
      reject(req.error);
    };

  });
}

function UnopenedAsyncDB(message) {
  this.name = "UnopenedAsyncDB";
  this.message = "must call open before any other async-storage method. " + message;
}

UnopenedAsyncDB.prototype = new Error();
UnopenedAsyncDB.prototype.constructor = UnopenedAsyncDB;

function openPromisify(func) {
  return function() {
    if (opened == null) {
      throw new UnopenedAsyncDB(func.name);
    } else {
      var args = arguments;
      // console.log( "calling "+func.name);
      // console.log( "calling "+func);
      // console.log( "calling type "+(typeof func));
      // console.log( "on args "+args);
      return opened.then(function() {
        return func.apply(null, args);
      }).catch(function(err) {
        console.error("error in promisified '" + func.name + "':" + err)
      });
    }
  }
}

module.exports.AsyncStorage = {
  open: open,
  // setItem:      function() {opened.then(_setItem.apply(null, arguments))},
  setItem: openPromisify(_setItem),
  getItems: openPromisify(_getItems),
  getItem: openPromisify(_getItem),
  database: database,
  removeItem: openPromisify(_removeItem),
  clear: openPromisify(_clear),
  keys: openPromisify(_keys),
  length: openPromisify(_length),
  key: openPromisify(_key),
  UnopenedAsyncDB: UnopenedAsyncDB,
};

// Local Variables:
// compile-cmd: "cd .. && jpm test -b ~/programs/firefox/firefox-bin "
// End:

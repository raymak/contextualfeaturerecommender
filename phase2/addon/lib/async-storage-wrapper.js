/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

const AS = require("./async-storage").AsyncStorage;

function open(domain){

    const config = {
        name: 'cfr-db',
        version: 1
    };

    AS.open(config);

    let prefix = '_' + domain + '_';

    function key(i){
        return prefix + i;
    }

    return {
        getItem: i => AS.getItem(key(i)),
        setItem: (i, v) => AS.setItem(key(i), v),
        removeItem: i => AS.removeItem(key(i)), 
        keys: ()=> AS.keys().then(ks => ks.filter(k => k.startsWith(prefix)).map(k => k.substring(prefix.length))),
        length: ()=> this.keys().then(ks => ks.length),
        removeAll: ()=> this.keys().then(k => this.removeItem(k)), 
        clear: ()=> AS.clear()  // clears all
    }
}

exports.open = open;
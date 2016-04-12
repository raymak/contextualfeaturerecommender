/*! This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

const {event} = require('./stats');
const {isPrivate} = require("sdk/private-browsing");
const windows = require("sdk/windows").browserWindows;
const tabs = require("sdk/tabs");
const {Cu} = require("chrome");
const {WindowTracker} = require("sdk/deprecated/window-utils");
const {isBrowser} = require("sdk/window/utils");
const unload = require("sdk/system/unload").when;

function init(){
  start();
}

function start(){

  // tab opening
  tabs.on('open', (t)=>{
    if (isPrivate(t)) return;

    let num = tabs.length;
    event('tab-open', {type: 'extra'}, {num: num}, {num: 'average'});
  });

  // window opening
  windows.on('open', (w)=>{
    if (isPrivate(w)) return;

    console.log("window open");
    let num = windows.length;
    event('window-open', {type: 'extra'}, {num: num}, {num: 'average'});
  });

  let wt = new WindowTracker({
    onTrack: function(window){

      if (!isBrowser(window) || isPrivate(window)) return;


      let warn = function(element){
        require('./logger').logMissingElement({
          type: "extra-missing",
          message: "Extra listener could not select an element.",
          info: {element: element}
        });
      }

      // burger button
      let f = function(){
        event('burger-button', {type: 'extra'});
      }

      let button = Cu.getWeakReference(window.document.getElementById("PanelUI-menu-button"));
      if (button.get()){
        button.get().addEventListener("click", f);
        unload(function(){
          if (button.get())
            button.get().removeEventListener("click", f);
        })
      }
      else
        warn('burger-button');

      f = function(){
        event('searchbar', {type: 'extra'});
      }

      // search bar
      
      if (!window.document.getElementById("searchbar"))
        warn('searchbar')
      else {
        let bar = Cu.getWeakReference(window.document
        .getAnonymousElementByAttribute(
          window.document.getElementById("searchbar")
          , "anonid", "searchbar-textbox"));

        if (bar.get()){
          bar.get().addEventListener("focus", f)
          unload(function(){
            if (bar.get())
              bar.get().removeEventListener("focus", f);
          });
        }
        else
          warn('searchbar-textbox');
      }

      // home button

      f = function(){
        event('home-button', {type: 'extra'});
      }

      button = Cu.getWeakReference(window.document.getElementById("home-button"));
      if (button.get()){
        button.get().addEventListener("click", f);
        unload(function(){
          if (button.get())
            button.get().removeEventListener("click", f);
        });
      }
      else
        warn('home-button');
  

      // loop button

      f = function(){
        event('loop-button', {type: 'extra'});
      }

      button = Cu.getWeakReference(window.document.getElementById("loop-button"));
      if (button.get()){
        button.get().addEventListener("click", f);
        unload(function(){
          if (button.get())
            button.get().removeEventListener("click", f);
        });
      }
      else
        warn('loop-button');

      // pocket button
      
      f = function(){
        event('pocket-button', {type: 'extra'});
      }

      button = Cu.getWeakReference(window.document.getElementById("pocket-button"));
      if (button.get()){
        button.get().addEventListener("click", f);
        unload(function(){
          if (button.get())
            button.get().removeEventListener("click", f);
        })
      }
      else
        warn('pocket-button');

      // downloads button
      
      f = function(){
        event('downloads-button', {type: 'extra'});
      }

      button = Cu.getWeakReference(window.document.getElementById("downloads-button"));
      if (button.get()){
        button.get().addEventListener("click", f);
        unload(function(){
          if (button.get())
            button.get().removeEventListener("click", f);
        })
      }
      else
        warn('downloads-button');

      // show history
      
      f = function(){
        event('show-history', {type: 'extra'});
      }

      let historyCmd = Cu.getWeakReference(window.document.getElementById("Browser:ShowAllHistory"));
      if (historyCmd.get()){
        historyCmd.get().addEventListener("command", f);
        unload(function(){
          if (historyCmd.get())
            historyCmd.get().removeEventListener("command", f);
        });
      }
      else
        warn('show-history');
    }
  });

}

exports.init = init;
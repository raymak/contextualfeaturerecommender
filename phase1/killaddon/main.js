/** Self-destruct (uninstall) this addon
 *
 * @param {string} id addon id
 * @return promise (sdk/adddon/installer).uninstall
 * @memberOf main
 * @name killaddon
 */
let killaddon = exports.killaddon = function (id) {
  id = id === undefined ? require('sdk/self').id : id;
  console.log("attempting to remove addon:", id);
  return require("sdk/addon/installer")
    .uninstall(id);
};

killaddon();

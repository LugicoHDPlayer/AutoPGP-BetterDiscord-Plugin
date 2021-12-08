/**
 * @name AutoPGP
 * @version 0.0.1
 * @description Automatically encrypt messages using OpenPGP (end-to-end encryption) to allow secure communication with your friends.
 * @author Lugico
 * @authorId 334304458924359681
 *
 */

const settingsfile = "./AutoPGP.conf.json";
console.log("Settings File: ", require("path").resolve(settingsfile));

const fs = require('fs');

/**
 * @author samogot
 */
const DI = window.DiscordInternals;
const hasLib = !!(DI && DI.versionCompare && DI.versionCompare(DI.version || "", "1.9") >= 0);
const WebpackModules = hasLib && DI.WebpackModules || (() => {

  const req = typeof(webpackJsonp) == "function" ? webpackJsonp([], {
    '__extra_id__': (module, exports, req) => exports.default = req
  }, ['__extra_id__']).default : webpackJsonp.push([
    [], {
      '__extra_id__': (module, exports, req) => module.exports = req
    },
    [
      ['__extra_id__']
    ]
  ]);
  delete req.m['__extra_id__'];
  delete req.c['__extra_id__'];

  /**
   * Predicate for searching module
   * @callback modulePredicate
   * @param {*} module Module to test
   * @return {boolean} Returns `true` if `module` matches predicate.
   */

  /**
   * Look through all modules of internal Discord's Webpack and return first one that matches filter predicate.
   * At first this function will look through already loaded modules cache. If no loaded modules match, then this function tries to load all modules and match for them. Loading any module may have unexpected side effects, like changing current locale of moment.js, so in that case there will be a warning the console. If no module matches, this function returns `null`. You should always try to provide a predicate that will match something, but your code should be ready to receive `null` in case of changes in Discord's codebase.
   * If module is ES6 module and has default property, consider default first; otherwise, consider the full module object.
   * @param {modulePredicate} filter Predicate to match module
   * @param {object} [options] Options object.
   * @param {boolean} [options.cacheOnly=false] Set to `true` if you want to search only the cache for modules.
   * @return {*} First module that matches `filter` or `null` if none match.
   */
  const find = (filter, options = {}) => {
    const {
      cacheOnly = false
    } = options;
    for (let i in req.c) {
      if (req.c.hasOwnProperty(i)) {
        let m = req.c[i].exports;
        if (m && m.__esModule && m.default && filter(m.default))
          return m.default;
        if (m && filter(m))
          return m;
      }
    }
    if (cacheOnly) {
      console.warn('Cannot find loaded module in cache');
      return null;
    }
    console.warn('Cannot find loaded module in cache. Loading all modules may have unexpected side effects');
    for (let i = 0; i < req.m.length; ++i) {
      let m = req(i);
      if (m && m.__esModule && m.default && filter(m.default))
        return m.default;
      if (m && filter(m))
        return m;
    }
    console.warn('Cannot find module');
    return null;
  };

  /**
   * Look through all modules of internal Discord's Webpack and return first object that has all of following properties. You should be ready that in any moment, after Discord update, this function may start returning `null` (if no such object exists anymore) or even some different object with the same properties. So you should provide all property names that you use, and often even some extra properties to make sure you'll get exactly what you want.
   * @see Read {@link find} documentation for more details how search works
   * @param {string[]} propNames Array of property names to look for
   * @param {object} [options] Options object to pass to {@link find}.
   * @return {object} First module that matches `propNames` or `null` if none match.
   */
  const findByUniqueProperties = (propNames, options) => find(module => propNames.every(prop => module[prop] !== undefined), options);

  /**
   * Look through all modules of internal Discord's Webpack and return first object that has `displayName` property with following value. This is useful for searching for React components by name. Take into account that not all components are exported as modules. Also, there might be several components with the same name.
   * @see Use {@link ReactComponents} as another way to get react components
   * @see Read {@link find} documentation for more details how search works
   * @param {string} displayName Display name property value to look for
   * @param {object} [options] Options object to pass to {@link find}.
   * @return {object} First module that matches `displayName` or `null` if none match.
   */
  const findByDisplayName = (displayName, options) => find(module => module.displayName === displayName, options);

  return {
    find,
    findByUniqueProperties,
    findByDisplayName
  };

})();

let config = {
  privkeys: [],
  keys: {}
};

module.exports = (() => {

  function saveSettings() {
    console.log("saving", config);
    try {
      fs.writeFileSync(settingsfile, JSON.stringify(config));
    } catch (e) {
      console.error(e);
    }
  }

  function loadSettings() {
    if (!fs.existsSync(settingsfile)) {
      saveSettings();
    }

    try {
      let loadedsettings = JSON.parse(fs.readFileSync(settingsfile, 'utf-8'));
      config = loadedsettings;
    } catch (e) {
      BdApi.alert("Settings could not be loaded");
      try {
        fs.writeFileSync(settingsfile, "{}");
      } catch (e) {
        console.error(e);
      }
      console.error(e);
    }
  }

  function getCurrentChannel() {
    let path = window.location.href.split("/");
    return path.slice(path.length - 2);
  }

  function keyentry(key = "", label = "", keyplaceholder = "PUBLIC KEY") {
    let wrapper = document.createElement("div");
    wrapper.style.display = "flex";
    wrapper.style.margin = "10px";
    wrapper.style.alignItems = "center";

    let keyinput = document.createElement("textarea");
    keyinput.value = key;
    keyinput.placeholder = keyplaceholder;
    keyinput.className = "inputDefault-_djjkz input-cIJ7To keyinput";

    let labelinput = document.createElement("input");
    labelinput.value = label;
    labelinput.placeholder = "LABEL";
    labelinput.className = "inputDefault-_djjkz input-cIJ7To labelinput";

    let remove = document.createElement("button");
    remove.innerHTML = "-";
    remove.className = "disableButton-220a9y button-38aScr lookFilled-1Gx00P colorRed-1TFJan sizeSmall-2cSMqn grow-q77ONN";
    remove.addEventListener("click", () => {
      wrapper.parentNode.removeChild(wrapper);
    });

    wrapper.appendChild(labelinput);
    wrapper.appendChild(keyinput);
    wrapper.appendChild(remove);
    return wrapper;
  }

  function clickHandler(e) {
    if (e.target.classList.contains("messageContent-2qWWxC")) {
      decryptMessage(e.target);
    }
    if (e.target.classList.contains("message-2qnXI6")) {
      decryptMessage(e.target.getElementsByClassName("messageContent-2qWWxC")[0]);
    }
  }

  async function decryptMessage(element) {
    let message = element.innerHTML;
    let keys = [];
    for (let i in config.privkeys) {
      keys.push(config.privkeys[i].key);
    }
    let pgpmessage;
    try {
      pgpmessage = await openpgp.readMessage({
        armoredMessage: message,
      });
    } catch (e) {
      BdApi.alert("Invalid Message","This message doesn't seem to be a PGP Encrypted message.");
      return;
    }
    for (let i in keys) {
      let encryptedPrivateKey;
      try {
        encryptedPrivateKey = await openpgp.readPrivateKey({
          armoredKey: keys[i]
        });
      } catch (e) {
        BdApi.alert("Invalid Private Key","Your private key with the label " + config.privkeys[i].label + "' seems to be faulty.");
        continue;
      }
      let privateKey;
      if (encryptedPrivateKey.keyPacket.isEncrypted) {
				// privateKey = await openpgp.decryptKey({
				// 	privateKey: encryptedPrivateKey,
				// 	passphrase: passphrase
				// });
        // BdApi.alert("Passphrase required.","Your private key with the label " + config.privkeys[i].label + "' requires a passphrase. This feature is not yet supported.");
        continue;
			} else {
				privateKey = encryptedPrivateKey;
			}

      try {
        console.log(pgpmessage);
				let { data: decrypted, signatures } = await openpgp.decrypt({
					message: pgpmessage,
					decryptionKeys: privateKey,
					expectSigned: false
				});
				element.innerHTML = "<span style='font-size:1.5em'>" + decrypted + "</span>";
        return;
			} catch (e) {
				console.log(e);
			}
    }
    BdApi.alert("couldn't decrypt message");
  }

  function publicKeys(channel) {
    if (!config.keys[channel[0]]) {
      config.keys[channel[0]] = {};
    }
    if (!config.keys[channel[0]][channel[1]]) {
      config.keys[channel[0]][channel[1]] = [];
    }

    let keys = config.keys[channel[0]][channel[1]];
    let clicknet = document.createElement("div");
    clicknet.style.position = "fixed";
    clicknet.style.width = "100vw";
    clicknet.style.height = "100vh";
    clicknet.style.top = "0px";
    clicknet.style.left = "0px";
    clicknet.style.zIndex = "9999";
    clicknet.style.backgroundColor = "rgba(0,0,0,0.8)";

    let mainwrapper = document.createElement("div");
    mainwrapper.style.position = "fixed";
    mainwrapper.style.width = "100vw";
    mainwrapper.style.height = "100vh";
    mainwrapper.style.display = "flex";
    mainwrapper.style.justifyContent = "center";
    mainwrapper.style.alignItems = "center";
    mainwrapper.style.zIndex = "10000";
    mainwrapper.style.pointerEvents = "none";


    // innerwrapper.style.width = "700px";
    // innerwrapper.style.height = "80vh";
    // innerwrapper.style.boxSizing = "border-box";
    let innerwrapper = document.createElement("div");
    innerwrapper.style.backgroundColor = "var(--background-primary)";
    innerwrapper.style.position = "relative";
    innerwrapper.style.padding = "30px";
    innerwrapper.style.borderRadius = "5px";
    innerwrapper.style.pointerEvents = "auto";
    innerwrapper.style.minWidth = "500px";
    innerwrapper.style.minHeight = "600px";
    mainwrapper.appendChild(innerwrapper);

    let caption = document.createElement("span");
    caption.innerHTML = "Public Keys for this channel";
    caption.style.fontSize = "2em";
    caption.style.fontWeight = "bold";
    caption.style.color = "white";
    innerwrapper.appendChild(caption);


    let keyswrapper = document.createElement("div");
    keyswrapper.style.marginBottom = "50px";
    for (var i in keys) {
      keyswrapper.appendChild(keyentry(keys[i]["key"], keys[i]["label"]));
    }
    innerwrapper.appendChild(keyswrapper);

    let buttonswrapper = document.createElement("div");
    buttonswrapper.style.display = "flex";
    buttonswrapper.style.position = "absolute";
    buttonswrapper.style.width = "calc(100% - 60px)";
    buttonswrapper.style.justifyContent = "space-between";
    buttonswrapper.style.bottom = "30px";

    let addnewbutton = document.createElement("button");
    addnewbutton.innerHTML = "Add new";
    addnewbutton.className = "shinyButton-3uFlM- button-38aScr lookFilled-1Gx00P colorGreen-29iAKY sizeMedium-1AC_Sl grow-q77ONN";
    buttonswrapper.appendChild(addnewbutton);

    let savebutton = document.createElement("button");
    savebutton.innerHTML = "Save";
    savebutton.style.fontSize = "1em";
    savebutton.style.padding = "20px";
    savebutton.className = "button-38aScr lookFilled-1Gx00P colorBrand-3pXr91 sizeSmall-2cSMqn grow-q77ONN";
    savebutton.position = "absolute";
    buttonswrapper.appendChild(savebutton);

    innerwrapper.appendChild(buttonswrapper);


    addnewbutton.addEventListener("click", () => {
      keyswrapper.appendChild(keyentry());
    });

    savebutton.addEventListener("click", () => {

      let keys = [];
      let keywrappers = keyswrapper.childNodes.length;
      for (let i = 0; i < keywrappers; i++) {
        keys.push({
          key: keyswrapper.childNodes[i].childNodes[1].value,
          label: keyswrapper.childNodes[i].childNodes[0].value
        });
      }
      config.keys[channel[0]][channel[1]] = keys;
      saveSettings();
      closePopup();
    });

    clicknet.addEventListener("click", closePopup);
    document.body.appendChild(mainwrapper);
    document.body.appendChild(clicknet);

    function closePopup() {
      document.body.removeChild(mainwrapper);
      document.body.removeChild(clicknet);
    }

  }


  let openpgpscript = document.createElement("script");
  openpgpscript.src = "https://unpkg.com/openpgp@5.0.1/dist/openpgp.js";

  let encryptbuttoncontainer = document.createElement("div");
  encryptbuttoncontainer.className = "buttonContainer-28fw2U";

  let encryptbutton = document.createElement("button");
  encryptbutton.dataset.enabled = "false";
  encryptbutton.tabIndex = 0;
  encryptbutton.className = "button-38aScr lookBlank-3eh9lL colorBrand-3pXr91 grow-q77ONN";
  encryptbutton.innerHTML = `<div class="contents-18-Yxp button-3AYNKb button-318s1X stickerButton-3OEgwj"><div class="buttonWrapper-1ZmCpA" id="children" style="opacity: 1; transform: none;"><svg width="24" height="24" viewbox="0 0 1200 896">
    <path fill="currentColor" d="M640.9 63.89999999999998c-141.4 0-256 114.6-256 256 0 19.6 2.2 38.6 6.4 56.9L0 768v64l64 64h128l64-64v-64h64v-64h64v-64h128l70.8-70.8c18.7 4.3 38.1 6.6 58.1 6.6 141.4 0 256-114.6 256-256S782.2 63.89999999999998 640.9 63.89999999999998zM384 512L64 832v-64l320-320V512zM704 320c-35.3 0-64-28.7-64-64 0-35.3 28.7-64 64-64s64 28.7 64 64C768 291.29999999999995 739.3 320 704 320z" />
    </svg></div></div>`;
  encryptbutton.addEventListener("click", function(e) {

    if (encryptbutton.dataset.enabled == "true") {
      encryptbutton.dataset.enabled = "false";
      encryptbutton.getElementsByTagName("path")[0].setAttribute("fill", "currentColor");
    } else {
      currentChannel = getCurrentChannel();
      if (config.keys[currentChannel[0]] && config.keys[currentChannel[0]][currentChannel[1]] && config.keys[currentChannel[0]][currentChannel[1]].length > 0) {
        encryptbutton.dataset.enabled = "true";
        encryptbutton.getElementsByTagName("path")[0].setAttribute("fill", "lime");
      } else {
        publicKeys(currentChannel);
      }
    }

  });

  encryptbutton.addEventListener("contextmenu", function(e) {
    publicKeys(getCurrentChannel());
  });

  encryptbuttoncontainer.appendChild(encryptbutton);


  function addEncryptButton() {
    if (document.getElementsByClassName("buttons-3JBrkn")[0] != undefined) {
      document.getElementsByClassName("buttons-3JBrkn")[0].appendChild(encryptbuttoncontainer);
    }
    encryptbutton.dataset.enabled = "false";
    encryptbutton.getElementsByTagName("path")[0].setAttribute("fill", "currentColor");
  }

  let interval;
  return class AutoPGP {
    load() {
      loadSettings();
    }
    start() {
      loadSettings();

      document.addEventListener("dblclick", clickHandler);

      // const versions = globalThis.process.versions;
      delete globalThis.process.versions;
      document.head.appendChild(openpgpscript);

      addEncryptButton();
      const module = WebpackModules.findByUniqueProperties(["sendMessage"], {
        cacheOnly: true
      });
      this.SendMessagePatch = BdApi.monkeyPatch(module, "sendMessage", {
        instead: async (e) => {

          let channel = getCurrentChannel();
          if (encryptbutton.dataset.enabled == "true") {
            if (config.keys[channel[0]] && config.keys[channel[0]][channel[1]] && config.keys[channel[0]][channel[1]].length > 0) {
              var message = e.methodArguments[1].content;


              let publicKeyArmored;
              let publicKey;
              if (config.keys[channel[0]][channel[1]].length == 1) {
                let publicKeyArmored = config.keys[channel[0]][channel[1]][0].key;

                try {
                  publicKey = await openpgp.readKey({
                    armoredKey: publicKeyArmored
                  });
                } catch (e) {
                  BdApi.alert("Couldn't read public key!");
                }
              } else {
                let publicKeysArmored = [];
                for (let i in config.keys[channel[0]][channel[1]]) {
                  publicKeysArmored.push(config.keys[channel[0]][channel[1]][i].key);
                }
                try {
                  publicKey = await Promise.all(publicKeysArmored.map(armoredKey => openpgp.readKey({
                    armoredKey
                  })));
                } catch (e) {
                  BdApi.alert("Couldn't read public key!");
                }
              }
              try {
                let encrypted = await openpgp.encrypt({
                  message: await openpgp.createMessage({
                    text: message
                  }),
                  encryptionKeys: publicKey
                });
                e.methodArguments[1].content = encrypted;
                console.log(e.methodArguments);
                e.originalMethod(e.methodArguments[0], e.methodArguments[1], e.methodArguments[2], e.methodArguments[3]);
              } catch (e) {
                BdApi.alert("Couldn't encrypt message!");
                console.error(e);
              }

            } else {
              BdApi.alert("No public keys found.");
            }
          } else {
            e.callOriginalMethod();
          }

        }
      });
    }
    stop() {
      try {
        document.getElementsByClassName("buttons-3JBrkn")[0].removeChild(encryptbuttoncontainer);
      } catch (e) {}
      try {
        document.head.removeChild(openpgpscript);
      } catch (e) {}

      if (this.SendMessagePatch) {
        this.SendMessagePatch();
      }

      saveSettings();
      document.removeEventListener("dblclick", clickHandler);
    }

    getSettingsPanel() {
      let keyswrapper = document.createElement("div");
      keyswrapper.style.marginBottom = "50px";

      if (!config.privkeys) {
        config.privkeys = [];
      }

      let addnewbutton = document.createElement("button");
      addnewbutton.innerHTML = "Add new";
      addnewbutton.className = "shinyButton-3uFlM- button-38aScr lookFilled-1Gx00P colorGreen-29iAKY sizeMedium-1AC_Sl grow-q77ONN";
      addnewbutton.addEventListener("click", () => {
        let entry = keyentry('', '', 'PRIVATE KEY');
        entry.childNodes[0].addEventListener("change", saveprivkeys);
        entry.childNodes[1].addEventListener("change", saveprivkeys);
        entry.childNodes[2].addEventListener("click", saveprivkeys);
        keyswrapper.appendChild(entry);
      })
      keyswrapper.appendChild(addnewbutton);

      let keys = config.privkeys;
      for (var i in keys) {
        let entry = keyentry(keys[i]["key"], keys[i]["label"], 'PRIVATE KEY');
        entry.childNodes[0].addEventListener("change", saveprivkeys);
        entry.childNodes[1].addEventListener("change", saveprivkeys);
        entry.childNodes[2].addEventListener("click", saveprivkeys);
        keyswrapper.appendChild(entry);
      }

      function saveprivkeys() {
        let keys = [];
        let keywrappers = keyswrapper.childNodes.length;
        for (let i = 1; i < keywrappers; i++) {
          console.log(keyswrapper.childNodes[i]);
          keys.push({
            key: keyswrapper.childNodes[i].childNodes[1].value,
            label: keyswrapper.childNodes[i].childNodes[0].value
          });
        }
        config.privkeys = keys;
        console.log(keys);
        saveSettings();
      }


      return keyswrapper;
    }

    onSwitch() {
      addEncryptButton();
    }

  }
})();

(function (scope) {
  "use strict";

  /**
   * B14CC class.
   *
   * @param {HTMLElement} context
   */
  function B14CC(context) {
    this.context = context || document;

    this.items = {};
    this.enabled = {};
    this.alternativeChecks = {};
    this.onTrack = scope.b14ccOnTrack || [];
    this.onActivate = scope.b14cconActivate || [];

    this.hasCallbacks = {};
  }


  /**
   * Generate an UUID (this is not any RFC compliant).
   * @return {string}
   *   [timestamp]-[6 radix 24]-[6 radix 24]-[4 radix 24]
   */
  B14CC.generateUUID = function () {
    var
      b24e3 = 13824,
      b24e5 = 7962624,
      parts = [
        (new Date).getTime(),
        // Radix 24, 6 characters
        Math.round((1 + Math.random()) * b24e5).toString(24),
        Math.round((1 + Math.random()) * b24e5).toString(24),
        // Radix 24, 4 characters
        Math.round((1 + Math.random()) * b24e3).toString(24)
      ];

    return parts.join('-');
  };

  /**
   * Get a random string.
   */
  B14CC.random = function (len, radix) {
    var pow = Math.pow(radix, len - 1);

    return Math.round((1 + Math.random()) * pow).toString(radix);
  };

  /**
   * @param {HTMLElement} dElement
   * @param {string} htmlClass
   */
  B14CC.lookUp = function (dElement, htmlClass) {
    if (dElement.classList.contains(htmlClass)) {
      return dElement;
    }

    return B14CC.lookUp(dElement.parentElement, htmlClass);
  };

  B14CC.prototype.hideStartup = function () {
    var dSelector = this.context.querySelector('.b14cc');

    if (!dSelector) {
      return false;
    }

    return dSelector.classList.contains('b14cc-hide-start');
  };

  B14CC.prototype.noExecute = function () {
    var dSelector = this.context.querySelector('.b14cc');

    if (!dSelector) {
      return false;
    }

    return dSelector.classList.contains('b14cc-no-execute');
  };

  /**
   * Setup the B14CC instance.
   */
  B14CC.prototype.setup = function () {
    var dSelector = this.context.querySelector('.b14cc');
    if (!dSelector) {
      return this;
    }

    dSelector.attributes.tabindex = '-1';

    var
      l,
      dCheckbox,
      me = this,
      consents = this.getConstents(),
      missing = this.missingItems(),
      dItemCheckboxes = dSelector.querySelectorAll('.b14cc-item [type="checkbox"]'),
      dGroups = dSelector.querySelectorAll('.b14cc-group'),
      dDescriptionMoreTrigger = dSelector.querySelector('.b14cc-description__more--trigger'),
      dSetNoneTrigger = dSelector.querySelector('.js-b14cc-set-none'),
      dSetAllTrigger = dSelector.querySelector('.js-b14cc-set-all'),
      dDescriptionMore = dSelector.querySelector('.b14cc-description__more'),
      alternatives = dSelector.getAttribute('data-alternatives'),
      enabled = dSelector.getAttribute('data-enabled').split(','),
      checkedByDefault = dSelector.getAttribute('data-checked') == 1;

    if (alternatives) {
      this.alternativeChecks = JSON.parse(atob(alternatives));
    }

    for (var i in enabled) {
      this.enabled[enabled[i]] = 'dummy';
    }

    // More fold out
    if (dDescriptionMoreTrigger) {
      dDescriptionMoreTrigger.addEventListener('click', function (ev) {
        ev.preventDefault();
        if (dDescriptionMore.classList.contains('is-open')) {
          dDescriptionMore.classList.remove('is-open');
          dDescriptionMoreTrigger.classList.remove('is-open');
        } else {
          dDescriptionMore.classList.add('is-open');
          dDescriptionMoreTrigger.classList.add('is-open');
        }
      });
    }

    // Setup items.
    l = dItemCheckboxes.length;
    while (l--) {
      dCheckbox = dItemCheckboxes[l];

      // Update group checkbox.
      dCheckbox.addEventListener('change', function () {
        me.domUpdateGroupCheck(B14CC.lookUp(this, 'b14cc-group'));
      });

      // Set checked.
      if (consents[dCheckbox.name] === true || (checkedByDefault && consents[dCheckbox.name] !== false)) {
        dCheckbox.setAttribute('checked', 'checked');
      }

      // Is the user missing this.
      if (missing.indexOf(dCheckbox.name)) {
        B14CC.lookUp(dCheckbox, 'b14cc-item').classList.add('b14cc-item--missing');
      }
    }

    l = dGroups.length;
    while (l--) {
      // Update plugin checks.
      dGroups[l].querySelector('.b14cc-group__checkbox').addEventListener('change', function (ev) {
        var
          dChecks = B14CC.lookUp(this, 'b14cc-group').querySelectorAll('.b14cc-group__items [type="checkbox"]'),
          l = dChecks.length;

        while (l--) {
          dChecks[l].checked = this.checked;
        }

      });
      dGroups[l].querySelector('.b14cc-group__checkbox').addEventListener('keydown', function (ev) {
        if(ev.keyCode === 13) {
          this.parentElement.querySelector('.b14cc-group__open').click();
        }
      })
      // Show / Hide plugins.
      dGroups[l].querySelector('.b14cc-group__open').addEventListener('click', function (ev) {
        var
          dGroupItems = B14CC.lookUp(this, 'b14cc-group');

        dGroupItems.classList.contains('is-open') ? dGroupItems.classList.remove('is-open') : dGroupItems.classList.add('is-open');
      });

      this.domUpdateGroupCheck(dGroups[l]);
    }

    // Setup the set link.
    dSelector.querySelector('.js-b14cc-set').addEventListener('click', function (ev) {
      var checks = dSelector.querySelectorAll('.b14cc-item [type="checkbox"]');
      me.submitConsent.call(me, checks);
      ev.preventDefault();
    });

    // Set all link
    dSetAllTrigger.addEventListener('click', function (ev) {
      var
        groupChecks = dSelector.querySelectorAll('.b14cc-group .b14cc-group__checkbox'),
        checks = dSelector.querySelectorAll('.b14cc-group .b14cc-item [type="checkbox"]'),
        lg = groupChecks.length,
        lc = checks.length;

      me.clearConsent();
      console.log(groupChecks, checks);

      while (lg--) {
        groupChecks[lg].checked = true;
      }

      while (lc--) {
        checks[lc].checked = true;
      }

      me.submitConsent.call(me, checks);

      ev.preventDefault();
    });

    // Set the none link
    if (dSetNoneTrigger) {
      dSetNoneTrigger.addEventListener('click', function (ev) {
        var
          groupChecks = dSelector.querySelectorAll('.b14cc-group:not(.b14cc-group--key-necessary) .b14cc-group__checkbox'),
          checks = dSelector.querySelectorAll('.b14cc-group:not(.b14cc-group--key-necessary) .b14cc-item [type="checkbox"]'),
          lg = groupChecks.length,
          lc = checks.length;

        me.clearConsent();

        while (lg--) {
          groupChecks[lg].checked = false;
        }

        while (lc--) {
          checks[lc].checked = false;
        }

        me.submitConsent.call(me, checks);

        ev.preventDefault();
      });
    }


    return this;
  };

  /**
   * Parse the context.
   *
   * @return {B14CC}
   */
  B14CC.prototype.parse = function () {
    var
      key, item, group,
      elements = this.context.querySelectorAll('[data-b14cc-key]'),
      l = elements.length;

    while (l--) {
      item = elements[l];

      key = item.getAttribute('data-b14cc-key');
      item.removeAttribute('data-b14cc-key');

      this.items[key] = this.items[key] || [];

      this.items[key].push(item);
      this.addToDiscovery(key);
    }

    return this;
  };

  /**
   * Checks for consents, and activate the allowed ones.
   *
   * @return {B14CC}
   */
  B14CC.prototype.checkAndActivate = function () {
    var
      key, alternative,
      plugin,
      consents = this.getConstents();

    for (plugin in this.enabled) {
      if (consents[plugin] === true) {
        this.activatePlugin(plugin);
      }
    }

    for (key in this.alternativeChecks) {
      alternative = this.alternativeChecks[key];
      if (this.alternatives[alternative[0]] && consents[key] !== true) {
        this.alternatives[alternative[0]].apply(this, alternative[1]);
      }
    }

    return this;
  };

  /**
   * Alternatives that doesn't use cookies.
   */
  B14CC.prototype.alternatives = {
    /**
     * Google analytics
     *
     * @param {string} tracking_id
     */
    ga: function (tracking_id) {
      var
        data,
        sendData,
        xhr = new XMLHttpRequest();

      data = {
        // Version.
        v: 1,
        // Type.
        t: 'pageview',
        // Client ID.
        uid: (new Date).getTime().toString(30).substr(-4) + B14CC.random(12, 24),
        // Tracking ID.
        tid: tracking_id,
        // Document path.
        dp: location.pathname + location.search,
        // Document path.
        dh: location.host,
        // User agent.
        ua: navigator.userAgent,
        // Anonymize IP.
        aip: 1

      };

      sendData = [];
      for (var i in data) {
        sendData.push(encodeURIComponent(i) + '=' + encodeURIComponent(data[i]));
      }

      xhr.open('POST', 'https://www.google-analytics.com/debug/collect');
      xhr.send(sendData.join('&'));
    }
  };

  /**
   * Check the consent group.
   */
  B14CC.prototype.checkAndDisplaySelector = function () {
    var missing = this.missingItems();

    if (missing.length > 0) {
      this.toggleSelector();
    }

    return this;
  };

  /**
   * Get groups that is missing a decision
   */
  B14CC.prototype.missingItems = function () {
    var
      key,
      missing = [],
      consents = this.getConstents();

    for (key in this.enabled) {
      if (consents[key] === undefined) {
        missing.push(key);
      }
    }

    return missing;
  };

  /**
   * Submit the consent
   */
  B14CC.prototype.submitConsent = function (checks) {
    var
      dCheck,
      checks = checks,
      l = checks.length,
      me = this;

    me.clearConsent();
    while (l--) {
      dCheck = checks[l];
      me.setConsent(dCheck.name, dCheck.checked, true);
    }
    me
      .trackConsent(function () {
        me.checkAndActivate()
          .toggleSelector(false);
      });
  };

  /**
   * Create group HTML element.
   *
   * @param {HTMLElement} dGroup
   */
  B14CC.prototype.domUpdateGroupCheck = function (dGroup) {
    var
      checked = true,
      dChecks = dGroup.querySelectorAll('.b14cc-group__items [type="checkbox"]'),
      l = dChecks.length;

    while (l--) {
      if (dChecks[l].checked === false) {
        checked = false;
        break;
      }
    }

    dGroup.querySelector('.b14cc-group__checkbox').checked = checked;
  };

  /**
   * Show the consent selector.
   */
  B14CC.prototype.toggleSelector = function (force) {
    var dSelector = this.context.querySelector('.b14cc');

    if (force === undefined) {
      force = !dSelector.classList.contains('b14cc--show');
    }

    if (force === true) {
      dSelector.classList.add('b14cc--show');
      dSelector.classList.remove('b14cc--hide');
    }
    else if (force === false) {
      dSelector.classList.remove('b14cc--show');
    }
  };

  /**
   * Activates a plugin
   */
  B14CC.prototype.activatePlugin = function (key) {
    var
      l, i, hi,
      items = this.items[key];

    for (i in this.onActivate) {
      this.onActivate[i](key);
    }

    if (!items) {
      return this;
    }

    l = items.length;

    while (l--) {
      this.activateItem(items[l]);
    }
    this.items[key] = [];

    if (this.hasCallbacks[key]) {
      for (i in this.hasCallbacks[key]) {
        this.hasCallbacks[key][i](key);
      }
    }

    return this;
  };

  /**
   * Activate a specific HTML element.
   *
   * @param {HTMLElement} item
   *
   * @return {B14CC}
   */
  B14CC.prototype.activateItem = function (item) {
    if (item.hasAttribute('data-b14cc-handler')) {
      this.handlers[item.getAttribute('data-b14cc-handler')].call(this, item);
    } else {
      this.types[item.nodeName.toLowerCase()].call(this, item);
    }

    return this;
  };

  /**
   * Clear consent.
   */
  B14CC.prototype.clearConsent = function () {
    localStorage.removeItem('b14cc');
    window.dispatchEvent(new Event('b14cc__change'));

    return this;
  };

  /**
   * Track the consent.
   *
   * @param {function} callback
   *   A function called, when the backed returns.
   */
  B14CC.prototype.trackConsent = function (callback) {
    var
      me = this,
      xhr = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject('Microsoft.XMLHTTP'),
      query = [
        'uuid=' + this.getUUID(),
        'consent=' + JSON.stringify(this.getConstents())
      ];

    xhr.open('GET', '/b14cookieconsent?' + query.join('&'));
    xhr.onreadystatechange = function () {
      var i;

      if (xhr.readyState > 3) {
        for (i in me.onTrack) {
          me.onTrack[i](xhr);
        }

        if (typeof callback === 'function') {
          callback();
        }
      }
    };
    xhr.send();

    return this;
  };

  /**
   * Get the uuid
   */
  B14CC.prototype.getUUID = function () {
    var uuid = localStorage.getItem('b14cc-uuid');


    if (!uuid) {
      uuid = B14CC.generateUUID();
      localStorage.setItem('b14cc-uuid', uuid);
    }

    return uuid;
  };

  /**
   * @param {string} consent
   *   Consent name
   * @param {boolean} allow
   *   If the consent is allowed.
   *
   * @return {B14CC}
   */
  B14CC.prototype.setConsent = function (consent, allow, noTrack) {
    var consents = this.getConstents();;

    if (consent === undefined) {
      return this;
    }

    if (allow === undefined) {
      allow = true;
    }

    consents[consent] = !!allow;

    localStorage.setItem('b14cc', JSON.stringify(consents));
    window.dispatchEvent(new Event('b14cc__change'));

    if (noTrack !== true) {
      this.trackConsent();
    }

    return this;
  };

  /**
   * Get all set consents
   */
  B14CC.prototype.getConstents = function () {
    var consents;

    try {
      consents = JSON.parse(localStorage.getItem('b14cc'));
    }
    catch (e) {
      consents = null;
    }

    return consents || {};
  };

  /**
   * Check if a specific plugin has consent.
   */
  B14CC.prototype.hasConsent = function (plugin, callback) {
    var consents = this.getConstents();

    if (this.noExecute()) {
      consents[plugin] = true;
    }

    if (typeof callback === 'function') {
      this.hasCallbacks[plugin] = this.hasCallbacks[plugin] || [];
      this.hasCallbacks[plugin].push(callback);

      if (consents[plugin] === true) {
        callback(plugin);
      }
    }

    return consents[plugin] === true;
  };

  /**
   * Set the discover mode, used when setting up.
   */
  B14CC.prototype.setDiscoveryMode = function (set) {
    if (set === true) {
      localStorage.setItem('b14cc-discovery', JSON.stringify([]));
    } else {
      localStorage.removeItem('b14cc-discovery');
    }

    return this;
  };

  /**
   * Add a plugin to the discovery storage.
   */
  B14CC.prototype.addToDiscovery = function (plugin) {
    var discovery = localStorage.getItem('b14cc-discovery');

    if (discovery) {
      discovery = JSON.parse(discovery);
      if (discovery.indexOf(plugin) === -1) {
        discovery.push(plugin);
        localStorage.setItem('b14cc-discovery', JSON.stringify(discovery));
      }
    }

    return this;
  };

  /**
   * Get discovery mode.
   */
  B14CC.prototype.getDiscovery = function () {
    return localStorage.getItem('b14cc-discovery');
  };

  B14CC.prototype.types = {
    script: function (item) {
      var
        parent = item.parentElement,
        clone = item.cloneNode(true),
        // Some browsers (Firefox) don't execute inline scripts, when they are
        // reinserted into the DOM.
        // We inject a unique checker into the global window, in innerText, and
        // check for this variable when the script has been reinserted.
        // If it doesn't exist, we need to run innerText with eval.
        checker = 'checker__' + B14CC.generateUUID();

      clone.setAttribute('type', 'text/javascript');
      if (clone.hasAttribute('data-b14cc-src')) {
        clone.setAttribute('src', clone.getAttribute('data-b14cc-src'));
        clone.removeAttribute('data-b14cc-src');
        clone.removeAttribute('type');

        parent.insertBefore(clone, item);
      } else {
        clone.innerHTML = 'window["' + checker + '"] = true; ' + clone.innerHTML;
        parent.appendChild(clone);

        if (window[checker] !== true) {
          eval(clone.innerText);
        }
      }

      parent.removeChild(item);
    },
    iframe: function (item) {
      item.setAttribute('src', item.getAttribute('data-b14cc-src'));
    },
    div: function (item) {

    }
  };

  B14CC.prototype.handlers = {
    videoEmbedFieldLazy: function (item) {
      var embedAttribute = item.getAttribute('data-video-embed-field-lazy');
      embedAttribute = embedAttribute.replace(/([^-]src="[^"]*)"/, '');
      embedAttribute = embedAttribute.replace('data-b14cc-src', 'src');

      item.setAttribute('data-video-embed-field-lazy', embedAttribute);
    }
  };

  // Initialize.
  scope.b14cc = new B14CC(document);
  scope.b14cc
    .setup()
    .parse();

  if (!scope.b14cc.hideStartup()) {
    scope.b14cc.checkAndDisplaySelector();
  }

  scope.b14cc.checkAndActivate();

})(this);

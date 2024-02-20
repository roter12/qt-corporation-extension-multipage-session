import ReactDOM from 'react-dom';
import { TelInput } from './App';

var invalidNumbers = [];
var validNumbers = [];
var minTelVal = 10;
var maxTelVal = 14;
var r_enabled = false;
var r_types = { tel: false, dial: false, callto: false, ucdial: false, sip: false, skype: false };

export function parseDOM(node) {
  if (node === undefined) {
    return;
  }

  var invalidNodes = ['SCRIPT', 'STYLE', 'SELECT', 'TEXTAREA', 'CODE', 'IMG'];
  var nodeName = node.nodeName.toUpperCase();

  var nodeType = node.type;
  if (nodeType !== undefined) {
    while (nodeType.type !== undefined) {
      nodeType = nodeType.type;
    }
    nodeType = nodeType.toString().toUpperCase();
  }

  var childNodesLength = node.childNodes.length;

  if (invalidNodes.indexOf(nodeName) > -1 || node.classList?.contains('dial-message-box')) {
    return 0;
  }

  if (nodeName === 'A') {
    if (r_enabled) {
      var rTypes = Object.keys(r_types);
      rTypes.forEach(function (type) {
        if (r_types[type]) {
          if (node.protocol.match(type + ':')) {
            ReplaceNode(node);
          }
        }
      });
    }
    for (var n = 0; n < childNodesLength; n++) {
      if (node.nodeType === Node.TEXT_NODE) {
        if (
          node.parentElement.isContentEditable !== null
            ? node.parentElement.isContentEditable === false
              ? true
              : false
            : true
        ) {
          return inputDialBtn(node);
        }
      }
      parseDOM(node.childNodes[n]);
    }
    return 0;
  }

  if (nodeName === 'DIV') {
    if (node?.classList?.contains('DetectedNumber')) {
      return 0;
    }
    if (node.getAttribute('role')) {
      if (node.getAttribute('role') === 'button') {
        return inputDialBtn(node);
      }
      if (node.getAttribute('role') === 'menuitem') {
        if (node.firstChild.firstChild !== undefined) {
          for (var n = 0; n < node.firstChild.firstChild.childElementCount; n++) {
            inputDialBtn(node.firstChild.firstChild.childNodes[n]);
            if (
              node.firstChild.firstChild.childNodes[n].nextSibling !== null &&
              node.firstChild.firstChild.childNodes[n].nextSibling?.classList.contains('DetectedNumber')
            ) {
              node.firstChild.firstChild.childNodes[n].nextSibling.addEventListener('mouseup', function (ev) {
                ev.preventDefault();
              });
              node.addEventListener('mouseup', function (ev) {
                ev.preventDefault();
              });

              node.firstChild.firstChild.childNodes[n].nextSibling.addEventListener('click', function (ev) {
                ev.preventDefault();
              });
              node.addEventListener('click', function (ev) {
                ev.preventDefault();
              });
              node.firstChild.firstChild.childNodes[n].nextSibling.style.float = 'right';
            }
          }
        }
        return 0;
      }
    }
  }

  if (nodeName === 'INPUT') {
    if (nodeType === 'TEXT') {
      return inputDialBtn(node);
    } else {
      return 0;
    }
  }

  for (var n = 0; n < childNodesLength; n++) {
    parseDOM(node.childNodes[n]);
  }
  if (node.nodeType === Node.TEXT_NODE) {
    if (
      node.parentElement.isContentEditable !== null
        ? node.parentElement.isContentEditable === false
          ? true
          : false
        : true
    ) {
      return numberToLink(node);
    }
  }

  return 0;
}

function parsePhoneNumbers(node) {
  if (!node)
    //Already detected, return.
    return null;
  if (node.className == 'DetectedNumber')
    //Already detected, return.
    return null;

  populateRules();

  var rawTelNumber =
    node.nodeValue == undefined ? (node.value == undefined ? node.textContent : node.value) : node.nodeValue;

  rawTelNumber = rawTelNumber.trim();
  if (rawTelNumber == null || rawTelNumber.trim().length == 0 || rawTelNumber.replace(/[\D]*/, '').length == 0)
    return null;

  //Find strings that are known invalid:
  for (let key in invalidNumbers) {
    var badresult = rawTelNumber.match(invalidNumbers[key]);
    if (badresult) return null;
  }

  //Find strings that best match a valid phone number:
  var bestResult = null;

  for (let key in validNumbers) {
    var goodresult = rawTelNumber.match(validNumbers[key]); //Get result...

    if (goodresult)
      if (bestResult) {
        //Is it valid?
        //If we already cached the best result, compare it.
        if (goodresult.length < bestResult.length)
          if (goodresult[0].trim().length >= bestResult[0].trim().length)
            //Is it 'cleaner'?
            //Is the new result a longer string?
            bestResult = goodresult; //Keep it!
      } else {
        bestResult = goodresult; //No existing result, so grab the first.
      }
  }

  if (bestResult != null && bestResult.length > 0) {
    var partialresult = bestResult[0].match(/[^a-zA-Z]+/);

    if (partialresult != undefined) {
      var numresult = partialresult[0]
        .replace(/[\s\/\-]/g, '')
        .replace(/[^\d\(\)]{2,}/, '_')
        .split('_')[0];

      if (numresult != null && numresult.length >= minTelVal && numresult.length <= maxTelVal) {
        return bestResult;
      }
    }
  }

  return null;
}

function populateRules() {
  //Valid - cache regexs
  if (validNumbers.length == 0) {
    validNumbers[validNumbers.length] = /[\+\[]?[\s0-9]([\-\)\.\/-\]]?\s?\–?\(?[0-9\s]){8,20}?/;
    validNumbers[validNumbers.length] = /^([\+\[]?[\(\)]?[\s0-9]([\-\)\.\/-\]]?\s?\–?\(?\d){8,20})$/;
    validNumbers[validNumbers.length] =
      /(\+?[\s\-]?\d*[\s\.\-\\\/]?)?([\(\[][\d]*[\)\]])?[\s\.\-\\\/]?[\d]*[\s\.\-\\\/]?[\d]{3,4}?[\s\.\-\\\/]?[\d]+(([\s\.\-\\\/]?[\D]{1,8}?[\s\.\-\\\/]|\,)?[\d]+)?/g;
    validNumbers[validNumbers.length] = /(([\+][\d]{1,3})?([\D])?[\d]{3,5}([\D])?[\d]{3,4}([\D])?[\d]{3,4})/g; //NNNX XXX XXX
    validNumbers[validNumbers.length] = /^\d{3}\.\d{3}\.\d{4}$/; // xxx.xxx.xxxx
  }

  //Invalid - cache regexs
  if (invalidNumbers.length == 0) {
    invalidNumbers[invalidNumbers.length] = /([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})/; //MAC; Style = FF[:-]FF
    invalidNumbers[invalidNumbers.length] = /([0-9A-Fa-f]{4}[.]){2}([0-9A-Fa-f]{4})/; //MAC; Style = FFFF.FFFF.FFFF
    invalidNumbers[invalidNumbers.length] = /([0-9]{4})[\.\/\-]([0-9]{2})[.\/-]([0-9]{2})/; //DATE; Style = 2014[./-]01[./-]01
    invalidNumbers[invalidNumbers.length] = /([0-9][0-9]?[\.\/\-]){2}([0-9]{4})/; //DATE; Style = 01[./-]01[./-]2014
    invalidNumbers[invalidNumbers.length] = /([0-9]\D|[0-9]{2}\D).*[0-9]{4}.*[:]/; //DATETIME 12, 1234 12:
    invalidNumbers[invalidNumbers.length] = /([\w]{8}[-]?[\w]{4}[-]?[\w]{4}[-]?[\w]{4}[-]?[\w]{12})/; //GUID
    invalidNumbers[invalidNumbers.length] =
      /^([1-9][^\d]|[0-3]\d[^\d])[^\d]?(\D{2,14}|(\d[^\d]|[0-3]\d[^\d]))[^\d]{1}([\w]\d{1,3})/; //DATE; Style = [0]1[ \/.-]Sep[tember][ \/.-][20]14
    invalidNumbers[invalidNumbers.length] = /^([0-9]{4})[\s][\.\/\-][\s]([0-9]{2})$/; //([0-9]{4})[ ][./-][ ]([0-9]{2})[ ]/; //DATE; Style = 2014 [./-] 01
    invalidNumbers[invalidNumbers.length] = /[1-2]([0-9]{3})[\s]?[\-\:][\s]?[1-2]([0-9]{3})/; //[1-2]([0-9]{3})[\s]?[/-][\s]?[1-2]([0-9]{3})/; //DATE; Style [1-2]914[/-][1-2]014
    invalidNumbers[invalidNumbers.length] = /[1-2]([0-9]{3})[\s]?[\-\:][\s]?[1-2]([0-9]{3})/; //[1-2]([0-9]{3})[\s]?[/-][\s]?[1-2]([0-9]{3})/; //DATE; Style [1-2]914[/-][1-2]014
    invalidNumbers[invalidNumbers.length] =
      /(([1-2][0-9][0-9]|[1-9][0-9]|[0-9])[.]){3}([1-2][0-9][0-9]|[1-9][0-9]|[0-9])/; //IP;
    invalidNumbers[invalidNumbers.length] =
      /([0-2][0-9]|[0-9])[:]([0-9]{2})[\s]?[\.\/\-][\s]?([0-2][0-9]|[0-9])[:]([0-9]{2})/; //TIME; Style = [0-2]:[0-9] - [0-2]:[0-9]
    invalidNumbers[invalidNumbers.length] = '://';
    invalidNumbers[invalidNumbers.length] = /[\£\$\؋\ƒ\៛\¥\₡\₱\€\¢\₭\д\₮\₦\₩\﷼\฿\₴\л\₫]/; //CURRENCY; Style = $123123
    invalidNumbers[invalidNumbers.length] = /([0-9]{1,3}\,)+[0-9]{1,3}/; //\s[0-9]{1,3}(\,[0-9]{1,3})+/; //NUMERICS; Style = x,xxx xxx,xxx x,xxx,xxx xxx,xxx,xxx,xxx...
    // invalidNumbers[invalidNumbers.length] = /[0-9]+(\.[0-9]+)+/; //NUMERICS; xxxxxx.xxxxx
    invalidNumbers[invalidNumbers.length] = /\/[0-9]+\//; //NUMERICS; xxxxxx.xxxxx
    invalidNumbers[invalidNumbers.length] = /^([A-Za-z][0-9])/; //LETTERS; xxxxxx.xxxxx
  }
}

function ReplaceNode(node) {
  if (!node)
    //Already detected, return.
    return 0;
  if (node.className == 'DetectedNumber')
    //Already detected, return.
    return 0;

  var parnode = node.parentNode;
  if (parnode) {
    for (var n = 0; n < parnode.childNodes.length; n++) {
      if (node == parnode.childNodes[n]) {
        var nodeValue =
          node.nodeValue == undefined ? (node.value == undefined ? node.textContent : node.value) : node.nodeValue;
        var telNumber = nodeValue.trim();

        while (telNumber.charAt(telNumber.length - 1).match(/[^0-9]/))
          telNumber = telNumber.substr(0, telNumber.length - 1);

        var cleanNumber = telNumber.trim();

        //Remove first (x) number if number contains a leading +.
        if (cleanNumber.substring(0, 1) == '+') cleanNumber = cleanNumber.replace(/\([(0-9]\)/g, '');

        //Now remove all non-numeric characters
        cleanNumber = cleanNumber.replace(/[a-zA-Z]+/g, ',').replace(/[^0-9\+\,]/g, '');

        var spanNode = buildNode(telNumber, cleanNumber, true);
        parnode.replaceChild(spanNode, parnode.childNodes[n]);
        return 0;
      }
    }
  }

  return 0;
}

function buildNode(telNumber, cleanNumber, fullSize) {
  var spanNode = document.createElement('div');
  spanNode.className = 'DetectedNumber';
  ReactDOM.render(<TelInput telInput={cleanNumber} label={telNumber} />, spanNode);
  return spanNode;
}

function inputDialBtn(node) {
  if (node.attributes.DialLink && node.nextSibling != undefined && node.nextSibling.className == 'DetectedNumber')
    return;

  var result = parsePhoneNumbers(node);
  if (result) {
    nodeUpdate(result, node, false);
    node.attributes.DialLink = true;
  }
}

function nodeUpdate(resultArray, node, insertBefore = true) {
  for (var n = 0; n < resultArray.length; n++) {
    var result = resultArray[n].trim();

    if (result.length < minTelVal || result === '' || (resultArray.length > 1 ? resultArray.input === null : false)) {
      continue;
    }

    var nodeValueRaw =
      node.nodeValue === undefined ? (node.value === undefined ? node.textContent : node.value) : node.nodeValue;
    var nodeValue = resultArray.length > 1 ? resultArray.input : nodeValueRaw;

    var offset = nodeValueRaw?.indexOf(result);

    var telNumber = result.trim();

    while (telNumber.charAt(telNumber.length - 1).match(/[^0-9]/)) {
      telNumber = telNumber.substr(0, telNumber.length - 1);
    }

    var cleanNumber = telNumber.trim();

    // Remove first (x) number if the number contains a leading +.
    if (cleanNumber.substring(0, 1) === '+') {
      cleanNumber = cleanNumber.replace(/\([(0-9]\)/g, '');
    }

    // Now remove all non-numeric characters
    cleanNumber = cleanNumber.replace(/[a-zA-Z]+/g, ',').replace(/[^0-9\+\,]/g, '');

    if (
      cleanNumber.length > telNumber.replace(/[\d\s]/g, '').length &&
      cleanNumber.length >= minTelVal &&
      cleanNumber.length <= maxTelVal
    ) {
      if (insertBefore) {
        //var spanNode = buildNode(telNumber, cleanNumber, cleanNumber + offset.toString() + "_dialLink", true);
        var spanNode = buildNode(telNumber, cleanNumber, true);

        if (node.length >= telNumber.length - offset) {
          var range = node.ownerDocument.createRange();
          range.setStart(node, offset);
          try {
            range.setEnd(node, telNumber.length + offset);
          } catch (e) {
            var irir = 0;
          }

          var docfrag = range.extractContents();
          var before = range.startContainer.splitText(range.startOffset);
          var parent = before.parentNode;
          parent.insertBefore(spanNode, before);
          return;
        }
      } else {
        var spanNode = buildNode(telNumber, cleanNumber, false);

        node.parentNode.insertBefore(spanNode, node.nextSibling);
        return;
      }
    }
  }
}

function numberToLink(node) {
  var telNumCounter = -1;
  var result;
  while ((result = parsePhoneNumbers(node))) {
    if (result && (node || node.nodeValue.search(/\d/) > -1)) {
      nodeUpdate(result, node);
      node = node.nextSibling;
    }

    telNumCounter++;
    if (telNumCounter > 0) return telNumCounter; //Do another check if more are found.

    if (node && node.nextSibling != undefined) node = node.nextSibling;
  }
  return 0;
}

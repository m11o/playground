let abortController = null;

function publicKeyCredentialCreationOptions(email, customOptions = {}) {
  let defaultOptions = {
    rp: {
      name: "m11o",
      id: "localhost"
    },
    user: {
      id: new TextEncoder().encode(email),
      name: email,
      displayName: email
    },
    challenge: generateChallenge("randomChallengeString"),
    pubKeyCredParams: [
      { type: "public-key", alg: -257 },
      { type: "public-key", alg: -7 },
    ],
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      residentKey: "preferred",
      userVerification: "preferred"
    },
    timeout: 60000,
    attestation: "direct",
  };
  console.log("customOptions", customOptions)
  if (customOptions["challenge"]) {
    defaultOptions.challenge = generateChallenge(customOptions["challenge"]);
  }
  if (customOptions["rp"] && customOptions["rp"]["name"]) {
    defaultOptions.rp.name = customOptions["rp"]["name"];
  }
  if (customOptions["rp"] && customOptions["rp"]["id"]) {
    defaultOptions.rp.id = customOptions["rp"]["id"];
  }
  if (customOptions["user"] && customOptions["user"]["id"]) {
    defaultOptions.user.id = new TextEncoder().encode(customOptions["user"]["id"]);
  }
  if (customOptions["user"] && customOptions["user"]["name"]) {
    defaultOptions.user.name = customOptions["user"]["name"];
    defaultOptions.user.displayName = customOptions["user"]["name"];
  }
  // https://www.iana.org/assignments/cose/cose.xhtml#algorithms
  if (customOptions["pubKeyCredParamsAlg"]) {
    defaultOptions.pubKeyCredParams.unshift({
      type: "public-key",
      alg: parseInt(customOptions["pubKeyCredParamsAlg"])
    })
  }
  if (customOptions["timeout"]) {
    defaultOptions.timeout = parseInt(customOptions["timeout"]);
  }
  if (customOptions["attestation"]) {
    defaultOptions.attestation = customOptions["attestation"];
  }
  if (customOptions["excludeCredentials"]) {
    // TODO: IDをちゃんとdecodeする必要がありそう。要確認
    let excludeCredentials = []
    customOptions["excludeCredentials"].forEach((credential) => {
      let credentialOption = {
        type: "public-key",
        id: base64UrlToArrayBuffer(credential['id']),
      }
      if (credential["transports"]) {
        credentialOption.transports = credential["transports"].split(" ");
      }
      excludeCredentials.push(credentialOption);
    });
    defaultOptions.excludeCredentials = excludeCredentials
  }
  if (customOptions["authenticatorSelection"]) {
    defaultOptions.authenticatorSelection = customOptions["authenticatorSelection"];
  }
  return defaultOptions
}

async function register(email, options = {}) {
  handleAbort();

  if (!email) {
    console.error('email is required');
    return;
  }

  abortController = new AbortController();

  try {
    console.log(publicKeyCredentialCreationOptions(email, options))
    const credential = await navigator.credentials.create(
      {
        publicKey: publicKeyCredentialCreationOptions(email, options),
        signal: abortController.signal
      });
    console.log(credential)

    const credentialDom = document.getElementById('credential').querySelector('pre')
    credentialDom.innerText = JSON.stringify(parseAuthenticatorAttestationResponse(credential), null, 4);
  } catch (err) {
    console.error("Registration error", err);
  }
}

// base64urlをarraybufferに変換
function base64UrlToArrayBuffer(base64Url) {
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const paddedBase64 = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
  const binaryString = atob(paddedBase64);
  const uint8Array = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    uint8Array[i] = binaryString.charCodeAt(i);
  }
  return uint8Array.buffer;
}

function publicKeyCredentialRequestOptions(customOptions = {}) {
  let defaultOptions = {
    challenge: generateChallenge("randomChallengeString"),
    timeout: 60000,
    userVerification: "preferred",
  };
  if (customOptions["challenge"]) {
    defaultOptions.challenge = generateChallenge(customOptions["challenge"]);
  }
  if (customOptions["timeout"]) {
    defaultOptions.timeout = parseInt(customOptions["timeout"]);
  }
  if (customOptions["rpId"]) {
    defaultOptions.rpId = customOptions["rpId"];
  }
  if (customOptions["allowCredentials"]) {
    // TODO: transportsも追加する
    let allowCredentials = []
    customOptions["allowCredentials"].forEach((credential) => {
      allowCredentials.push({
        type: "public-key",
        id: base64UrlToArrayBuffer(credential['id']),
      });
    });
    defaultOptions.allowCredentials = allowCredentials
  }
  if (customOptions["userVerification"]) {
    // TODO: discouraged と preferred の違いを調べる。ubuntu使えばできるかな
    defaultOptions.userVerification = customOptions["userVerification"];
  }
  // TODO: extensionsについて調べる
  console.log("default options", defaultOptions)
  return defaultOptions;
}

async function login(email, options = {}) {
  handleAbort();
  abortController = new AbortController();

  if (!email) {
    console.error('email is required');
    return;
  }

  try {
    const assertion = await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions(options),
      signal: abortController.signal
    });
    console.log("assertion", assertion);

    const assertionDom = document.getElementById('assertion').querySelector('pre');
    assertionDom.innerText = JSON.stringify(parseAuthenticatorAssertionResponse(assertion), null, 4);
  } catch (err) {
    console.error("Login error", err);
  }
}

async function conditionalMediationLogin() {
  handleAbort();
  abortController = new AbortController();

  // Adjusted publicKeyCredentialRequestOptions for conditional UI
  const publicKeyCredentialRequestOptions = {
    challenge: generateChallenge("randomChallengeString"),
    timeout: 60000,
    userVerification: "preferred",
  };

  try {
    const assertion = await navigator.credentials.get({
      publicKey: publicKeyCredentialRequestOptions,
      mediation: "conditional",
      signal: abortController.signal
    });

    const assertionDom = document.getElementById('assertion').querySelector('pre');
    assertionDom.innerText = JSON.stringify(parseAuthenticatorAssertionResponse(assertion), null, 4);
  } catch (err) {
    console.error("Conditional login error", err);
  }
}

function parseAuthenticatorAssertionResponse(assertion) {
  console.log("assertion", assertion);
  const assertionJSON = publicKeyCredentialToJSON(assertion);
  assertionJSON.response.authenticatorData = parseAuthenticatorData(assertion.response.authenticatorData);
  assertionJSON.response.clientDataJSON = parseClientDataJSON(assertion.response.clientDataJSON);
  assertionJSON.response.signature = uint8ArrayToHex(arrayBufferToUint8Array(assertion.response.signature));
  return assertionJSON
}

function parseAuthenticatorAttestationResponse(attestation) {
  console.log("attestation", attestation);
  const attestationJSON = publicKeyCredentialToJSON(attestation)
  attestationJSON.clientExtensionResults = attestation.getClientExtensionResults();
  attestationJSON.response.attestationObject = decodeAttestationObject(attestation.response.attestationObject);
  attestationJSON.response.clientDataJSON = parseClientDataJSON(attestation.response.clientDataJSON);

  const authenticatorData = attestation.response.getAuthenticatorData()
  attestationJSON.response.authenticatorData = parseAuthenticatorData(authenticatorData);

  const publicKey = attestation.response.getPublicKey();
  attestationJSON.response.publicKey = arrayBufferToBase64Url(publicKey);
  attestationJSON.response.publicKeyAlgorithm = attestation.response.getPublicKeyAlgorithm();

  const transports = attestation.response.getTransports();
  attestationJSON.response.transports = transports ? transports : [];
  return attestationJSON;
}

function handleAbort() {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
}

function generateChallenge(key) {
  return Uint8Array.from(key, function(c) { return c.charCodeAt(0) });
}

function arrayBufferToBase64(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function arrayBufferToBase64Url(buffer) {
  return arrayBufferToBase64(buffer).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function arrayBufferToUint8Array(buffer) {
  return new Uint8Array(buffer);
}

function parseFlags(flags) {
  return {
    userPresent: !!(flags & 0x01),
    userVerified: !!(flags & 0x04),
    attestedCredentialDataIncluded: !!(flags & 0x40),
    extensionDataIncluded: !!(flags & 0x80),
  };
}

function parseClientDataJSON(clientDataJson) {
  const converted = arrayBufferToUint8Array(clientDataJson);
  // ArrayBufferをUTF-8文字列にデコード
  const json = new TextDecoder().decode(converted);

  // JSON文字列をパース
  return JSON.parse(json);
}

function uint8ArrayToHex(u8a) {
  return Array.from(u8a).map(byte => byte.toString(16).padStart(2, '0')).join('')
}

function parseAuthenticatorData(authenticatorData) {
  const converted = arrayBufferToUint8Array(authenticatorData);
  const rpIdHash = converted.slice(0, 32);
  const flags = parseFlags(converted[32]);
  const counter =
    (authenticatorData[33] << 24) |
    (authenticatorData[34] << 16) |
    (authenticatorData[35] << 8) |
    authenticatorData[36];
  const extensions = authenticatorData.slice(37);
  console.log("Extensions", extensions);

  return {
    rpIdHash: uint8ArrayToHex(rpIdHash),
    flags,
    counter,
    extensions: arrayBufferToBase64(extensions),
  };
}

// response.attestationObject.attStmt をparseする
function parseAttestationStatement(attStmt) {
  if (Object.keys(attStmt).length === 0) return attStmt

  console.log("decoded attStmt", attStmt);

  return {
    signature: uint8ArrayToHex(attStmt.sig),
    algorithm: attStmt.alg
  };
}

function decodeAttestationObject(attestationObject) {
  const decoded = CBOR.decode(attestationObject);
  console.log("decoded", decoded);

  const authData = parseAuthenticatorData(decoded.authData)
  console.log("authData", authData);
  const fmt = decoded.fmt;
  console.log("fmt", fmt);
  const attStmt = parseAttestationStatement(decoded.attStmt);
  console.log("attStmt", attStmt);

  return {
    authData,
    fmt,
    attStmt
  }
}

function publicKeyCredentialToJSON(credential) {
  if (credential instanceof ArrayBuffer) {
    // ArrayBufferをBase64文字列に変換
    return arrayBufferToBase64(credential);
  } else if (credential instanceof Object) {
    const obj = {};
    for (const key in credential) {
      if (typeof credential[key] === "function") continue

      if (credential[key] instanceof ArrayBuffer) {
        // ArrayBuffer型はBase64エンコード
        obj[key] = arrayBufferToBase64(credential[key]);
      } else if (credential[key] instanceof Object) {
        // 再帰的に処理
        obj[key] = publicKeyCredentialToJSON(credential[key]);
      } else {
        obj[key] = credential[key];
      }
    }
    return obj;
  }

  throw new Error("Unexpected type");
}

const {httpbis: {signMessage, verifyMessage, extractHeader}} = require('http-message-signatures');
const {createHash, createPrivateKey, createSign, createPublicKey, createVerify} = require('crypto');
const config = require('config');
const fs = require('fs');

(async () => {

    const privateKeyPem = createPrivateKey(fs.readFileSync('./private-key.pem').toString());
    const request = depositRequest();

    // prepare signed message
    const signedRequest = await signMessage({
        key: ppSigner(privateKeyPem, 'ecdsa-p256-sha256', config.get('keyId')), // prepare signer with EC private key
        name: 'sig-pp', // signature name supported by pawaPay API
        fields: ['@method', '@authority', '@path', 'signature-date', 'content-digest', 'content-type', 'content-length'], // signature base components
    }, {
        method: 'POST',
        url: config.get('baseUrl') + '/deposits',
        headers: {
            'Signature-Date': new Date().toISOString().toString(), // additional date header
            'Content-Type': 'application/json',
            'Content-Digest': `sha-512=:${sha512Digest(request)}:`, // SHA-512 body content digest
            'Content-Length': request.length.toString(),
            'Authorization': 'Bearer ' + config.get('authToken')
        },
        body: request,
    });

    // signedRequest now has the `Signature` and `Signature-Input` headers
    console.log(signedRequest);

    const response = await fetch(signedRequest.url, signedRequest);
    const body = await response.text();

    const completeResponse = {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: body
    }

    console.log(completeResponse);

    const verified = await verifyMessage({
            async keyLookup(params) {
                const publicKey = await getPublicKey(params.keyid);
                return ppVerifier(publicKey)
            },
        },
        completeResponse, null
    );

    console.log('Signature is valid = ' + verified);
    console.log('Content Digest is valid = ' + verifyDigest(completeResponse));

})().catch(console.error);

// create signer with previously generated private key
function ppSigner(privateKey, algorithm, id) {
    return {
        id: id,
        alg: algorithm,
        async sign(data) {
            return createSign('SHA256').update(data).sign(privateKey);
        }
    };
}

// create verifier with public key provided by pawaPay API
function ppVerifier(publicKey) {
    return {
        async verify(data, signature) {
            return createVerify('SHA256').update(data).verify(publicKey, signature, 'base64');
        }
    }
}

// SHA-512 digest generator
function sha512Digest(data) {
    return createHash('sha512').update(data).digest('base64');
}

// SHA-512 digest verifier
function verifyDigest(message) {
    const headerDigest = extractHeader('content-digest', new Map([['key', 'sha-512']]), message)[0].replaceAll(':', '');
    const calculatedDigest = sha512Digest(message.body);
    return headerDigest === calculatedDigest;
}

// method to fetch signature verification public key
function getPublicKey(keyId) {
    let url = new URL(config.get('baseUrl') + '/public-key/http');
    return fetch(url, {method: 'GET', headers: {'Content-Type': 'application/json'}})
        .then(response => response.json())
        .then(body => createPublicKey(body.find((element) => element.id = keyId).key));
}

// sample deposit request
function depositRequest() {
    return `{
    "depositId": "${crypto.randomUUID()}",
    "amount": "15",
    "currency": "ZMW",
    "correspondent": "MTN_MOMO_ZMB",
    "payer": {
        "type": "MSISDN",
        "address": {
            "value": "260763456789"
        }
    },
    "customerTimestamp": "${new Date().toISOString()}",
    "statementDescription": "Signed deposit"
}`
}

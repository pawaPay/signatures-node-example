const {httpbis: {signMessage, verifyMessage, extractHeader}} = require('http-message-signatures');
const {createHash, createPrivateKey, createSign, createPublicKey, createVerify} = require('crypto');

const AUTHORIZATION_TOKEN = 'Bearer !!! YOUR API TOKEN HERE !!!';
const BASE_URL = 'https://api.sandbox.pawapay.cloud';

// Sample private key. !!! Do not use in production !!!
const PRIVATE_KEY_PEM = "-----BEGIN PRIVATE KEY-----\n" +
    "MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg6xLJedSK0wwJHZ46\n" +
    "pRCDeTGfXkv1eO9n+4c9zHBgL0GgCgYIKoZIzj0DAQehRANCAAQj6hsJFcLHWrav\n" +
    "JFY6cUKLPTCQb2gmwcjG6ZcRaIeW2jMrXu1UcSAbGswrCUyFUZW0Z9yVxMlpp2Yn\n" +
    "flrCsQDn\n" +
    "-----END PRIVATE KEY-----";

// Should be added in customer panel with key id = 'CUSTOMER_TEST_KEY_ID'
const PUBLIC_KEY_PEM = "-----BEGIN PUBLIC KEY-----\n" +
    "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEI+obCRXCx1q2ryRWOnFCiz0wkG9o\n" +
    "JsHIxumXEWiHltozK17tVHEgGxrMKwlMhVGVtGfclcTJaadmJ35awrEA5w==\n" +
    "-----END PUBLIC KEY-----";

(async () => {

    const privateKeyPem = createPrivateKey(PRIVATE_KEY_PEM);
    const request = depositRequest();

    const signedRequest = await signMessage({
        key: ppSigner(privateKeyPem, 'ecdsa-p256-sha256', 'CUSTOMER_TEST_KEY_ID'),
        name: 'sig-pp',
        fields: ['@method', '@authority', '@path', 'signature-date', 'content-digest', 'content-type', 'content-length'],
    }, {
        method: 'POST',
        url: BASE_URL + '/deposits',
        headers: {
            'Signature-Date': new Date().toISOString().toString(),
            'Content-Type': 'application/json',
            'Content-Digest': `sha-512=:${sha512Digest(request)}:`,
            'Content-Length': request.length.toString(),
            'Authorization': AUTHORIZATION_TOKEN
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

function ppSigner(privateKey, algorithm, id) {
    return {
        id: id,
        alg: algorithm,
        async sign(data) {
            return createSign('SHA256').update(data).sign(privateKey);
        }
    };
}

function ppVerifier(publicKey) {
    return {
        async verify(data, signature) {
            return createVerify('SHA256').update(data).verify(publicKey, signature, 'base64');
        }
    }
}

function sha512Digest(data) {
    return createHash('sha512').update(data).digest('base64');
}

function verifyDigest(message) {
    const headerDigest = extractHeader('content-digest', new Map([['key', 'sha-512']]), message)[0].replaceAll(':', '');
    const calculatedDigest = sha512Digest(message.body);
    return headerDigest === calculatedDigest;
}

function getPublicKey(keyId) {
    let url = new URL(BASE_URL + '/public-key/http');
    return fetch(url, {method: 'GET', headers: {'Content-Type': 'application/json'}})
        .then(response => response.json())
        .then(body => createPublicKey(body.find((element) => element.id = keyId).key));
}

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
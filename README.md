## Sample code for node to use signatures with the pawaPay API

1. Generate EC P-256 private and public keys in pem format 
```
$ openssl ecparam -name P-256 -genkey -noout -out private-key.pem
$ openssl ec -in private-key.pem -pubout -out public-key.pem
```
and copy to the root folder. You can use the sample ones already there also.

2. Add the generated public key to your pawaPay account. Read how to do that from [our docs](https://pawapay.document360.io/docs/api-token#signed-requests).

3. Generate API Token in the pawaPay dashboard. Read how to do that from [our docs](https://pawapay.document360.io/docs/api-token#generating-an-api-token).
4. Update `authToken` in `config/default.json` with the API token you just generated.
5. Make sure you have http-message-signatures installed.
```
$ npm install http-message-signatures
```

6. Execute 
```
$ node signed-deposit-example.js
```
7. You will see the request and response payloads and whether signature and content digest are valid from the output.

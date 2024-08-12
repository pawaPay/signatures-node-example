## pawaPay signed request example quick start guide

1. Generate EC P-256 private and public keys in pem format 
```
$ openssl ecparam -name P-256 -genkey -noout -out private-key.pem
$ openssl ec -in private-key.pem -pubout -out public-key.pem
```
and copy to `src/test/resources`
2. Upload generated public key in the customer dashboard `System Configuration/API Tokens/Sequrity` and update `keyId` in `config/default.json` according to Key ID in dashboard.


3. Generate API Token in the customer dashboard `System Configuration/API Tokens/Create` and update `authToken` in `config/default.json`


4. Execute 
```
$ node signed-deposit-example.js`
```
import * as http from 'http';
import * as crypto from 'crypto';

const config = {
    host: process.env.APP_HOST || 'localhost',
    port: parseInt(process.env.APP_PORT || '3000'),
    path: '/v1/events-gateway',
    total: 100,
    secret: process.env.WEBHOOK_SECRET || 'my-secret-key-123',
};

const payload = (id: number) => JSON.stringify({
    eventId: `ev_${id}_${Date.now()}`,
    merchantId: 'm1',
    shippingCompanyId: 's1',
    shipmentId: `sh_${id}`,
    type: 'SHIPMENT_CREATED',
    occurredAt: new Date().toISOString(),
    payload: { test: true },
});

const sign = (body: string) => crypto.createHmac('sha256', config.secret).update(body).digest('hex');

async function run() {

    // debug single request first
    const body = payload(0);
    const signature = sign(body);

    console.log('Testing single request...');
    const singleResult = await new Promise<void>((resolve) => {
        const req = http.request({
            hostname: config.host,
            port: config.port,
            path: config.path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
                'x-signature': signature,
            },
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`Status: ${res.statusCode}`);
                console.log(`Body: ${data}`);
                resolve();
            });
        });
        req.on('error', (err) => {
            console.log(`Error: ${err.message}`);
            resolve();
        });
        req.write(body);
        req.end();
    });

    // requests concurrent
    const results = await Promise.all(
        Array.from({ length: config.total }, (_, i) => {
            const body = payload(i);
            return new Promise<boolean>((resolve) => {
                const req = http.request({
                    hostname: config.host,
                    port: config.port,
                    path: config.path,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(body),
                        'x-signature': sign(body),
                    },
                }, (res) => {
                    // log first few responses to see what status is returned
                    if (i < 3) console.log(`Request ${i} status: ${res.statusCode}`);
                    resolve(res.statusCode === 202 || res.statusCode === 409);
                });

                req.on('error', (err) => {
                    if (i < 3) console.log(`Request ${i} error: ${err.message}`);
                    resolve(false);
                });

                req.write(body);
                req.end();
            });
        })
    );

    const success = results.filter(Boolean).length;
    const fail = results.length - success;

    console.log(`Requests: ${config.total}`);
    console.log(`Success: ${success}`);
    console.log(`Fail: ${fail}`);
}

run();
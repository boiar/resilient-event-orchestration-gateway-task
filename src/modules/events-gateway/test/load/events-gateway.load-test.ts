import * as http from 'http';
import * as crypto from 'crypto';

const config = {
    host: 'localhost',
    port: 3000,
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
                }, (res) => resolve(res.statusCode === 202 || res.statusCode === 409));
                req.on('error', () => resolve(false));
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